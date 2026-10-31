import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, UserPlus, Plus, Trash2, AlertTriangle, Upload, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import joiningFormApi from './joiningForm.api';
import { uploadFile } from '../upload/upload.api';
import { Field, Section, inputCls, RELATIONS, BLOOD_GROUPS, WEEK_LABEL } from './JoiningFormModal';

const fmtRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DOCUMENTS = [
  ['candidateResume', 'Resume / Biodata'],
  ['salarySlip', 'Last Salary Slip'],
  ['experienceLetter', 'Experience Letter'],
  ['relievingLetter', 'Relieving Letter'],
  ['bankStatement', 'Bank Passbook / Statement'],
];

// One file upload box: uploads straight to S3 and keeps the URL in the form
const FileField = ({ label, value, onChange, accept = 'image/*,.pdf', disabled }) => {
  const [uploading, setUploading] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error('File must be under 10 MB');
    setUploading(true);
    try {
      onChange(await uploadFile(file, 'direct-joining'));
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  return (
    <Field label={label}>
      {value ? (
        <div className="flex items-center gap-2 h-[38px]">
          <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"><FileText size={14} /> View</a>
          {!disabled && <button type="button" onClick={() => onChange('')} className="text-xs text-red-600 hover:underline">Remove</button>}
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-1.5 h-[38px] border border-dashed rounded-lg text-xs font-semibold ${disabled ? 'text-gray-300 border-gray-200' : 'text-gray-500 border-gray-300 hover:border-indigo-400 hover:text-indigo-600 cursor-pointer'}`}>
          {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading...</> : <><Upload size={14} /> Upload</>}
          <input type="file" accept={accept} onChange={pick} disabled={disabled || uploading} className="hidden" />
        </label>
      )}
    </Field>
  );
};

/**
 * Direct Joining Form — for employees who cannot fill a form themselves: management enters
 * everything (job, salary, personal, bank, PF/ESIC, previous job, documents) in one go.
 * Submit sends it to Joining → Ready to Join; HR then completes the joining there.
 * applicationId: null = new form, otherwise edit (read-only once joining is completed).
 */
const DirectJoiningFormModal = ({ applicationId, onClose, onDone }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState(null); // { values, options, form }
  const [v, setV] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await joiningFormApi.directGet(applicationId || 'new');
        setPayload(res);
        setV({ ...res.values, nominees: res.values.nominees || [] });
      } catch (err) {
        toast.error(err.message || 'Failed to load form');
        onClose();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const readOnly = !!payload?.form && payload.form.stage !== 'Verified';
  const o = payload?.options;

  const set = (k) => (e) => {
    const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setV((prev) => {
      const next = { ...prev, [k]: val };
      if (k === 'sameAsPresent' && val) next.permanentAddress = prev.presentAddress;
      if (k === 'presentAddress' && prev.sameAsPresent) next.permanentAddress = val;
      if (k === 'designationId') {
        const desg = o.designations.find((d) => String(d.id) === String(val));
        if (desg?.departmentId) next.departmentId = desg.departmentId;
      }
      // Same defaults as the joining form: PF up to ₹15,000 basic, ESIC up to ₹21,000 gross
      if (k === 'offeredBaseSalary' || k === 'offeredAllowanceSalary') {
        const base = Number(next.offeredBaseSalary) || 0;
        const gross = base + (Number(next.offeredAllowanceSalary) || 0);
        if (base > 0) next.pfApplicable = base <= 15000;
        if (gross > 0) next.esicApplicable = gross <= 21000;
      }
      return next;
    });
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const designations = useMemo(() => {
    if (!o) return [];
    return v?.departmentId ? o.designations.filter((d) => !d.departmentId || String(d.departmentId) === String(v.departmentId)) : o.designations;
  }, [o, v?.departmentId]);

  const setNominee = (i, k, val) => setV((p) => ({ ...p, nominees: p.nominees.map((n, idx) => (idx === i ? { ...n, [k]: val } : n)) }));
  const addNominee = () => setV((p) => ({ ...p, nominees: [...(p.nominees || []), { name: '', relation: '', dob: '', share: p.nominees?.length ? '' : 100 }] }));
  const removeNominee = (i) => setV((p) => ({ ...p, nominees: p.nominees.filter((_, idx) => idx !== i) }));

  const submit = async () => {
    setBusy(true);
    try {
      if (applicationId) {
        await joiningFormApi.directUpdate(applicationId, v);
        toast.success('Direct joining form updated');
      } else {
        const res = await joiningFormApi.directCreate(v);
        toast.success(`Submitted (${res?.data?.applicationNumber}) — HR will complete the joining`);
      }
      onDone?.();
      onClose();
    } catch (err) {
      const fe = err?.body?.errors;
      if (fe) {
        setErrors(fe);
        toast.error(`${Object.keys(fe).length} field(s) need attention`);
        setTimeout(() => document.querySelector('[data-direct-joining] .border-red-400')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      } else {
        toast.error(err?.message || 'Something went wrong');
      }
    } finally {
      setBusy(false);
    }
  };

  const gross = (Number(v?.offeredBaseSalary) || 0) + (Number(v?.offeredAllowanceSalary) || 0);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-gray-900/60 backdrop-blur-sm">
      <div data-direct-joining className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-100 flex flex-col max-h-[94vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserPlus size={18} /> Direct Joining Form
              {payload?.form && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${readOnly ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {readOnly ? 'Joined' : 'Pending with HR'}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {payload?.form
                ? `${payload.form.applicationNumber} · filled by ${payload.form.createdBy || '—'}`
                : 'Fill the details on behalf of the new employee. HR will verify and complete the joining.'}
            </p>
          </div>
          <button onClick={onClose} disabled={busy} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>

        {loading || !v ? (
          <div className="p-16 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
          <fieldset disabled={readOnly} className="p-6 space-y-6 min-w-0 border-0 m-0">
            {Object.keys(errors).filter((k) => errors[k]).length > 0 && (
              <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" /> Please fix the highlighted fields.
              </div>
            )}
            {readOnly && (
              <div className="flex gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-800">
                Joining is completed. HR can edit the employee from Joining → Onboarded.
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-28 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {v.candidatePhoto ? <img src={v.candidatePhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">No photo</span>}
                </div>
                <div className="w-28"><FileField label="Photo" value={v.candidatePhoto} onChange={set('candidatePhoto')} accept="image/*" disabled={readOnly} /></div>
              </div>
              <div className="flex-1">
                <Section title="A. Job & Salary">
                  <Field label="Company" required error={errors.branchId}>
                    <select value={v.branchId ?? ''} onChange={set('branchId')} className={inputCls(errors.branchId)}>
                      <option value="">Select company</option>
                      {o.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Department" required error={errors.departmentId}>
                    <select value={v.departmentId ?? ''} onChange={set('departmentId')} className={inputCls(errors.departmentId)}>
                      <option value="">Select department</option>
                      {o.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Designation" required error={errors.designationId}>
                    <select value={v.designationId ?? ''} onChange={set('designationId')} className={inputCls(errors.designationId)}>
                      <option value="">Select designation</option>
                      {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Joining Date" required error={errors.joiningDate}>
                    <input type="date" value={v.joiningDate} onChange={set('joiningDate')} className={inputCls(errors.joiningDate)} />
                  </Field>
                  <Field label="Employee Code (auto)">
                    <div className="h-[38px] flex items-center gap-2 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                      <span className="font-mono font-semibold">{v.employeeCode}</span>
                      {!readOnly && <span className="text-[11px] text-gray-400">next number · given on joining</span>}
                    </div>
                  </Field>
                  <Field label="Shift">
                    <select value={v.shiftId ?? ''} onChange={set('shiftId')} className={inputCls()}>
                      <option value="">Not assigned</option>
                      {o.shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                    </select>
                  </Field>
                  <Field label="Basic + DA (monthly)" required error={errors.offeredBaseSalary}>
                    <input type="number" min="0" value={v.offeredBaseSalary} onChange={set('offeredBaseSalary')} className={inputCls(errors.offeredBaseSalary)} />
                  </Field>
                  <Field label="Allowance (monthly)">
                    <input type="number" min="0" value={v.offeredAllowanceSalary} onChange={set('offeredAllowanceSalary')} className={inputCls()} />
                  </Field>
                  <Field label="Gross Monthly">
                    <div className="h-[38px] flex items-center px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm font-semibold">{fmtRupees(gross)}</div>
                  </Field>
                  <Field label="Weekly Off">
                    <select value={v.weeklyOffDay} onChange={set('weeklyOffDay')} className={inputCls(errors.weeklyOffDay)}>
                      {o.weekDays.map((d) => <option key={d} value={d}>{WEEK_LABEL[d] || d}</option>)}
                    </select>
                  </Field>
                  <Field label="Pay Mode">
                    <select value={v.payMode} onChange={set('payMode')} className={inputCls()}>
                      <option value="BANK">BANK</option>
                      <option value="CASH">CASH</option>
                    </select>
                  </Field>
                  <Field label="Remark">
                    <input value={v.joiningRemark} onChange={set('joiningRemark')} className={inputCls()} placeholder="Onboarding notes" />
                  </Field>
                </Section>
              </div>
            </div>

            <Section title="B. Personal Details">
              <Field label="Title">
                <select value={v.title} onChange={set('title')} className={inputCls()}>
                  <option value="">—</option>
                  {['Mr.', 'Ms.', 'Mrs.'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Full Name" required error={errors.candidateName}>
                <input value={v.candidateName} onChange={set('candidateName')} className={inputCls(errors.candidateName)} />
              </Field>
              <Field label="Father's Name" required error={errors.fatherName}>
                <input value={v.fatherName} onChange={set('fatherName')} className={inputCls(errors.fatherName)} />
              </Field>
              <Field label="Date of Birth" required error={errors.dob}>
                <input type="date" value={v.dob} onChange={set('dob')} className={inputCls(errors.dob)} />
              </Field>
              <Field label="Gender" required error={errors.gender}>
                <select value={v.gender} onChange={set('gender')} className={inputCls(errors.gender)}>
                  <option value="">Select</option>
                  {['Male', 'Female', 'Other'].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Marital Status">
                <select value={v.maritalStatus} onChange={set('maritalStatus')} className={inputCls()}>
                  <option value="">Select</option>
                  {['Single', 'Married', 'Divorced', 'Widowed'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Blood Group">
                <select value={v.bloodGroup} onChange={set('bloodGroup')} className={inputCls()}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Qualification" className="lg:col-span-2">
                <input value={v.qualification} onChange={set('qualification')} className={inputCls()} placeholder="e.g. 12th, ITI Fitter, B.Com" />
              </Field>
            </Section>

            <Section title="C. Contact & Address">
              <Field label="Mobile" required error={errors.candidatePhone}>
                <input value={v.candidatePhone} onChange={set('candidatePhone')} maxLength={10} className={inputCls(errors.candidatePhone)} />
              </Field>
              <Field label="Alternate / Family Mobile" error={errors.alternateMobile}>
                <input value={v.alternateMobile} onChange={set('alternateMobile')} maxLength={10} className={inputCls(errors.alternateMobile)} />
              </Field>
              <Field label="Email" error={errors.candidateEmail}>
                <input value={v.candidateEmail} onChange={set('candidateEmail')} className={inputCls(errors.candidateEmail)} />
              </Field>
              <Field label="Present Address" required error={errors.presentAddress} className="sm:col-span-2 lg:col-span-3">
                <textarea rows={2} value={v.presentAddress} onChange={set('presentAddress')} className={inputCls(errors.presentAddress)} />
              </Field>
              <Field label="Permanent Address" className="sm:col-span-2 lg:col-span-3">
                <label className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                  <input type="checkbox" checked={!!v.sameAsPresent} onChange={set('sameAsPresent')} /> Same as present address
                </label>
                <textarea rows={2} value={v.permanentAddress} onChange={set('permanentAddress')} disabled={!!v.sameAsPresent} className={`${inputCls()} disabled:bg-gray-50`} />
              </Field>
            </Section>

            <Section title="D. Identity Documents">
              <Field label="Aadhaar No." required error={errors.aadharNo}>
                <input value={v.aadharNo} onChange={set('aadharNo')} maxLength={14} className={`${inputCls(errors.aadharNo)} font-mono`} />
              </Field>
              <Field label="PAN No." error={errors.panNo}>
                <input value={v.panNo} onChange={(e) => set('panNo')(e.target.value.toUpperCase())} maxLength={10} className={`${inputCls(errors.panNo)} font-mono`} />
              </Field>
              <Field label="Voter ID">
                <input value={v.voterIdNo} onChange={set('voterIdNo')} className={inputCls()} />
              </Field>
              <Field label="Driving Licence">
                <input value={v.drivingLicenseNo} onChange={set('drivingLicenseNo')} className={inputCls()} />
              </Field>
              <Field label="Ration Card">
                <input value={v.rashanCardNo} onChange={set('rashanCardNo')} className={inputCls()} />
              </Field>
            </Section>

            <Section title="E. Bank Details">
              <Field label="Bank Name">
                <input value={v.bankName} onChange={set('bankName')} className={inputCls()} placeholder="e.g. State Bank of India" />
              </Field>
              <Field label="Account Number" required={v.payMode === 'BANK'} error={errors.bankAccountNo}>
                <input value={v.bankAccountNo} onChange={set('bankAccountNo')} className={`${inputCls(errors.bankAccountNo)} font-mono`} />
              </Field>
              <Field label="IFSC" required={v.payMode === 'BANK'} error={errors.ifscCode}>
                <input value={v.ifscCode} onChange={(e) => set('ifscCode')(e.target.value.toUpperCase())} maxLength={11} className={`${inputCls(errors.ifscCode)} font-mono`} />
              </Field>
            </Section>

            <Section title="F. PF / ESIC">
              <Field label="PF Applicable">
                <label className="flex items-center gap-2 h-[38px] text-sm"><input type="checkbox" checked={!!v.pfApplicable} onChange={set('pfApplicable')} /> Deduct PF</label>
              </Field>
              <Field label="Old UAN No. (if any)" error={errors.uanNumber}>
                <input value={v.uanNumber} onChange={set('uanNumber')} disabled={!v.pfApplicable} maxLength={12} className={`${inputCls(errors.uanNumber)} font-mono disabled:bg-gray-50`} />
              </Field>
              <Field label="PF Member ID">
                <input value={v.pfNumber} onChange={set('pfNumber')} disabled={!v.pfApplicable} className={`${inputCls()} font-mono disabled:bg-gray-50`} />
              </Field>
              <Field label="ESIC Applicable">
                <label className="flex items-center gap-2 h-[38px] text-sm"><input type="checkbox" checked={!!v.esicApplicable} onChange={set('esicApplicable')} /> Deduct ESIC</label>
              </Field>
              <Field label="Old ESIC / IP No. (if any)" error={errors.esicNumber}>
                <input value={v.esicNumber} onChange={set('esicNumber')} disabled={!v.esicApplicable} className={`${inputCls(errors.esicNumber)} font-mono disabled:bg-gray-50`} />
              </Field>
            </Section>

            <Section title="G. Emergency Contact">
              <Field label="Name" required error={errors.emergencyName}>
                <input value={v.emergencyName} onChange={set('emergencyName')} className={inputCls(errors.emergencyName)} />
              </Field>
              <Field label="Relation">
                <select value={v.emergencyRelation} onChange={set('emergencyRelation')} className={inputCls()}>
                  <option value="">Select</option>
                  {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Mobile" required error={errors.emergencyPhone}>
                <input value={v.emergencyPhone} onChange={set('emergencyPhone')} maxLength={10} className={inputCls(errors.emergencyPhone)} />
              </Field>
            </Section>

            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-1">
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">H. Nominee / Family (PF)</h4>
                {!readOnly && <button type="button" onClick={addNominee} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"><Plus size={13} /> Add nominee</button>}
              </div>
              {errors.nominees && <p className="text-[11px] text-red-600">{errors.nominees}</p>}
              {v.nominees.length === 0 ? (
                <p className="text-xs text-gray-400">No nominee added.</p>
              ) : (
                <div className="space-y-2">
                  {v.nominees.map((n, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-4"><input value={n.name} onChange={(e) => setNominee(i, 'name', e.target.value)} placeholder="Nominee name" className={inputCls()} /></div>
                      <div className="col-span-5 sm:col-span-3">
                        <select value={n.relation} onChange={(e) => setNominee(i, 'relation', e.target.value)} className={inputCls()}>
                          <option value="">Relation</option>
                          {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4 sm:col-span-3"><input type="date" value={n.dob} onChange={(e) => setNominee(i, 'dob', e.target.value)} className={inputCls()} /></div>
                      <div className="col-span-2 sm:col-span-1"><input type="number" min="0" max="100" value={n.share} onChange={(e) => setNominee(i, 'share', e.target.value)} placeholder="%" className={inputCls()} /></div>
                      <div className="col-span-1 text-right">{!readOnly && <button type="button" onClick={() => removeNominee(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Section title="I. Previous Employment (if any)">
              <Field label="Previous Company">
                <input value={v.previousCompany} onChange={set('previousCompany')} className={inputCls()} />
              </Field>
              <Field label="Position">
                <input value={v.previousPosition} onChange={set('previousPosition')} className={inputCls()} />
              </Field>
              <Field label="Experience">
                <input value={v.jobExperience} onChange={set('jobExperience')} className={inputCls()} placeholder="e.g. 2 years" />
              </Field>
              <Field label="Last Salary (monthly)">
                <input type="number" min="0" value={v.lastSalary} onChange={set('lastSalary')} className={inputCls()} />
              </Field>
              <Field label="Notice Period">
                <input value={v.previousCompanyNoticePeriod} onChange={set('previousCompanyNoticePeriod')} className={inputCls()} />
              </Field>
              <Field label="Last Employer Mobile" error={errors.lastEmployerMobile}>
                <input value={v.lastEmployerMobile} onChange={set('lastEmployerMobile')} maxLength={10} className={inputCls(errors.lastEmployerMobile)} />
              </Field>
              <Field label="Reason for Leaving" className="sm:col-span-2">
                <input value={v.reasonForLeaving} onChange={set('reasonForLeaving')} className={inputCls()} />
              </Field>
              <Field label="Reference By">
                <input value={v.referenceBy} onChange={set('referenceBy')} className={inputCls()} placeholder="Who referred this person" />
              </Field>
            </Section>

            <Section title="J. Documents (photo / scan)">
              {DOCUMENTS.map(([k, label]) => (
                <FileField key={k} label={label} value={v[k]} onChange={set(k)} disabled={readOnly} />
              ))}
              <Field label="Other Remarks" className="sm:col-span-2 lg:col-span-3">
                <textarea rows={2} value={v.remarks} onChange={set('remarks')} className={inputCls()} />
              </Field>
            </Section>
          </fieldset>
          </div>
        )}

        {v && (
          <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
            <div className="text-xs text-gray-500">
              {payload?.form?.updatedAt && <>Last saved {new Date(payload.form.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{payload.form.updatedBy ? ` by ${payload.form.updatedBy}` : ''}</>}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} disabled={busy} className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button onClick={submit} disabled={busy} className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white ${busy ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  <Send size={15} /> {busy ? 'Saving...' : applicationId ? 'Save Changes' : 'Submit to HR'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DirectJoiningFormModal;

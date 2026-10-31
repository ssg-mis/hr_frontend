import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, UserCheck, Plus, Trash2, Printer, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import joiningFormApi from './joiningForm.api';
import { jobApplicationApi } from '../jobApplication/jobApplication.api';
import JoiningFormPrintModal from './JoiningFormPrintModal';

export const RELATIONS = ['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const WEEK_LABEL = { SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const fmtRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const inputCls = (err) =>
  `w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${err ? 'border-red-400 bg-red-50/30' : 'border-gray-300'}`;

export const Field = ({ label, required, error, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
    {children}
    {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
  </div>
);

export const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide border-b border-indigo-100 pb-1">{title}</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
  </section>
);

/**
 * Joining Form for one application.
 * Ready to Join: Save Draft / Complete Joining (runs the existing Hired step, then applies the form).
 * Onboarded: edit + Save & Update Employee, and Print / PDF.
 */
const JoiningFormModal = ({ application, onClose, onDone }) => {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [payload, setPayload] = useState(null); // { form, values, info, options, letterhead }
  const [v, setV] = useState(null);
  const [errors, setErrors] = useState({});
  const [printing, setPrinting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await joiningFormApi.get(application.id);
      setPayload(res);
      setV({ ...res.values, nominees: res.values.nominees?.length ? res.values.nominees : [] });
      setErrors({});
    } catch (err) {
      toast.error(err.message || 'Failed to load joining form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application.id]);

  const isHired = payload?.info?.stage === 'Hired' && payload?.info?.employeeId;
  const isCompleted = payload?.form?.status === 'Completed';

  const set = (k) => (e) => {
    const val = e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setV((prev) => {
      const next = { ...prev, [k]: val };
      if (k === 'sameAsPresent' && val) next.permanentAddress = prev.presentAddress;
      if (k === 'presentAddress' && prev.sameAsPresent) next.permanentAddress = val;
      if (k === 'designationId') {
        const desg = payload.options.designations.find((d) => String(d.id) === String(val));
        if (desg?.departmentId) next.departmentId = desg.departmentId;
      }
      return next;
    });
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const designations = useMemo(() => {
    if (!payload) return [];
    const list = payload.options.designations;
    return v?.departmentId ? list.filter((d) => !d.departmentId || String(d.departmentId) === String(v.departmentId)) : list;
  }, [payload, v?.departmentId]);

  const setNominee = (i, k, val) => setV((p) => ({ ...p, nominees: p.nominees.map((n, idx) => (idx === i ? { ...n, [k]: val } : n)) }));
  const addNominee = () => setV((p) => ({ ...p, nominees: [...(p.nominees || []), { name: '', relation: '', dob: '', share: p.nominees?.length ? '' : 100 }] }));
  const removeNominee = (i) => setV((p) => ({ ...p, nominees: p.nominees.filter((_, idx) => idx !== i) }));

  const showErrors = (err) => {
    const fe = err?.body?.errors;
    if (fe) {
      setErrors(fe);
      toast.error(`${Object.keys(fe).length} field(s) need attention`);
      setTimeout(() => document.querySelector('[data-joining-form] .border-red-400')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } else {
      toast.error(err?.message || 'Something went wrong');
    }
  };

  const saveDraft = async () => {
    setBusy('draft');
    try {
      await joiningFormApi.save(application.id, v, false);
      toast.success('Draft saved');
      await load();
    } catch (err) {
      showErrors(err);
    } finally {
      setBusy('');
    }
  };

  // New joiner: validate -> existing Hired step (creates employee) -> apply form.
  // Already hired: validate -> apply form.
  const complete = async () => {
    setBusy('complete');
    try {
      await joiningFormApi.save(application.id, v, true);
      if (!isHired) {
        await jobApplicationApi.updateStage(application.applicationNumber, {
          stage: 'Hired',
          joiningDate: v.joiningDate,
          joiningRemark: v.joiningRemark || null,
        });
      }
      const res = await joiningFormApi.complete(application.id, v);
      toast.success(isHired ? 'Employee details updated' : `Joining completed — employee code ${res?.data?.employeeCode}`);
      await load();
      onDone?.();
    } catch (err) {
      showErrors(err);
    } finally {
      setBusy('');
    }
  };

  const o = payload?.options;
  const info = payload?.info;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 bg-gray-900/60 backdrop-blur-sm">
      <div data-joining-form className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-100 flex flex-col max-h-[94vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCheck size={18} /> Joining Form
              {payload?.form && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isCompleted ? 'Completed' : 'Draft'}
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{application.candidateName} · {application.applicationNumber}</p>
          </div>
          <button onClick={onClose} disabled={!!busy} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>

        {loading || !v ? (
          <div className="p-16 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {Object.keys(errors).filter((k) => errors[k]).length > 0 && (
              <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" /> Please fix the highlighted fields.
              </div>
            )}
            {isHired && !isCompleted && (
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> This employee was onboarded without a joining form. Fill it and click <b>Save &amp; Update Employee</b>.
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
              <div className="shrink-0 flex flex-col items-center gap-2">
                <div className="w-28 h-32 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {v.candidatePhoto ? <img src={v.candidatePhoto} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">No photo</span>}
                </div>
                <span className="text-[11px] text-gray-400">From application</span>
              </div>
              <div className="flex-1">
                <Section title="A. Job Details">
                  <Field label="Employee Code (auto)">
                    <div className="h-[38px] flex items-center gap-2 px-3 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                      <span className="font-mono font-semibold">{v.employeeCode}</span>
                      {!isCompleted && <span className="text-[11px] text-gray-400">next number · given on Complete Joining</span>}
                    </div>
                  </Field>
                  <Field label="Joining Date" required error={errors.joiningDate}>
                    <input type="date" value={v.joiningDate} onChange={set('joiningDate')} className={inputCls(errors.joiningDate)} />
                  </Field>
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
                  <Field label="Shift">
                    <select value={v.shiftId ?? ''} onChange={set('shiftId')} className={inputCls()}>
                      <option value="">Not assigned</option>
                      {o.shifts.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
                    </select>
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
              <Field label="UAN No." error={errors.uanNumber}>
                <input value={v.uanNumber} onChange={set('uanNumber')} disabled={!v.pfApplicable} maxLength={12} className={`${inputCls(errors.uanNumber)} font-mono disabled:bg-gray-50`} />
              </Field>
              <Field label="PF Member ID">
                <input value={v.pfNumber} onChange={set('pfNumber')} disabled={!v.pfApplicable} className={`${inputCls()} font-mono disabled:bg-gray-50`} />
              </Field>
              <Field label="ESIC Applicable">
                <label className="flex items-center gap-2 h-[38px] text-sm"><input type="checkbox" checked={!!v.esicApplicable} onChange={set('esicApplicable')} /> Deduct ESIC</label>
              </Field>
              <Field label="ESIC / IP No." error={errors.esicNumber}>
                <input value={v.esicNumber} onChange={set('esicNumber')} disabled={!v.esicApplicable} className={`${inputCls(errors.esicNumber)} font-mono disabled:bg-gray-50`} />
              </Field>
            </Section>

            <section className="space-y-3">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide border-b border-indigo-100 pb-1">G. Salary (from offer · read-only)</h4>
              <div className="flex flex-wrap gap-3 text-sm">
                {[['Basic + DA', info.salary.base], ['Allowance', info.salary.allowance], ['Gross Monthly', info.salary.gross]].map(([l, n]) => (
                  <div key={l} className="px-4 py-2 rounded-lg bg-gray-50 border border-gray-200"><span className="text-gray-500 text-xs">{l}</span><div className="font-semibold">{fmtRupees(n)}</div></div>
                ))}
              </div>
            </section>

            <Section title="H. Emergency Contact">
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
                <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide">I. Nominee / Family (PF)</h4>
                <button onClick={addNominee} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"><Plus size={13} /> Add nominee</button>
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
                      <div className="col-span-1 text-right"><button onClick={() => removeNominee(i)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button></div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wide border-b border-indigo-100 pb-1">J. Previous Employment (from application · read-only)</h4>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                {[['Company', info.previous.company], ['Position', info.previous.position], ['Experience', info.previous.experience], ['Last Salary', info.previous.lastSalary], ['Reason for Leaving', info.previous.reasonForLeaving]].map(([l, val]) => (
                  <div key={l}><div className="text-xs text-gray-500">{l}</div><div className="text-gray-800">{val || '—'}</div></div>
                ))}
              </div>
            </section>
          </div>
        )}

        {v && (
          <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 shrink-0">
            <div className="text-xs text-gray-500">
              {payload?.form?.updatedAt && <>Last saved {new Date(payload.form.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{payload.form.updatedBy ? ` by ${payload.form.updatedBy}` : ''}</>}
            </div>
            <div className="flex flex-wrap gap-2">
              {isCompleted && (
                <button onClick={() => setPrinting(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
                  <Printer size={15} /> Print / PDF
                </button>
              )}
              {!isCompleted && (
                <button onClick={saveDraft} disabled={!!busy} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-xl text-sm font-semibold text-gray-700">
                  <Save size={15} /> {busy === 'draft' ? 'Saving...' : 'Save Draft'}
                </button>
              )}
              <button onClick={complete} disabled={!!busy} className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white ${busy ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <CheckCircle2 size={15} /> {busy === 'complete' ? 'Saving...' : isHired ? 'Save & Update Employee' : 'Complete Joining'}
              </button>
            </div>
          </div>
        )}
      </div>

      {printing && payload && (
        <JoiningFormPrintModal
          applicationId={application.id}
          values={v}
          info={info}
          options={o}
          letterhead={payload.letterhead}
          savedPdf={payload.form}
          onClose={() => { setPrinting(false); load(); }}
        />
      )}
    </div>,
    document.body
  );
};

export default JoiningFormModal;

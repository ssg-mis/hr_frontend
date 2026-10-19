import React, { useEffect, useMemo, useState } from 'react';
import { Save, Upload, Trash2, RotateCcw, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import offerLetterApi from './offerLetter.api';
import OfferLetterDocument from './OfferLetterDocument';
import { buildSnapshot } from './offerLetter.utils';
import { uploadFile } from '../upload/upload.api';

const FIELDS = [
  'companyName', 'companyAddress', 'contactLine', 'logoUrl', 'letterheadUrl', 'footerText',
  'signatoryName', 'signatoryDesignation', 'signatureUrl',
  'probationMonths', 'noticeDays', 'validityDays', 'termsEn', 'termsHi',
  'offerTitleEn', 'offerTitleHi', 'offerSubjectEn', 'offerSubjectHi', 'offerIntroEn', 'offerIntroHi',
  'offerJoinLineEn', 'offerJoinLineHi', 'offerAllowanceLabelEn', 'offerAllowanceLabelHi', 'offerPfLabelEn', 'offerPfLabelHi',
  'offerClosingEn', 'offerClosingHi', 'offerAcceptanceEn', 'offerAcceptanceHi', 'pfPercent', 'pfCap', 'showPf',
  'joiningDeclarationEn', 'joiningDeclarationHi',
];
const PLACEHOLDERS = ['{name}', '{designation}', '{department}', '{company}', '{company_address}', '{joining_date}', '{validity_date}', '{probation}', '{notice}', '{pf_percent}'];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f, '']));
const toForm = (src) => Object.fromEntries(FIELDS.map((f) => [f, typeof src?.[f] === 'boolean' ? String(src[f]) : src?.[f] ?? '']));

const inputCls = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

/** Master Data → Offer Letter: letterhead, signatory and terms, with optional per-company overrides. */
const OfferLetterSettings = () => {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [defaults, setDefaults] = useState({});
  const [scope, setScope] = useState('default'); // 'default' | branch id (string)
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  const isDefault = scope === 'default';
  const rowFor = (sc) => rows.find((r) => r.scopeKey === (sc === 'default' ? 'default' : `branch:${sc}`));
  const defaultRow = rowFor('default');

  // What a company override inherits when a field is left empty.
  const inherited = useMemo(() => {
    const out = { ...defaults };
    if (defaultRow) for (const f of FIELDS) if (defaultRow[f] !== null && defaultRow[f] !== '') out[f] = defaultRow[f];
    return out;
  }, [defaults, defaultRow]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await offerLetterApi.getSettings();
      setRows(res.rows || []);
      setBranches(res.branches || []);
      setDefaults(res.defaults || {});
    } catch (err) {
      toast.error(err.message || 'Failed to load offer letter settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Default scope starts from saved values (or built-in defaults); an override starts from its own values only.
  useEffect(() => {
    if (loading) return;
    const row = rowFor(scope);
    if (isDefault) setForm(toForm(row ? { ...defaults, ...Object.fromEntries(Object.entries(row).filter(([, v]) => v !== null && v !== '')) } : defaults));
    else setForm(toForm(row));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, rows, loading]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleUpload = async (field, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG / JPG)');
      return;
    }
    setUploading(field);
    try {
      const url = await uploadFile(file, 'offer-letter');
      setForm((f) => ({ ...f, [field]: url }));
      toast.success('Image uploaded — click Save to apply');
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await offerLetterApi.saveSettings({ ...form, branchId: isDefault ? null : Number(scope) });
      toast.success('Offer letter settings saved');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOverride = async () => {
    if (!window.confirm('Remove this company\'s override? It will use the default settings.')) return;
    try {
      await offerLetterApi.removeBranchOverride(Number(scope));
      toast.success('Override removed');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to remove override');
    }
  };

  const ph = (field) => (isDefault ? undefined : (inherited[field] ? `Default: ${String(inherited[field]).split('\n')[0]}` : 'Default (empty)'));

  const ImageField = ({ field, label, hint }) => {
    const shown = form[field] || (!isDefault ? inherited[field] : '');
    return (
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
        <div className="flex items-center gap-3">
          <div className="w-40 h-16 border border-dashed border-slate-300 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
            {shown ? <img src={shown} alt="" className={`max-h-full max-w-full object-contain ${!form[field] ? 'opacity-40' : ''}`} /> : <span className="text-xs text-slate-400">None</span>}
          </div>
          <label className={`inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50 ${uploading === field ? 'opacity-60' : ''}`}>
            <Upload size={14} /> {uploading === field ? 'Uploading...' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" disabled={!!uploading} onChange={(e) => { handleUpload(field, e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {form[field] && (
            <button onClick={() => setForm((f) => ({ ...f, [field]: '' }))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remove">
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    );
  };

  // ---------- UI helpers ----------
  const [tab, setTab] = useState('offer'); // 'letterhead' | 'offer' | 'joining'
  const [lang, setLang] = useState('En');   // template language being edited
  const [showHelp, setShowHelp] = useState(false); // explanation of {name}-style words, closed by default

  // Value of a text field in the language being edited (template fields end in En/Hi)
  const Text = ({ field, label, rows = 1, hint, bilingual = true }) => {
    const f = bilingual ? field + lang : field;
    return (
      <div key={f}>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-semibold text-slate-700">{label}</label>
          {isDefault && defaults[f] !== undefined && (
            <button onClick={() => setForm((x) => ({ ...x, [f]: defaults[f] ?? '' }))} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline" title="Put back the standard text">
              <RotateCcw size={12} /> Restore
            </button>
          )}
        </div>
        {rows > 1
          ? <textarea rows={rows} value={form[f]} onChange={set(f)} placeholder={ph(f)} className={`${inputCls} leading-relaxed`} />
          : <input value={form[f]} onChange={set(f)} placeholder={ph(f)} className={inputCls} />}
        {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
      </div>
    );
  };

  const Card = ({ title, desc, children }) => (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
      <div>
        <div className="text-sm font-bold text-slate-800">{title}</div>
        {desc && <div className="text-xs text-slate-500">{desc}</div>}
      </div>
      {children}
    </div>
  );

  const PLACEHOLDER_HELP = [
    ['{name}', 'Candidate name'], ['{designation}', 'Post / designation'], ['{department}', 'Department'],
    ['{company}', 'Company name'], ['{company_address}', 'Company address'], ['{joining_date}', 'Joining date'],
    ['{validity_date}', 'Offer valid till'], ['{probation}', 'Probation months'], ['{notice}', 'Notice days'], ['{pf_percent}', 'PF %'],
  ];
  const copy = (t) => { navigator.clipboard?.writeText(t); toast.success(`Copied ${t}`); };

  // Live preview: what the letter looks like with a sample candidate and the values on screen.
  const preview = useMemo(() => {
    const eff = { ...inherited };
    for (const f of FIELDS) {
      const v = form[f];
      if (v === '' || v === null || v === undefined) continue;
      eff[f] = f === 'showPf' ? v === 'true' : v;
    }
    const b = branches.find((x) => String(x.id) === String(scope)) || branches[0] || {};
    const application = {
      candidateName: 'RAHUL SHARMA', offeredDesignation: 'Shift Engineer', departmentName: 'E&I',
      offeredBaseSalary: 15000, offeredAllowanceSalary: 17200, offeredJoiningDate: new Date(Date.now() + 7 * 864e5).toISOString(),
      branchName: b.name || '', branchAddress: b.address || '', applicationNumber: 'APP-SAMPLE',
    };
    const details = { title: 'Mr.', relation: 'S/O', fatherName: 'SURESH SHARMA', address: 'Village – Banari, Naila\nDist.- Janjgir-Champa (C.G.)', pin: '495668' };
    return buildSnapshot({ application, settings: eff, nextRefNo: 'OL/2026/APP-SAMPLE' }, lang === 'Hi' ? 'hi' : 'en', details);
  }, [form, inherited, branches, scope, lang]);

  if (loading) return <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">Loading...</div>;

  const TABS = [['letterhead', '🏢 Letterhead', 'Used by all documents'], ['offer', '📄 Offer Letter', 'Wording, salary table, terms'], ['joining', '🧾 Joining Form', 'Declaration text']];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      {/* Header: what this is + which company + save */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Letters & Documents</h2>
          <p className="text-xs text-slate-500">Set the letterhead once, then the wording of each document. Candidate details and salary are filled in automatically.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-0.5">Settings for</div>
            <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${inputCls} w-auto`}>
              <option value="default">All companies (default)</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}{rowFor(String(b.id)) ? ' — has own settings' : ''}</option>
              ))}
            </select>
          </div>
          {!isDefault && rowFor(scope) && (
            <button onClick={handleRemoveOverride} className="self-end px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm">Use default instead</button>
          )}
          <button onClick={handleSave} disabled={saving} className={`self-end inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold ${saving ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {!isDefault && (
        <div className="flex gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
          <Info size={14} className="shrink-0 mt-0.5" />
          You are editing settings for one company only. Fill just what is different — empty fields use the default (shown in grey).
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map(([k, label, sub]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-left px-4 py-2 rounded-xl border ${tab === k ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <div className="text-sm font-semibold">{label}</div>
            <div className={`text-[11px] ${tab === k ? 'text-indigo-100' : 'text-slate-500'}`}>{sub}</div>
          </button>
        ))}
        {tab !== 'letterhead' && (
          <div className="ml-auto self-center flex items-center gap-2">
            <span className="text-xs text-slate-500">Editing language:</span>
            {[['En', 'English'], ['Hi', 'हिंदी']].map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${lang === k ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>{l}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
        {/* Left: form */}
        <div className="space-y-4">
          {tab === 'letterhead' && (
            <>
              <Card title="Company details" desc="Leave empty to use the company (branch) name and address of the vacancy automatically.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Text({ field: 'companyName', label: 'Company name', bilingual: false })}
                  {Text({ field: 'contactLine', label: 'Contact line (phone · email · website)', bilingual: false })}
                </div>
                {Text({ field: 'companyAddress', label: 'Company address', rows: 2, bilingual: false })}
              </Card>
              <Card title="Logo & letterhead" desc="Upload either a logo (shown with the company name) or a full letterhead image (replaces the whole header).">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ImageField field="logoUrl" label="Logo" />
                  <ImageField field="letterheadUrl" label="Full letterhead image (optional)" hint="Wide image, ~2000×300." />
                </div>
              </Card>
              <Card title="Footer (optional)" desc="Small text at the bottom, e.g. CIN / GSTIN / registered office.">
                {Text({ field: 'footerText', label: 'Footer text', bilingual: false })}
              </Card>
            </>
          )}

          {tab === 'offer' && (
            <>
              <div className="text-xs">
                <button onClick={() => setShowHelp((v) => !v)} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                  <Info size={13} /> {showHelp ? 'Hide' : 'What are words like {name} in the text?'}
                </button>
              </div>
              {showHelp && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <div className="mb-1">These are replaced with each candidate's real details when the letter is made. Only needed if you change the wording — click one to copy it:</div>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDER_HELP.map(([p, m]) => (
                    <button key={p} onClick={() => copy(p)} className="px-2 py-0.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100" title={`Replaced by: ${m}`}>
                      <code>{p}</code> <span className="text-slate-500">= {m}</span>
                    </button>
                  ))}
                </div>
              </div>
              )}
              <Card title="1. Who signs" desc="Printed under “Yours Faithfully”.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Text({ field: 'signatoryName', label: 'Signatory name', bilingual: false })}
                  {Text({ field: 'signatoryDesignation', label: 'Signatory designation', bilingual: false })}
                </div>
                <ImageField field="signatureUrl" label="Signature image (optional)" hint="Transparent PNG works best." />
              </Card>
              <Card title="2. Letter wording" desc="Top part of the letter.">
                {Text({ field: 'offerTitle', label: 'Title' })}
                {Text({ field: 'offerSubject', label: 'Subject' })}
                {Text({ field: 'offerIntro', label: 'Intro paragraph', rows: 4 })}
              </Card>
              <Card title="3. Salary table" desc="Basic and Allowance come from the offer. PF = PF % × Basic (up to the cap). Total = Basic + Allowance + PF.">
                {Text({ field: 'offerAllowanceLabel', label: 'Allowance row name' })}
                {Text({ field: 'offerPfLabel', label: 'PF row name' })}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Show PF row</label>
                    <select value={form.showPf} onChange={set('showPf')} className={inputCls}>
                      {!isDefault && <option value="">Use default</option>}
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">PF %</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.pfPercent} onChange={set('pfPercent')} placeholder={ph('pfPercent')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">PF wage cap (₹)</label>
                    <input type="number" min="0" value={form.pfCap} onChange={set('pfCap')} placeholder={ph('pfCap') || 'blank = no cap'} className={inputCls} />
                  </div>
                </div>
              </Card>
              <Card title="4. Terms & conditions" desc="One point per line. The joining line is printed first, above the points.">
                {Text({ field: 'offerJoinLine', label: 'Joining line', rows: 2 })}
                {Text({ field: 'terms', label: 'Terms (one per line)', rows: 10 })}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Probation (months)</label>
                    <input type="number" min="0" value={form.probationMonths} onChange={set('probationMonths')} placeholder={ph('probationMonths')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Notice (days)</label>
                    <input type="number" min="0" value={form.noticeDays} onChange={set('noticeDays')} placeholder={ph('noticeDays')} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Offer valid for (days)</label>
                    <input type="number" min="0" value={form.validityDays} onChange={set('validityDays')} placeholder={ph('validityDays')} className={inputCls} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">Only needed if you use {'{probation}'}, {'{notice}'} or {'{validity_date}'} in the text.</p>
              </Card>
              <Card title="5. Closing & candidate acceptance" desc="Bottom part of the letter. One line per row.">
                {Text({ field: 'offerClosing', label: 'Closing', rows: 2 })}
                {Text({ field: 'offerAcceptance', label: 'Candidate acceptance points', rows: 3 })}
              </Card>
            </>
          )}

          {tab === 'joining' && (
            <Card title="Declaration" desc="Printed on the Joining Form PDF above the Employee / HR / HOD signatures.">
              {Text({ field: 'joiningDeclaration', label: 'Declaration text', rows: 5 })}
            </Card>
          )}
        </div>

        {/* Right: live preview */}
        <div className="xl:sticky xl:top-4 self-start">
          <div className="text-xs font-semibold text-slate-500 mb-2">Live preview {tab === 'joining' ? '(declaration)' : '(sample candidate)'} — updates as you type</div>
          {tab === 'joining' ? (
            <div className="border border-slate-200 rounded-xl p-4 text-sm text-slate-700 bg-slate-50">
              <div className="font-bold mb-1">{lang === 'Hi' ? 'घोषणा' : 'Declaration'}</div>
              <p className="text-justify">{form[`joiningDeclaration${lang}`] || inherited[`joiningDeclaration${lang}`]}</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-auto bg-slate-100 p-2 max-h-[80vh]">
              <div style={{ zoom: 0.5, width: 794 }} className="mx-auto shadow">
                <OfferLetterDocument snapshot={preview} />
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400 mt-2">Remember to click <b>Save</b>.</p>
        </div>
      </div>
    </div>
  );
};

export default OfferLetterSettings;

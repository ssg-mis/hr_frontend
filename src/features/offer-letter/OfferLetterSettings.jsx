import React, { useEffect, useMemo, useState } from 'react';
import { Save, Upload, Trash2, RotateCcw, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import offerLetterApi from './offerLetter.api';
import { uploadFile } from '../upload/upload.api';

const FIELDS = [
  'companyName', 'companyAddress', 'contactLine', 'logoUrl', 'letterheadUrl', 'footerText',
  'signatoryName', 'signatoryDesignation', 'signatureUrl',
  'probationMonths', 'noticeDays', 'validityDays', 'termsEn', 'termsHi',
];

const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f, '']));
const toForm = (src) => Object.fromEntries(FIELDS.map((f) => [f, src?.[f] ?? '']));

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

  if (loading) return <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">Loading...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Offer Letter Settings</h2>
          <p className="text-xs text-slate-500">Used when generating offer letters from Offer Management.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="default">Default (all companies)</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}{rowFor(String(b.id)) ? ' — override' : ''}</option>
            ))}
          </select>
          {!isDefault && rowFor(scope) && (
            <button onClick={handleRemoveOverride} className="px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm">Remove override</button>
          )}
          <button onClick={handleSave} disabled={saving} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold ${saving ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            <Save size={15} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {!isDefault && (
        <div className="flex gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
          <Info size={14} className="shrink-0 mt-0.5" />
          Company override: fill only what is different for this company. Empty fields use the Default settings.
        </div>
      )}

      {/* Letterhead */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1">Letterhead</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input value={form.companyName} onChange={set('companyName')} placeholder={ph('companyName') || 'Defaults to the vacancy\'s branch name'} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Line</label>
            <input value={form.contactLine} onChange={set('contactLine')} placeholder={ph('contactLine') || 'Phone · Email · Website'} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Address</label>
            <textarea rows={2} value={form.companyAddress} onChange={set('companyAddress')} placeholder={ph('companyAddress') || 'Defaults to the vacancy\'s branch address'} className={inputCls} />
          </div>
          <ImageField field="logoUrl" label="Logo" hint="Shown at the top-left of the letter." />
          <ImageField field="letterheadUrl" label="Full Letterhead Image (optional)" hint="If set, this image replaces the logo + name header (use a wide image, ~2000×300)." />
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Footer Text (optional)</label>
            <input value={form.footerText} onChange={set('footerText')} placeholder={ph('footerText') || 'e.g. CIN / GST / registered office'} className={inputCls} />
          </div>
        </div>
      </section>

      {/* Signatory */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1">Signatory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Signatory Name</label>
            <input value={form.signatoryName} onChange={set('signatoryName')} placeholder={ph('signatoryName')} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Signatory Designation</label>
            <input value={form.signatoryDesignation} onChange={set('signatoryDesignation')} placeholder={ph('signatoryDesignation')} className={inputCls} />
          </div>
          <ImageField field="signatureUrl" label="Signature Image (optional)" hint="Transparent PNG works best." />
        </div>
      </section>

      {/* Terms */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1">Terms & Conditions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Probation (months)</label>
            <input type="number" min="0" value={form.probationMonths} onChange={set('probationMonths')} placeholder={ph('probationMonths')} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Notice Period (days)</label>
            <input type="number" min="0" value={form.noticeDays} onChange={set('noticeDays')} placeholder={ph('noticeDays')} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Offer Valid For (days)</label>
            <input type="number" min="0" value={form.validityDays} onChange={set('validityDays')} placeholder={ph('validityDays')} className={inputCls} />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          One clause per line. Placeholders: <code>{'{probation}'}</code> <code>{'{notice}'}</code> <code>{'{validity_date}'}</code> <code>{'{joining_date}'}</code>
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[['termsEn', 'Terms – English'], ['termsHi', 'Terms – हिंदी']].map(([field, label]) => (
            <div key={field}>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-semibold text-slate-700">{label}</label>
                {isDefault && (
                  <button onClick={() => setForm((f) => ({ ...f, [field]: defaults[field] || '' }))} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                    <RotateCcw size={12} /> Restore standard text
                  </button>
                )}
              </div>
              <textarea rows={10} value={form[field]} onChange={set(field)} placeholder={ph(field)} className={`${inputCls} font-mono text-xs leading-relaxed`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default OfferLetterSettings;

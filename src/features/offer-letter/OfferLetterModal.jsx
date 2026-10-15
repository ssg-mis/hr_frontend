import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import offerLetterApi from './offerLetter.api';
import { buildSnapshot, toDataUrl } from './offerLetter.utils';
import { renderLetterToPdf } from './offerLetterPdf';
import OfferLetterDocument from './OfferLetterDocument';
import { uploadFile } from '../upload/upload.api';

// Sample candidate used by "Preview Format" (nothing is saved in this mode).
const sampleApplication = () => {
  const joining = new Date();
  joining.setDate(joining.getDate() + 7);
  return {
    id: 0,
    applicationNumber: 'APP-SAMPLE',
    candidateName: 'Rahul Sharma',
    candidatePhone: '9876543210',
    candidateEmail: 'rahul.sharma@example.com',
    presentAddress: 'Ward No. 5, Main Road, Raipur, Chhattisgarh',
    offeredDesignation: 'Machine Operator',
    departmentName: 'Production',
    offeredBaseSalary: 12000,
    offeredAllowanceSalary: 3000,
    offeredSalary: 15000,
    offeredJoiningDate: joining.toISOString(),
    branchName: '',
    branchAddress: '',
  };
};

// Built-in defaults ⊕ saved "default" settings row (same rule as the server).
const resolveDefaultSettings = ({ rows = [], defaults = {} }) => {
  const out = { ...defaults };
  const row = rows.find((r) => r.scopeKey === 'default');
  if (row) for (const [k, v] of Object.entries(row)) if (k in defaults && v !== null && v !== '') out[k] = v;
  return out;
};

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const PREVIEW_SCALE = 0.72;

/** Preview, generate (PDF stored in the system) and re-download offer letters for one application. */
const OfferLetterModal = ({ application, onClose, sample = false }) => {
  const [data, setData] = useState(null); // { application, settings, nextRefNo }
  const [history, setHistory] = useState([]);
  const [lang, setLang] = useState('en');
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const printRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      let prep;
      if (sample) {
        const app = sampleApplication();
        prep = { application: app, settings: resolveDefaultSettings(await offerLetterApi.getSettings()), nextRefNo: `OL/${new Date().getFullYear()}/${app.applicationNumber}` };
      } else {
        const [p, list] = await Promise.all([offerLetterApi.prepare(application.id), offerLetterApi.list(application.id)]);
        prep = p;
        setHistory(list);
      }
      setData(prep);
      const s = prep.settings;
      const [logoUrl, letterheadUrl, signatureUrl] = await Promise.all([toDataUrl(s.logoUrl), toDataUrl(s.letterheadUrl), toDataUrl(s.signatureUrl)]);
      setImages({ logoUrl, letterheadUrl, signatureUrl });
    } catch (err) {
      toast.error(err.message || 'Failed to load offer letter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [application?.id, sample]);

  const snapshot = useMemo(() => (data ? buildSnapshot(data, lang) : null), [data, lang]);

  const warnings = useMemo(() => {
    if (!snapshot) return [];
    const w = [];
    if (!snapshot.offer.gross) w.push('Offered salary is not filled.');
    if (!snapshot.offer.joiningDate) w.push('Joining date is not filled.');
    if (!snapshot.company.name) w.push('Company name is missing — set it in Master Data → Offer Letter.');
    if (!snapshot.signatory.name) w.push('Signatory name is not set in Master Data → Offer Letter.');
    return w;
  }, [snapshot]);

  // Sample mode: download only, nothing uploaded or stored.
  const handleSampleDownload = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const blob = await renderLetterToPdf(printRef.current);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Offer_Letter_Sample_${lang}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (err) {
      toast.error(err.message || 'Failed to create sample PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!snapshot || !printRef.current) return;
    if (!snapshot.offer.gross && !window.confirm('Offered salary is empty. Generate the letter anyway?')) return;
    setGenerating(true);
    const toastId = toast.loading('Generating offer letter...');
    try {
      const blob = await renderLetterToPdf(printRef.current);
      const fileName = `${snapshot.refNo.replace(/[^a-zA-Z0-9-]/g, '_')}_${lang}.pdf`;
      const pdfUrl = await uploadFile(new File([blob], fileName, { type: 'application/pdf' }), 'offer-letters');
      await offerLetterApi.create({ jobApplicationId: application.id, refNo: snapshot.refNo, language: lang, snapshot, pdfUrl });

      // Also hand the file to the user right away.
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);

      toast.success(`Offer letter ${snapshot.refNo} saved`, { id: toastId });
      await load(); // refresh history + next ref no
    } catch (err) {
      toast.error(err.message || 'Failed to generate offer letter', { id: toastId });
      if (String(err.message || '').includes('reference number')) load();
    } finally {
      setGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText size={18} /> {sample ? 'Offer Letter Format' : 'Offer Letter'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {sample ? 'Sample candidate data · your Master Data → Offer Letter settings' : `${application.candidateName} · ${application.applicationNumber}`}
            </p>
          </div>
          <button onClick={onClose} disabled={generating} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>

        {loading || !snapshot ? (
          <div className="p-16 text-center text-gray-500">Loading...</div>
        ) : (
          <div className="flex flex-col lg:flex-row min-h-0 flex-1">
            {/* Preview */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              <div style={{ zoom: PREVIEW_SCALE, width: 794 }} className="mx-auto shadow-lg">
                <OfferLetterDocument snapshot={snapshot} images={images} />
              </div>
            </div>

            {/* Controls + history */}
            <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 p-5 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                <div className="flex gap-2">
                  {[['en', 'English'], ['hi', 'हिंदी']].map(([k, label]) => (
                    <button key={k} onClick={() => setLang(k)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold border ${lang === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500">Reference no.: <span className="font-mono font-semibold text-gray-800">{snapshot.refNo}</span></div>

              {warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                  {warnings.map((w) => <div key={w} className="flex gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" />{w}</div>)}
                </div>
              )}

              {sample ? (
                <>
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
                    This is a format preview with sample data. Real letters are generated from the <b>Letter</b> button on a candidate's row. Change letterhead, signatory and terms in <b>Master Data → Offer Letter</b>.
                  </div>
                  <button onClick={handleSampleDownload} disabled={generating}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border ${generating ? 'opacity-60 cursor-wait' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
                    <Download size={16} /> {generating ? 'Creating...' : 'Download sample PDF'}
                  </button>
                </>
              ) : (
              <>
              <button onClick={handleGenerate} disabled={generating}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm ${generating ? 'bg-indigo-300 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <Download size={16} /> {generating ? 'Generating...' : 'Generate & Save PDF'}
              </button>
              <p className="text-[11px] text-gray-500 -mt-3">The PDF is stored in the system and downloaded. Terms, letterhead and signatory come from Master Data → Offer Letter.</p>

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Saved letters ({history.length})</div>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400">No offer letter generated yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((h) => (
                      <li key={h.id} className="p-2.5 rounded-xl border border-gray-200 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-semibold text-gray-800">{h.refNo}</span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{h.language === 'hi' ? 'हिंदी' : 'EN'}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5">{fmtDateTime(h.createdAt)}{h.generatedBy ? ` · ${h.generatedBy}` : ''}</div>
                        <a href={h.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-indigo-600 hover:underline font-semibold">
                          <ExternalLink size={12} /> Open / Download
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Full-size off-screen copy used for the PDF (outside the modal so nothing clips or scales it) */}
      {snapshot && createPortal(
        <div style={{ position: 'absolute', left: -10000, top: 0 }} aria-hidden="true">
          <OfferLetterDocument ref={printRef} snapshot={snapshot} images={images} />
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default OfferLetterModal;

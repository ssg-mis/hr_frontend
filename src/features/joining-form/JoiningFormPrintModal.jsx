import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ExternalLink, Printer, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import joiningFormApi from './joiningForm.api';
import JoiningFormDocument from './JoiningFormDocument';
import { renderLetterToPdf } from '../offer-letter/offerLetterPdf';
import { toDataUrl } from '../offer-letter/offerLetter.utils';
import { uploadFile } from '../upload/upload.api';
import whatsappApi from '../whatsapp/whatsapp.api';

const WEEK_LABEL = { SUN: 'Sunday', MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const nameOf = (list, id) => list.find((x) => String(x.id) === String(id))?.name || '';

/** Preview the joining form (EN/HI), generate the PDF, store it and download it. */
const JoiningFormPrintModal = ({ applicationId, values, info, options, letterhead, savedPdf, onClose, sample = false }) => {
  const [lang, setLang] = useState('en');
  const [images, setImages] = useState({});
  const [busy, setBusy] = useState(false);
  const [pdf, setPdf] = useState(savedPdf || null); // last saved PDF (updates after Generate)
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState(null); // number it was sent to (this session)

  const sendWhatsapp = async () => {
    const phone = String(values.candidatePhone || '').trim();
    if (!phone) { toast.error('Mobile number is missing in the joining form'); return; }
    if (!window.confirm(`Send the joining form to ${values.candidateName || 'the employee'} (${phone}) on WhatsApp?`)) return;
    setSending(true);
    const toastId = toast.loading('Sending on WhatsApp...');
    try {
      const res = await whatsappApi.sendJoiningForm(applicationId);
      toast.success(res.message || 'Sent on WhatsApp', { id: toastId });
      setSentTo(phone);
    } catch (err) {
      toast.error(err.message || 'WhatsApp send failed', { id: toastId });
    } finally {
      setSending(false);
    }
  };
  const printRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [logoUrl, letterheadUrl, photo, footerImageUrl] = await Promise.all([
        toDataUrl(letterhead?.logoUrl), toDataUrl(letterhead?.letterheadUrl), toDataUrl(values.candidatePhoto), toDataUrl(letterhead?.footerImageUrl),
      ]);
      setImages({ logoUrl, letterheadUrl, photo, footerImageUrl });
    })();
  }, [letterhead, values.candidatePhoto]);

  const snapshot = useMemo(() => {
    const branch = options.branches.find((b) => String(b.id) === String(values.branchId));
    const shift = options.shifts.find((x) => String(x.id) === String(values.shiftId));
    return {
      language: lang,
      date: new Date().toISOString(),
      applicationNumber: info.applicationNumber,
      photo: values.candidatePhoto || '',
      company: {
        name: letterhead?.companyName || branch?.name || '',
        address: letterhead?.companyAddress || branch?.address || '',
        contactLine: letterhead?.contactLine || '',
        logoUrl: letterhead?.logoUrl || '',
        letterheadUrl: letterhead?.letterheadUrl || '',
        footerImageUrl: letterhead?.footerImageUrl || '',
        footerText: letterhead?.footerText || '',
      },
      names: {
        company: branch?.name || '',
        department: nameOf(options.departments, values.departmentId),
        designation: nameOf(options.designations, values.designationId),
        shift: shift ? `${shift.name} (${shift.startTime}–${shift.endTime})` : '',
        weeklyOff: WEEK_LABEL[values.weeklyOffDay] || values.weeklyOffDay,
      },
      values,
      // Declaration text from Master Data → Letters & Documents → Joining Form (falls back to the built-in text)
      declaration: (lang === 'hi' ? letterhead?.joiningDeclarationHi : letterhead?.joiningDeclarationEn) || '',
      salary: info.salary,
      previous: info.previous,
    };
  }, [lang, values, info, options, letterhead]);

  // Sample mode: download only, nothing uploaded or stored.
  const downloadSample = async () => {
    if (!printRef.current) return;
    setBusy(true);
    try {
      const blob = await renderLetterToPdf(printRef.current);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Joining_Form_Sample_${lang}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (err) {
      toast.error(err.message || 'Failed to create sample PDF');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!printRef.current) return;
    setBusy(true);
    const toastId = toast.loading('Generating joining form PDF...');
    try {
      const blob = await renderLetterToPdf(printRef.current);
      const fileName = `Joining_Form_${values.employeeCode || info.applicationNumber}_${lang}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      const pdfUrl = await uploadFile(new File([blob], fileName, { type: 'application/pdf' }), 'joining-forms');
      await joiningFormApi.savePdf(applicationId, pdfUrl, lang);
      setPdf({ pdfUrl, pdfLanguage: lang });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast.success('Joining form PDF saved', { id: toastId });
    } catch (err) {
      toast.error(err.message || 'Failed to generate PDF', { id: toastId });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Printer size={18} /> {sample ? 'Joining Form Format' : 'Joining Form – Print / PDF'}</h3>
          <button onClick={onClose} disabled={busy} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="flex flex-col lg:flex-row min-h-0 flex-1">
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div style={{ zoom: 0.72, width: 794 }} className="mx-auto shadow-lg">
              <JoiningFormDocument snapshot={snapshot} images={images} />
            </div>
          </div>
          <div className="w-full lg:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 p-5 space-y-4">
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
            {sample ? (
              <>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800">
                  Format preview with sample employee data. Company name, address, logo, letterhead and footer come from <b>Master Data → Offer Letter</b> (or the first company in Company Branches).
                </div>
                <button onClick={downloadSample} disabled={busy}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border ${busy ? 'opacity-60 cursor-wait' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
                  <Download size={16} /> {busy ? 'Creating...' : 'Download sample PDF'}
                </button>
              </>
            ) : (
            <button onClick={generate} disabled={busy}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm ${busy ? 'bg-indigo-300 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              <Download size={16} /> {busy ? 'Generating...' : 'Generate & Save PDF'}
            </button>
            )}
            {!sample && <p className="text-[11px] text-gray-500">Letterhead and footer come from Master Data → Offer Letter. Print it, get it signed by the employee, HR and HOD.</p>}
            {!sample && pdf?.pdfUrl && (
              <>
                <a href={pdf.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline font-semibold">
                  <ExternalLink size={14} /> Open last saved PDF ({pdf.pdfLanguage === 'hi' ? 'हिंदी' : 'EN'})
                </a>
                <button onClick={sendWhatsapp} disabled={busy || sending}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm ${sending ? 'bg-green-300 cursor-wait' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-70`}>
                  <Send size={15} /> {sending ? 'Sending...' : 'Send on WhatsApp'}
                </button>
                <p className="text-[11px] text-gray-500 -mt-2">Sends the last saved PDF to the employee's mobile.</p>
                {sentTo && <div className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 size={12} /> Sent on WhatsApp to {sentTo}</div>}
              </>
            )}
          </div>
        </div>
      </div>

      {createPortal(
        <div style={{ position: 'absolute', left: -10000, top: 0 }} aria-hidden="true">
          <JoiningFormDocument ref={printRef} snapshot={snapshot} images={images} />
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default JoiningFormPrintModal;

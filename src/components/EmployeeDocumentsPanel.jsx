import React, { useEffect, useState } from 'react';
import { Upload, ExternalLink, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadFile } from '../features/upload/upload.api';
import { DOC_TYPES, employeeDocumentApi as docApi } from '../features/employeeDocument/employeeDocument.api';

const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Verified: 'bg-green-100 text-green-800 border-green-200',
  Rejected: 'bg-red-100 text-red-800 border-red-200',
};

// mode="self": employee uploads/deletes their own documents (MyProfile).
// mode="hr":   HR uploads on behalf, verifies/rejects, deletes (Employee page). Needs employeeId.
const EmployeeDocumentsPanel = ({ mode = 'self', employeeId }) => {
  const isHr = mode === 'hr';
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [expiry, setExpiry] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      setDocs(isHr ? await docApi.listForEmployee(employeeId) : await docApi.listMine());
    } catch (err) {
      toast.error(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, mode]);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      const fileUrl = await uploadFile(file, 'employee-documents');
      const payload = { docType, fileUrl, fileName: file.name, expiryDate: expiry || null };
      const saved = isHr ? await docApi.addForEmployee(employeeId, payload) : await docApi.addMine(payload);
      setExpiry('');
      toast.success('Document uploaded');
      if (saved?.id) setDocs((prev) => [saved, ...prev]); // show instantly, no second round trip
      else load();
    } catch (err) {
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const review = async (doc, status) => {
    let remark = null;
    if (status === 'Rejected') {
      remark = window.prompt('Reason for rejection (shown to the employee):');
      if (remark === null) return;
    }
    try {
      await docApi.review(doc.id, { status, remark });
      toast.success(`Document ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update document');
    }
  };

  const remove = async (doc) => {
    if (!window.confirm(`Delete "${doc.docType}"?`)) return;
    try {
      await (isHr ? docApi.remove(doc.id) : docApi.removeMine(doc.id));
      toast.success('Document deleted');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '');
  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Expiry (optional)</label>
          <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <label className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white ${uploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'}`}>
          <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload'}
          <input type="file" accept=".pdf,image/*" className="hidden" disabled={uploading} onChange={handleFile} />
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-4">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 rounded-lg">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{d.docType}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLE[d.status] || STATUS_STYLE.Pending}`}>{d.status}</span>
                    {d.expiryDate && (
                      <span className={`text-[11px] font-semibold ${isExpired(d.expiryDate) ? 'text-red-600' : 'text-gray-500'}`}>
                        {isExpired(d.expiryDate) ? 'Expired' : 'Expires'} {fmt(d.expiryDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <FileText size={11} /> {d.fileName || 'File'} · {d.uploadedBy} · {fmt(d.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"><ExternalLink size={12} /> View</a>
                  {isHr && d.status !== 'Verified' && (
                    <button onClick={() => review(d, 'Verified')} title="Verify" className="text-green-600 hover:text-green-800"><CheckCircle size={16} /></button>
                  )}
                  {isHr && d.status !== 'Rejected' && (
                    <button onClick={() => review(d, 'Rejected')} title="Reject" className="text-red-500 hover:text-red-700"><XCircle size={16} /></button>
                  )}
                  {(isHr || d.status !== 'Verified') && (
                    <button onClick={() => remove(d)} title="Delete" className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
              {d.status === 'Rejected' && d.remark && (
                <p className="text-xs text-red-700 mt-1.5">Reason: {d.remark}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeDocumentsPanel;

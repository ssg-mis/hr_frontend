import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, FileCheck, CheckCircle, X, ExternalLink, ShieldCheck, ShieldX } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';
import { uploadFile } from '../features/upload/upload.api';

// checklist key -> { label, field on the application to check for / link to }
const DOC_ITEMS = [
  { key: 'aadhar', label: 'Aadhaar Number', field: 'aadharNo', isLink: false },
  { key: 'photo', label: 'Candidate Photo', field: 'candidatePhoto', isLink: true },
  { key: 'resume', label: 'Resume', field: 'candidateResume', isLink: true },
  { key: 'experienceLetter', label: 'Experience Letter', field: 'experienceLetter', isLink: true },
  { key: 'salarySlip', label: 'Salary Slip', field: 'salarySlip', isLink: true },
  { key: 'relievingLetter', label: 'Relieving Letter', field: 'relievingLetter', isLink: true },
];

const statusBadge = (verified) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${verified ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
    {verified ? 'Verified' : 'Rejected'}
  </span>
);

const DocumentVerification = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [verifying, setVerifying] = useState(null); // candidate row
  const [checklist, setChecklist] = useState({});
  const [remark, setRemark] = useState('');

  const [uploadingField, setUploadingField] = useState(null);
  const [viewingDetails, setViewingDetails] = useState(null);

  const load = async () => {
    setTableLoading(true);
    try {
      const res = await jobApplicationApi.list({ stage: 'OfferAccepted', limit: 1000, search: searchTerm });
      const accepted = res.data || [];
      setPendingData(accepted.filter((a) => !a.documentChecklist));

      const historyRes = await jobApplicationApi.list({
        stage: 'Verified,Hired,Rejected',
        limit: 1000,
        search: searchTerm,
      });
      setHistoryData((historyRes.data || []).filter((a) => a.documentChecklist));
    } catch (err) {
      toast.error(err.message || 'Failed to load verification data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openVerify = (candidate) => {
    const initial = {};
    DOC_ITEMS.forEach((item) => { initial[item.key] = Boolean(candidate[item.field]); });
    setChecklist(initial);
    setRemark('');
    setVerifying(candidate);
  };

  const toggleItem = (key) => setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleDocUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingField(field);
      const url = await uploadFile(file);
      
      // Save it immediately in the database
      await jobApplicationApi.updateStage(verifying.applicationNumber, {
        [field]: url
      });
      
      // Update local state
      setVerifying(prev => ({ ...prev, [field]: url }));
      
      // Automatically check this item in the checklist!
      const itemKey = DOC_ITEMS.find(item => item.field === field)?.key;
      if (itemKey) {
        setChecklist(prev => ({ ...prev, [itemKey]: true }));
      }
      
      toast.success('Document uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload document');
    } finally {
      setUploadingField(null);
    }
  };

  const submitVerification = async (decision) => {
    setSubmitting(true);
    const verifyingAppNumber = verifying.applicationNumber;
    try {
      await jobApplicationApi.updateStage(verifying.applicationNumber, {
        documentChecklist: checklist,
        documentsVerified: decision === 'Verified',
        verificationRemark: remark || null,
        stage: decision === 'Verified' ? 'Verified' : 'Rejected',
      });
      toast.success(decision === 'Verified' ? 'Documents verified — ready for Joining' : 'Candidate rejected at document verification');
      setVerifying(null);
      // Re-fetch and then auto-open viewingDetails for this candidate so uploads are visible
      setTableLoading(true);
      try {
        const res = await jobApplicationApi.list({ stage: 'OfferAccepted', limit: 1000, search: searchTerm });
        const accepted = res.data || [];
        setPendingData(accepted.filter((a) => !a.documentChecklist));
        const historyRes = await jobApplicationApi.list({ stage: 'Verified,Hired,Rejected', limit: 1000, search: searchTerm });
        const historyList = (historyRes.data || []).filter((a) => a.documentChecklist);
        setHistoryData(historyList);
        // Auto-refresh viewingDetails if it was the same candidate
        const refreshed = historyList.find((a) => a.applicationNumber === verifyingAppNumber);
        if (refreshed) setViewingDetails(refreshed);
      } catch (err) {
        toast.error(err.message || 'Failed to reload verification data');
      } finally {
        setTableLoading(false);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save verification');
    } finally {
      setSubmitting(false);
    }
  };

  const rows = activeTab === 'pending' ? pendingData : historyData;

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <FileCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Document Verification</h2>
            <p className="mt-0.5 text-sm text-gray-500">Verify candidate documents after offer acceptance</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by candidate name, phone or application no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-10 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'pending' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('pending')}
            >
              <FileCheck size={16} className="inline mr-2" />
              Pending Verification ({pendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Verification History ({historyData.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">App No.</th>
                <th className="px-6 py-3 text-left">Candidate</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-center">{activeTab === 'pending' ? 'Action' : 'Result'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'pending'
                      ? 'No candidates awaiting document verification.'
                      : 'No verification outcomes recorded yet.'}
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-gray-700">{c.applicationNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{c.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{c.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{c.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{c.candidatePhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {activeTab === 'pending' ? (
                        <button onClick={() => openVerify(c)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                          <FileCheck size={13} /> Verify Documents
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          {statusBadge(c.documentsVerified)}
                          <button
                            onClick={() => setViewingDetails(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-250 bg-white hover:bg-gray-55 text-gray-700 font-bold rounded-lg text-xs transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify modal */}
      {verifying && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verify Documents</h3>
                <p className="text-sm text-gray-500 mt-0.5">{verifying.candidateName} · {verifying.applicationNumber}</p>
              </div>
              <button onClick={() => setVerifying(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {DOC_ITEMS.map((item) => {
                  const url = item.isLink ? verifying[item.field] : null;
                  return (
                    <label key={item.key} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={!!checklist[item.key]} onChange={() => toggleItem(item.key)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.isLink ? (
                          url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                              View <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">Not uploaded</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-500">{verifying[item.field] || 'Not provided'}</span>
                        )}

                        {item.isLink && (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="px-2 py-1 bg-gray-50 border border-gray-250 hover:bg-gray-100 text-[10px] font-bold text-gray-700 rounded-lg flex items-center gap-1 transition-colors"
                              disabled={uploadingField === item.field}
                            >
                              {uploadingField === item.field ? 'Uploading...' : 'Upload'}
                            </button>
                            <input
                              type="file"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => handleDocUpload(e, item.field)}
                              disabled={uploadingField === item.field}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notes about the verification..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setVerifying(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={() => submitVerification('Rejected')} disabled={submitting} className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-semibold rounded-xl">
                <ShieldX size={15} /> Reject
              </button>
              <button type="button" onClick={() => submitVerification('Verified')} disabled={submitting} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">
                <ShieldCheck size={15} /> {submitting ? 'Saving...' : 'Mark Verified'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* View Details modal */}
      {viewingDetails && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Verification Details</h3>
                <p className="text-sm text-gray-500 mt-0.5">{viewingDetails.candidateName} · {viewingDetails.applicationNumber}</p>
              </div>
              <button onClick={() => setViewingDetails(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${viewingDetails.documentsVerified ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                <span className="text-sm font-bold">Verification Outcome</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${viewingDetails.documentsVerified ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {viewingDetails.documentsVerified ? 'Verified' : 'Rejected'}
                </span>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document Checklist</h4>
                {DOC_ITEMS.map((item) => {
                  const isChecked = viewingDetails.documentChecklist?.[item.key];
                  const url = item.isLink ? viewingDetails[item.field] : null;
                  return (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-gray-150 bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isChecked ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.isLink ? (
                          url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-650 hover:text-blue-800 font-semibold flex items-center gap-1">
                              View <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">Not uploaded</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-700 font-mono">{viewingDetails[item.field] || '—'}</span>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${isChecked ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {isChecked ? 'Valid' : 'Invalid/Missing'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-1.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Verification Remarks</span>
                <p className="text-sm text-gray-700 italic">
                  {viewingDetails.verificationRemark || 'No remarks provided.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setViewingDetails(null)}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DocumentVerification;

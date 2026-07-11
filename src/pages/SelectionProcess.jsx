import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ClipboardList, CheckCircle, X, Check, Pause, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

const decisionBadge = (stage) => {
  const style = {
    Offered: 'bg-green-100 text-green-800 border border-green-200',
    Rejected: 'bg-red-100 text-red-800 border border-red-200',
    OnHold: 'bg-amber-100 text-amber-800 border border-amber-200',
  }[stage] || 'bg-gray-100 text-gray-700 border border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{stage === 'Offered' ? 'Moved to Offer' : stage}</span>;
};

const SelectionProcess = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [reviewing, setReviewing] = useState(null); // candidate row
  const [decision, setDecision] = useState('Offer');
  const [remark, setRemark] = useState('');

  const [selectionWarning, setSelectionWarning] = useState('');
  const [shouldBypassLimit, setShouldBypassLimit] = useState(false);

  const load = async () => {
    setTableLoading(true);
    try {
      // Candidates who cleared interview and are awaiting a final hiring decision.
      const pendingRes = await jobApplicationApi.list({ stage: 'Selected', limit: 1000, search: searchTerm });
      setPendingData(pendingRes.data || []);

      // History: anyone whose selection decision has already been recorded.
      const historyRes = await jobApplicationApi.list({
        stage: 'OfferReleased,OfferAccepted,OfferDeclined,Rejected,OnHold,Verified,Hired',
        limit: 1000,
        search: searchTerm,
      });
      setHistoryData((historyRes.data || []).filter((a) => a.selectionRemark || ['OfferReleased', 'OfferAccepted', 'OfferDeclined'].includes(a.stage)));
    } catch (err) {
      toast.error(err.message || 'Failed to load selection data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openReview = (candidate) => {
    setDecision('Offer');
    setRemark('');
    setSelectionWarning('');
    setShouldBypassLimit(false);
    setReviewing(candidate);
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const stage = decision === 'Offer' ? 'OfferReleased' : decision === 'Hold' ? 'OnHold' : 'Rejected';
      await jobApplicationApi.updateStage(reviewing.applicationNumber, {
        stage,
        selectionRemark: remark || null,
        bypassLimit: shouldBypassLimit,
      });
      toast.success(
        decision === 'Offer'
          ? 'Candidate selected — moved to Offer Management'
          : decision === 'Hold'
          ? 'Candidate put on hold'
          : 'Candidate rejected'
      );
      setReviewing(null);
      setSelectionWarning('');
      setShouldBypassLimit(false);
      load();
    } catch (err) {
      if ((err.body && err.body.isLimitExceeded) || err.message?.includes('exceed') || err.message?.includes('limit')) {
        setSelectionWarning(err.message);
        setShouldBypassLimit(true);
      } else {
        toast.error(err.message || 'Failed to record decision');
      }
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
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Selection Process</h2>
            <p className="mt-0.5 text-sm text-gray-500">Finalize the hiring decision for interviewed candidates</p>
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
              <ClipboardList size={16} className="inline mr-2" />
              Awaiting Decision ({pendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Decision History ({historyData.length})
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
                <th className="px-6 py-3 text-left">Interview Feedback</th>
                {activeTab === 'pending' ? (
                  <th className="px-6 py-3 text-center">Action</th>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left">Decision</th>
                    <th className="px-6 py-3 text-left">Remark</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'pending'
                      ? 'No candidates awaiting a selection decision.'
                      : 'No decisions recorded yet.'}
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
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-gray-600 text-xs truncate" title={c.interviewRemark || ''}>{c.interviewRemark || '—'}</p>
                      <p className="text-gray-400 text-[11px]">{fmtDateTime(c.interviewDate)}</p>
                    </td>
                    {activeTab === 'pending' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => openReview(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          Decide
                        </button>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">{decisionBadge(c.stage)}</td>
                        <td className="px-6 py-4 max-w-xs text-gray-600 text-xs truncate" title={c.selectionRemark || ''}>{c.selectionRemark || '—'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision modal */}
      {reviewing && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Selection Decision</h3>
                <p className="text-sm text-gray-500 mt-0.5">{reviewing.candidateName} · {reviewing.applicationNumber}</p>
              </div>
              <button onClick={() => { setReviewing(null); setSelectionWarning(''); setShouldBypassLimit(false); }} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitDecision} className="flex flex-col">
              <div className="p-6 space-y-4">
                {selectionWarning && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm font-semibold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-650 animate-pulse" />
                      <span>Slots Limit Exceeded Warning</span>
                    </div>
                    <p className="text-xs text-red-600 font-medium leading-relaxed mt-1">
                      {selectionWarning}
                    </p>
                  </div>
                )}
                {reviewing.interviewRemark && (
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Interview Feedback</span>
                    <p className="text-sm text-gray-700 mt-1">{reviewing.interviewRemark}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Decision</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setDecision('Offer')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Offer' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <Check size={14} /> Select
                    </button>
                    <button type="button" onClick={() => setDecision('Hold')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Hold' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <Pause size={14} /> Hold
                    </button>
                    <button type="button" onClick={() => setDecision('Reject')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Reject' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <ThumbsDown size={14} /> Reject
                    </button>
                  </div>
                  {decision === 'Offer' && <p className="text-xs text-gray-400 mt-2">Candidate moves to Offer Management.</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                  <textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Reason for the decision..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => { setReviewing(null); setSelectionWarning(''); setShouldBypassLimit(false); }} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2.5 font-semibold rounded-xl text-white transition-colors ${
                    shouldBypassLimit
                      ? 'bg-red-600 hover:bg-red-700 shadow-md shadow-red-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100'
                  }`}
                >
                  {submitting ? 'Saving...' : shouldBypassLimit ? 'Proceed & Confirm Anyway' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SelectionProcess;

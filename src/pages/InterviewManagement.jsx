import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Clock, CheckCircle, X, CalendarClock, UserCheck, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';

const RESULTS = ['Selected', 'Rejected', 'OnHold', 'Reschedule'];
const INTERVIEW_MODES = ['In-Person', 'Phone', 'Video'];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

const toDatetimeLocal = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const resultBadge = (stage) => {
  const style = {
    Selected: 'bg-green-100 text-green-800 border border-green-200',
    Rejected: 'bg-red-100 text-red-800 border border-red-200',
    OnHold: 'bg-amber-100 text-amber-800 border border-amber-200',
    Interview: 'bg-blue-100 text-blue-800 border border-blue-200',
    Reschedule: 'bg-blue-100 text-blue-800 border border-blue-200',
  }[stage] || 'bg-gray-100 text-gray-700 border border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{stage === 'OnHold' ? 'On Hold' : stage}</span>;
};

const InterviewManagement = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [recording, setRecording] = useState(null); // candidate row
  const [form, setForm] = useState({ interviewDate: '', interviewMode: 'In-Person', interviewRemark: '', result: 'Reschedule' });

  const [viewingHistory, setViewingHistory] = useState(null); // candidate row
  const [outcomeHistory, setOutcomeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setTableLoading(true);
    try {
      // Candidates currently sitting in the Interview stage.
      const pendingRes = await jobApplicationApi.list({ stage: 'Interview', limit: 1000, search: searchTerm });
      setPendingData(pendingRes.data || []);

      // History: anyone who has been through an interview and moved past it.
      const historyRes = await jobApplicationApi.list({
        stage: 'Selected,Rejected,OnHold,OfferReleased,OfferAccepted,OfferDeclined,Verified,Hired',
        limit: 1000,
        search: searchTerm,
      });
      setHistoryData((historyRes.data || []).filter((a) => a.interviewDate));
    } catch (err) {
      toast.error(err.message || 'Failed to load interview data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openRecord = (candidate) => {
    setForm({
      interviewDate: toDatetimeLocal(candidate.interviewDate),
      interviewMode: candidate.interviewMode || 'In-Person',
      interviewRemark: candidate.interviewRemark || '',
      result: 'Reschedule',
    });
    setRecording(candidate);
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.interviewDate) {
      toast.error('Please pick an interview date/time');
      return;
    }
    setSubmitting(true);
    try {
      await jobApplicationApi.addInterviewOutcome(recording.applicationNumber, {
        interviewDate: form.interviewDate,
        interviewMode: form.interviewMode,
        result: form.result,
        remark: form.interviewRemark || null,
      });
      toast.success(
        form.result === 'Reschedule' ? 'Interview rescheduled' : `Candidate marked as ${form.result}`
      );
      setRecording(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save interview outcome');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (candidate) => {
    setViewingHistory(candidate);
    setHistoryLoading(true);
    try {
      const res = await jobApplicationApi.listInterviewOutcomes(candidate.applicationNumber);
      setOutcomeHistory(res || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load outcome history');
      setOutcomeHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const rows = activeTab === 'pending' ? pendingData : historyData;

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Interview Management</h2>
            <p className="mt-0.5 text-sm text-gray-500">Record interview outcomes for candidates scheduled via Call Tracker</p>
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
              <Clock size={16} className="inline mr-2" />
              To Interview ({pendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Interview History ({historyData.length})
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
                <th className="px-6 py-3 text-left">Interview Date</th>
                <th className="px-6 py-3 text-left">Mode</th>
                {activeTab === 'pending' ? (
                  <th className="px-6 py-3 text-center">Action</th>
                ) : (
                  <th className="px-6 py-3 text-left">Result</th>
                )}
                <th className="px-6 py-3 text-center">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'pending'
                      ? 'No candidates awaiting interview. Schedule one from Call Tracker.'
                      : 'No interview outcomes recorded yet.'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDateTime(c.interviewDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{c.interviewMode || '—'}</td>
                    {activeTab === 'pending' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => openRecord(c)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors"
                        >
                          <UserCheck size={13} /> Record Outcome
                        </button>
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap">{resultBadge(c.stage)}</td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => openHistory(c)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <History size={13} /> View History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Outcome modal */}
      {recording && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CalendarClock size={18} /> Record Interview Outcome</h3>
                <p className="text-xs text-gray-500 mt-0.5">{recording.candidateName} · {recording.applicationNumber}</p>
              </div>
              <button onClick={() => setRecording(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Date & Time *</label>
                    <input type="datetime-local" name="interviewDate" value={form.interviewDate} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                    <select name="interviewMode" value={form.interviewMode} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      {INTERVIEW_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Result *</label>
                  <select name="result" value={form.result} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {RESULTS.map((r) => <option key={r} value={r}>{r === 'OnHold' ? 'On Hold' : r}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">"Reschedule" keeps the candidate in the Interview stage with the updated date.</p>
                </div>
                {recording.vacancyStatus === 'Closed' && form.result === 'Selected' && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm font-semibold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>Cannot Send Offer</span>
                    </div>
                    <p className="text-xs text-red-650 font-medium leading-relaxed mt-1">
                      can not send offer edit the vacancy or create new one
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback / Remark</label>
                  <textarea name="interviewRemark" rows={3} value={form.interviewRemark} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Panel notes, rating, next steps..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setRecording(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting || (recording.vacancyStatus === 'Closed' && form.result === 'Selected')} className={`px-5 py-2.5 text-white font-semibold rounded-xl transition-colors ${(recording.vacancyStatus === 'Closed' && form.result === 'Selected') ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-150'}`}>{submitting ? 'Saving...' : 'Save Outcome'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Outcome Timeline modal */}
      {viewingHistory && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><History size={18} /> Outcome Timeline</h3>
                <p className="text-xs text-gray-500 mt-0.5">{viewingHistory.candidateName} · {viewingHistory.applicationNumber}</p>
              </div>
              <button onClick={() => setViewingHistory(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-2 overflow-y-auto custom-scrollbar">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                  <span className="text-sm font-semibold text-gray-400">Loading...</span>
                </div>
              ) : outcomeHistory.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-10">No outcomes recorded yet.</p>
              ) : (
                outcomeHistory.map((h) => (
                  <div key={h.id} className="text-xs bg-gray-50 rounded-lg p-3 border border-gray-150">
                    <div className="flex justify-between items-center">
                      {resultBadge(h.result)}
                      <span className="text-gray-400">{fmtDateTime(h.createdAt)}</span>
                    </div>
                    <div className="mt-1.5 text-gray-600">
                      Interview: {fmtDateTime(h.interviewDate)} {h.interviewMode ? `· ${h.interviewMode}` : ''}
                    </div>
                    {h.remark && <p className="text-gray-600 mt-1">{h.remark}</p>}
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setViewingHistory(null)} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default InterviewManagement;

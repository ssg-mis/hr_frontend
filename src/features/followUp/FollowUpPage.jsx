import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Phone, CalendarClock, CalendarCheck, Ban, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { jobApplicationApi } from '../jobApplication/jobApplication.api';

const OUTCOMES = ['Interested', 'Not Interested', 'No Response', 'Call Later'];
const INTERVIEW_MODES = ['In-Person', 'Phone', 'Video'];

const FollowUpPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Follow-up modal
  const [followingUp, setFollowingUp] = useState(null); // candidate row
  const [history, setHistory] = useState([]);
  const [followForm, setFollowForm] = useState({ notes: '', outcome: 'Interested', nextDate: '' });

  // Interview scheduling modal
  const [scheduling, setScheduling] = useState(null); // candidate row
  const [interviewForm, setInterviewForm] = useState({ interviewDate: '', interviewMode: 'In-Person', interviewRemark: '' });

  useEffect(() => {
    load();
  }, [searchTerm]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await jobApplicationApi.list({
        stage: 'Applied,FollowUp',
        limit: 1000,
        search: searchTerm,
      });
      setCandidates(res.data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
      toast.error(error.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  const openFollowUp = async (candidate) => {
    setFollowForm({ notes: '', outcome: 'Interested', nextDate: '' });
    setFollowingUp(candidate);
    try {
      setHistory(await jobApplicationApi.listFollowUps(candidate.applicationNumber));
    } catch {
      setHistory([]);
    }
  };

  const submitFollowUp = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await jobApplicationApi.addFollowUp(followingUp.applicationNumber, {
        notes: followForm.notes || null,
        outcome: followForm.outcome,
        nextDate: followForm.nextDate || null,
      });
      toast.success('Follow-up logged');
      setFollowingUp(null);
      load();
    } catch (error) {
      toast.error(error.message || 'Failed to log follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const openSchedule = (candidate) => {
    setInterviewForm({ interviewDate: '', interviewMode: 'In-Person', interviewRemark: '' });
    setScheduling(candidate);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!interviewForm.interviewDate) {
      toast.error('Please pick an interview date/time');
      return;
    }
    setSubmitting(true);
    try {
      await jobApplicationApi.updateStage(scheduling.applicationNumber, {
        stage: 'Interview',
        interviewDate: interviewForm.interviewDate,
        interviewMode: interviewForm.interviewMode,
        interviewRemark: interviewForm.interviewRemark || null,
      });
      toast.success('Interview scheduled — moved to Interview stage');
      setScheduling(null);
      load();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async (candidate) => {
    if (!window.confirm(`Reject ${candidate.candidateName}? They will leave the follow-up list.`)) return;
    try {
      await jobApplicationApi.updateStage(candidate.applicationNumber, { stage: 'Rejected' });
      toast.success('Candidate rejected');
      load();
    } catch (error) {
      toast.error(error.message || 'Failed to reject');
    }
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
  const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Candidate Follow-up</h2>
            <p className="mt-0.5 text-sm text-gray-500">Call applicants, log outcomes, and schedule interviews</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
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

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">App No.</th>
                <th className="px-6 py-3 text-left">Candidate</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Stage</th>
                <th className="px-6 py-3 text-left">Next Follow-up</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-gray-400 text-sm">
                    No candidates awaiting follow-up. New applications appear here automatically.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-medium text-gray-700">{c.applicationNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">{c.candidateName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{c.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{c.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{c.candidatePhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.stage === 'FollowUp' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {c.stage === 'FollowUp' ? 'In Follow-up' : 'New'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(c.nextFollowUpDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openFollowUp(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors">
                          <Phone size={13} /> Follow-up
                        </button>
                        <button onClick={() => openSchedule(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
                          <CalendarCheck size={13} /> Schedule Interview
                        </button>
                        <button onClick={() => reject(c)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors">
                          <Ban size={13} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Follow-up modal */}
      {followingUp && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Log Follow-up</h3>
                <p className="text-sm text-gray-500 mt-0.5">{followingUp.candidateName} · {followingUp.applicationNumber}</p>
              </div>
              <button onClick={() => setFollowingUp(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitFollowUp} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Outcome</label>
                  <select value={followForm.outcome} onChange={(e) => setFollowForm((f) => ({ ...f, outcome: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">What the candidate said</label>
                  <textarea rows={3} value={followForm.notes} onChange={(e) => setFollowForm((f) => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Notes from the call..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Next Follow-up Date</label>
                  <input type="date" value={followForm.nextDate} onChange={(e) => setFollowForm((f) => ({ ...f, nextDate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {history.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1"><CalendarClock size={12} /> Previous Follow-ups</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {history.map((h) => (
                        <div key={h.id} className="text-xs bg-gray-50 rounded-lg p-2.5 border border-gray-150">
                          <div className="flex justify-between">
                            <span className="font-semibold text-gray-700">{h.outcome || '—'}</span>
                            <span className="text-gray-400">{fmtDateTime(h.createdAt)}</span>
                          </div>
                          {h.notes && <p className="text-gray-600 mt-1">{h.notes}</p>}
                          {h.nextDate && <p className="text-gray-400 mt-0.5">Next: {fmtDate(h.nextDate)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setFollowingUp(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Log Follow-up'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Interview modal */}
      {scheduling && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Schedule Interview</h3>
                <p className="text-sm text-gray-500 mt-0.5">{scheduling.candidateName} · {scheduling.applicationNumber}</p>
              </div>
              <button onClick={() => setScheduling(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitSchedule} className="flex-col">
              <div className="p-6 space-y-4">
                {scheduling.vacancyStatus === 'Closed' && (
                  <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-sm font-semibold flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                      <span>Cannot Schedule Interview</span>
                    </div>
                    <p className="text-xs text-red-650 font-medium leading-relaxed mt-1">
                      cant go with the applicant because the vacancy is allready filled if you want to proceed edit the vacancy or add new vacancy
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Interview Date & Time *</label>
                  <input type="datetime-local" value={interviewForm.interviewDate} onChange={(e) => setInterviewForm((f) => ({ ...f, interviewDate: e.target.value }))} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mode</label>
                  <select value={interviewForm.interviewMode} onChange={(e) => setInterviewForm((f) => ({ ...f, interviewMode: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {INTERVIEW_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                  <textarea rows={2} value={interviewForm.interviewRemark} onChange={(e) => setInterviewForm((f) => ({ ...f, interviewRemark: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Location / meeting link / panel..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setScheduling(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting || scheduling.vacancyStatus === 'Closed'} className={`px-5 py-2.5 font-semibold rounded-xl text-white transition-colors ${scheduling.vacancyStatus === 'Closed' ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-150'}`}>{submitting ? 'Scheduling...' : 'Schedule & Move to Interview'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FollowUpPage;

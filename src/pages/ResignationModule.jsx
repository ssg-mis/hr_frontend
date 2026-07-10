import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, UserX, CheckCircle, X, CalendarClock, Check, Pause, ThumbsDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { resignationApi } from '../features/resignation/resignation.api';
import { jobApplicationApi } from '../features/jobApplication/jobApplication.api';

const REASONS = [
  'Better Opportunity',
  'Personal Reasons',
  'Relocation',
  'Health Issues',
  'Higher Education',
  'Starting Own Business',
  'Work-Life Balance',
  'Other',
];

const ACTIVE_STAGES = ['Requested', 'MeetingScheduled', 'NoticePeriod'];
const RESOLVED_STAGES = ['Retained', 'Left', 'Clearance', 'Settlement', 'Relieved'];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—');

const stageBadge = (stage) => {
  const style = {
    Requested: 'bg-blue-100 text-blue-800 border border-blue-200',
    MeetingScheduled: 'bg-amber-100 text-amber-800 border border-amber-200',
    Retained: 'bg-green-100 text-green-800 border border-green-200',
    NoticePeriod: 'bg-orange-100 text-orange-800 border border-orange-200',
    Left: 'bg-gray-100 text-gray-700 border border-gray-200',
    Clearance: 'bg-purple-100 text-purple-800 border border-purple-200',
    Settlement: 'bg-purple-100 text-purple-800 border border-purple-200',
    Relieved: 'bg-gray-200 text-gray-800 border border-gray-300',
  }[stage] || 'bg-gray-100 text-gray-700 border border-gray-200';
  const label = stage === 'MeetingScheduled' ? 'Meeting Scheduled' : stage === 'NoticePeriod' ? 'Notice Period' : stage;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
};

const ResignationModule = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Request Resignation modal
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ jobApplicationId: '', reason: REASONS[0], customReason: '' });

  // Schedule Meeting modal
  const [scheduling, setScheduling] = useState(null); // resignation row
  const [meetingDate, setMeetingDate] = useState('');

  // Record Outcome modal
  const [deciding, setDeciding] = useState(null); // resignation row
  const [meetingHistory, setMeetingHistory] = useState([]);
  const [decision, setDecision] = useState('Stay');
  const [decisionForm, setDecisionForm] = useState({ notes: '', retainedSalary: '', retentionRemark: '', reason: '' });

  // Notice Period modal
  const [settingNotice, setSettingNotice] = useState(null); // resignation row
  const [noticeForm, setNoticeForm] = useState({ noticeStartDate: '', lastWorkingDay: '', noticeRemark: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [resRes, empRes, activeRes] = await Promise.all([
        resignationApi.list({ search: searchTerm }),
        jobApplicationApi.list({ stage: 'Onboarded', limit: 1000 }),
        resignationApi.list({ stage: 'Requested,MeetingScheduled,NoticePeriod' }),
      ]);
      setRows(resRes.data || []);
      const activeJobAppIds = new Set((activeRes.data || []).map((r) => r.jobApplicationId));
      setEligibleEmployees((empRes.data || []).filter((e) => !activeJobAppIds.has(e.id)));
    } catch (err) {
      toast.error(err.message || 'Failed to load resignation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openRequest = () => {
    setRequestForm({ jobApplicationId: '', reason: REASONS[0], customReason: '' });
    setRequesting(true);
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.jobApplicationId) {
      toast.error('Please select an employee');
      return;
    }
    setSubmitting(true);
    try {
      const reason = requestForm.reason === 'Other' ? requestForm.customReason : requestForm.reason;
      await resignationApi.create({ jobApplicationId: Number(requestForm.jobApplicationId), reason: reason || null });
      toast.success('Resignation request recorded');
      setRequesting(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record resignation request');
    } finally {
      setSubmitting(false);
    }
  };

  const openSchedule = (row) => {
    setMeetingDate('');
    setScheduling(row);
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!meetingDate) {
      toast.error('Please pick a meeting date/time');
      return;
    }
    setSubmitting(true);
    try {
      await resignationApi.scheduleMeeting(scheduling.id, meetingDate);
      toast.success('Retention meeting scheduled');
      setScheduling(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const openDecision = async (row) => {
    setDecision('Stay');
    setDecisionForm({ notes: '', retainedSalary: '', retentionRemark: '', reason: row.reason || '' });
    setDeciding(row);
    try {
      setMeetingHistory(await resignationApi.listMeetings(row.id));
    } catch {
      setMeetingHistory([]);
    }
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    const pendingMeeting = meetingHistory.find((m) => !m.outcome);
    if (!pendingMeeting) {
      toast.error('No pending meeting found for this resignation');
      return;
    }
    if (decision === 'Negative' && !decisionForm.reason.trim()) {
      toast.error('Please provide a reason for the resignation');
      return;
    }
    setSubmitting(true);
    try {
      await resignationApi.recordMeetingOutcome(deciding.id, pendingMeeting.id, {
        outcome: decision,
        notes: decisionForm.notes || null,
        retainedSalary: decisionForm.retainedSalary || null,
        retentionRemark: decisionForm.retentionRemark || null,
        reason: decisionForm.reason || null,
      });
      toast.success(
        decision === 'Stay' ? 'Employee retained' : decision === 'Negative' ? 'Moved to Notice Period' : 'Marked pending — schedule the next meeting'
      );
      setDeciding(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to record decision');
    } finally {
      setSubmitting(false);
    }
  };

  const openNotice = (row) => {
    setNoticeForm({
      noticeStartDate: row.noticeStartDate ? row.noticeStartDate.slice(0, 10) : '',
      lastWorkingDay: row.lastWorkingDay ? row.lastWorkingDay.slice(0, 10) : '',
      noticeRemark: row.noticeRemark || '',
    });
    setSettingNotice(row);
  };

  const handleNoticeChange = (e) => setNoticeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const saveNotice = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(settingNotice.id, {
        noticeStartDate: noticeForm.noticeStartDate || null,
        lastWorkingDay: noticeForm.lastWorkingDay || null,
        noticeRemark: noticeForm.noticeRemark || null,
      });
      toast.success('Notice period details saved');
      setSettingNotice(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save notice period');
    } finally {
      setSubmitting(false);
    }
  };

  const markLeft = async () => {
    if (!noticeForm.lastWorkingDay) {
      toast.error('Please set the last working day first');
      return;
    }
    setSubmitting(true);
    try {
      await resignationApi.update(settingNotice.id, {
        noticeStartDate: noticeForm.noticeStartDate || null,
        lastWorkingDay: noticeForm.lastWorkingDay,
        noticeRemark: noticeForm.noticeRemark || null,
        stage: 'Left',
      });
      toast.success('Employee marked as Left — continue in After Leaving Work');
      setSettingNotice(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to mark as left');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleRows = rows.filter((r) => (activeTab === 'active' ? ACTIVE_STAGES.includes(r.stage) : RESOLVED_STAGES.includes(r.stage)));

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">Resignation Module</h2>
              <p className="mt-0.5 text-sm text-gray-500">Retention meetings, decisions and notice period tracking</p>
            </div>
          </div>
          <button
            onClick={openRequest}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all duration-150 inline-flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            Request Resignation
          </button>
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
            placeholder="Search by employee name, phone or code..."
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
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'active' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('active')}
            >
              <UserX size={16} className="inline mr-2" />
              Active ({rows.filter((r) => ACTIVE_STAGES.includes(r.stage)).length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'resolved' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('resolved')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Resolved ({rows.filter((r) => RESOLVED_STAGES.includes(r.stage)).length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Stage</th>
                <th className="px-6 py-3 text-left">Details</th>
                {activeTab === 'active' && <th className="px-6 py-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'active' ? 'No active resignations.' : 'No resolved resignations yet.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{r.candidateName}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.employeeCode || r.applicationNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{r.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{r.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">{r.candidatePhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{stageBadge(r.stage)}</td>
                    <td className="px-6 py-4 max-w-xs">
                      {r.stage === 'Requested' && <p className="text-xs text-gray-600 truncate">{r.reason || 'No reason given yet'}</p>}
                      {r.stage === 'MeetingScheduled' && (
                        <p className="text-xs text-gray-600">
                          {r.nextMeetingDate ? `Meeting: ${fmtDateTime(r.nextMeetingDate)}` : 'Awaiting reschedule'}
                        </p>
                      )}
                      {r.stage === 'NoticePeriod' && (
                        <p className="text-xs text-gray-600">Last working day: {fmtDate(r.lastWorkingDay)}</p>
                      )}
                      {r.stage === 'Retained' && <p className="text-xs text-green-700">{r.retentionRemark || 'Retained'}</p>}
                      {['Left', 'Clearance', 'Settlement', 'Relieved'].includes(r.stage) && (
                        <p className="text-xs text-gray-500">Last working day: {fmtDate(r.lastWorkingDay)}</p>
                      )}
                    </td>
                    {activeTab === 'active' && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {r.stage === 'Requested' && (
                          <button onClick={() => openSchedule(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <CalendarClock size={13} /> Schedule Meeting
                          </button>
                        )}
                        {r.stage === 'MeetingScheduled' && (
                          r.nextMeetingDate ? (
                            <button onClick={() => openDecision(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                              Record Outcome
                            </button>
                          ) : (
                            <button onClick={() => openSchedule(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                              <CalendarClock size={13} /> Schedule Meeting
                            </button>
                          )
                        )}
                        {r.stage === 'NoticePeriod' && (
                          <button onClick={() => openNotice(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            Notice Period
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Resignation modal */}
      {requesting && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Request for Resignation</h3>
              <button onClick={() => setRequesting(false)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitRequest} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Employee *</label>
                  <select
                    required
                    value={requestForm.jobApplicationId}
                    onChange={(e) => setRequestForm((f) => ({ ...f, jobApplicationId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select an onboarded employee</option>
                    {eligibleEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.candidateName} · {emp.employeeCode}</option>
                    ))}
                  </select>
                  {eligibleEmployees.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No onboarded employees available (or all already have an active resignation).</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
                  <select
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {requestForm.reason === 'Other' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Please specify</label>
                    <input type="text" value={requestForm.customReason} onChange={(e) => setRequestForm((f) => ({ ...f, customReason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setRequesting(false)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Schedule Meeting modal */}
      {scheduling && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Schedule Retention Meeting</h3>
                <p className="text-sm text-gray-500 mt-0.5">{scheduling.candidateName} · {scheduling.employeeCode}</p>
              </div>
              <button onClick={() => setScheduling(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitSchedule} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Date & Time *</label>
                  <input type="datetime-local" required value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setScheduling(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Scheduling...' : 'Schedule Meeting'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Record Outcome modal */}
      {deciding && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Record Meeting Outcome</h3>
                <p className="text-sm text-gray-500 mt-0.5">{deciding.candidateName} · {deciding.employeeCode}</p>
              </div>
              <button onClick={() => setDeciding(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <form onSubmit={submitDecision} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                {meetingHistory.filter((m) => m.outcome).length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 space-y-1 max-h-28 overflow-y-auto">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Previous Meetings</span>
                    {meetingHistory.filter((m) => m.outcome).map((m) => (
                      <div key={m.id} className="text-xs text-gray-600 flex justify-between">
                        <span>{fmtDateTime(m.meetingDate)} — {m.outcome}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Decision</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setDecision('Stay')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Stay' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <Check size={14} /> Stay
                    </button>
                    <button type="button" onClick={() => setDecision('Negative')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Negative' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <ThumbsDown size={14} /> Negative
                    </button>
                    <button type="button" onClick={() => setDecision('Pending')} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-bold transition-colors ${decision === 'Pending' ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-250 text-gray-600 hover:bg-gray-50'}`}>
                      <Pause size={14} /> Pending
                    </button>
                  </div>
                </div>

                {decision === 'Stay' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Revised Salary (if any)</label>
                      <input type="text" value={decisionForm.retainedSalary} onChange={(e) => setDecisionForm((f) => ({ ...f, retainedSalary: e.target.value }))} placeholder="Leave blank to keep current salary" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Retention Remark</label>
                      <textarea rows={2} value={decisionForm.retentionRemark} onChange={(e) => setDecisionForm((f) => ({ ...f, retentionRemark: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </>
                )}

                {decision === 'Negative' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reason *</label>
                    <input type="text" required value={decisionForm.reason} onChange={(e) => setDecisionForm((f) => ({ ...f, reason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    <p className="text-xs text-gray-400 mt-1">Employee moves to Notice Period Management.</p>
                  </div>
                )}

                {decision === 'Pending' && (
                  <p className="text-xs text-gray-400">Employee needs more time — schedule the next meeting after saving.</p>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Meeting Notes</label>
                  <textarea rows={2} value={decisionForm.notes} onChange={(e) => setDecisionForm((f) => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="What was discussed..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setDeciding(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Confirm Decision'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Notice Period modal */}
      {settingNotice && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Notice Period Management</h3>
                <p className="text-sm text-gray-500 mt-0.5">{settingNotice.candidateName} · {settingNotice.employeeCode}</p>
              </div>
              <button onClick={() => setSettingNotice(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {settingNotice.reason && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Resignation Reason</span>
                  <p className="text-sm text-gray-700 mt-1">{settingNotice.reason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notice Start Date</label>
                  <input type="date" name="noticeStartDate" value={noticeForm.noticeStartDate} onChange={handleNoticeChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Working Day</label>
                  <input type="date" name="lastWorkingDay" value={noticeForm.lastWorkingDay} onChange={handleNoticeChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Policy / Remark</label>
                <textarea name="noticeRemark" rows={2} value={noticeForm.noticeRemark} onChange={handleNoticeChange} placeholder="e.g. 30-day standard notice as per policy" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setSettingNotice(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={saveNotice} disabled={submitting} className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl">Save</button>
              <button type="button" onClick={markLeft} disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Mark as Left'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ResignationModule;

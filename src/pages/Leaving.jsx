import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ClipboardCheck, CheckCircle, X, UserX, AlertCircle, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resignationApi } from '../features/resignation/resignation.api';
import { employeeApi } from '../features/employee/employee.api';
import useAuthStore from '../store/authStore';
import { noDuesOf, handoverStatusOf, isSectionDone, NoDuesPill, HandoverPill, NO_DUES_STAGE_LABEL, inr } from '../features/resignation/noDues.utils';

const SECTION_LABEL = { canteen: 'Canteen', store: 'Store', accounts: 'Accounts (Advance / EMI)' };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const stageBadge = (stage) => {
  const style = {
    Left: 'bg-red-50 text-red-700 border border-red-200',
    Clearance: 'bg-purple-50 text-purple-700 border border-purple-200',
    Settlement: 'bg-amber-55 text-amber-800 border border-amber-200',
    Relieved: 'bg-green-50 text-green-700 border border-green-200',
  }[stage] || 'bg-gray-50 text-gray-700 border border-gray-200';
  const label = stage === 'Clearance' || stage === 'Left' ? NO_DUES_STAGE_LABEL : stage === 'Settlement' ? 'F&F Settlement' : stage;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{label}</span>;
};

const Leaving = () => {
  const { user, isHOD, isHR, isAdmin } = useAuthStore();
  const isPureHOD = isHOD && !isHR && !isAdmin;

  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal State
  const [selectedRow, setSelectedRow] = useState(null);
  const [checklist, setChecklist] = useState({
    assetClearance: false,
    departmentClearance: false,
    handover: false,
    handoverEmployeeId: '',
  });
  const [clearanceRemark, setClearanceRemark] = useState('');
  const [answer, setAnswer] = useState({}); // section -> { due, amount, remark } (HR answering in the popup)
  const [storeItems, setStoreItems] = useState({ data: [], loading: false, unavailable: false });

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, empRes] = await Promise.all([
        resignationApi.list({ search: searchTerm, stage: 'Left,Clearance,Settlement,Relieved' }),
        employeeApi.list(),
      ]);
      const fresh = resRes.data || [];
      setRows(fresh);
      setSelectedRow((prev) => (prev ? fresh.find((r) => r.id === prev.id) || prev : prev));
      setAllEmployees(empRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load clearance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openClearanceModal = (row) => {
    setSelectedRow(row);
    const savedChecklist = row.clearanceChecklist || {};
    setChecklist({
      assetClearance: !!savedChecklist.assetClearance,
      departmentClearance: !!savedChecklist.departmentClearance,
      handover: !!savedChecklist.handover,
      handoverEmployeeId: savedChecklist.handoverEmployeeId || '',
      handoverStatus: savedChecklist.handoverStatus || 'Not Prompted',
    });
    setClearanceRemark(row.clearanceRemark || '');
    setAnswer({});
    loadStorePending(row.id);
  };

  // Live check against the separate Store app (Employee Loan Tracker) for the "Store" section.
  const loadStorePending = async (resignationId) => {
    setStoreItems({ data: [], loading: true, unavailable: false });
    try {
      const res = await resignationApi.storePending(resignationId);
      setStoreItems({ data: res?.data || [], loading: false, unavailable: !!res?.unavailable });
      // Store just got auto-marked "No Due" on the backend — refresh so the status pill updates.
      if (res?.autoCleared) loadData();
    } catch (err) {
      setStoreItems({ data: [], loading: false, unavailable: true });
    }
  };

  // Canteen / Accounts / Store answer (HR may answer on behalf) and the final HR approval.
  // NoDue / Due = answer for the section; 'Cleared' = Admin/HR accepts a Due that came in;
  // 'Approved' (section 'hr') = final HR approval.
  const respond = async (section, status) => {
    const a = answer[section] || {};
    if (status === 'Due' && !(Number(a.amount) > 0)) { toast.error('Enter the due amount'); return; }
    setSubmitting(true);
    try {
      const res = await resignationApi.noDuesRespond(selectedRow.id, section, {
        status, amount: status === 'Due' ? Number(a.amount) : null, remark: section === 'hr' ? clearanceRemark : a.remark || '',
      });
      toast.success(res.message || 'Saved');
      setAnswer((x) => ({ ...x, [section]: {} }));
      if (section === 'hr') setSelectedRow(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckboxChange = (field) => {
    setChecklist((prev) => ({
      ...prev,
      [field]: !prev[field],
      // If unchecking handover, clear the employee ID
      ...(field === 'handover' && prev.handover ? { handoverEmployeeId: '', handoverStatus: 'Not Prompted' } : {}),
    }));
  };

  const handleEmployeeSelect = (e) => {
    setChecklist((prev) => ({
      ...prev,
      handoverEmployeeId: e.target.value,
      handoverStatus: e.target.value === 'none' ? 'Approved' : 'Not Prompted',
      handover: e.target.value === 'none',
    }));
  };

  const promptHOD = async () => {
    if (!checklist.handoverEmployeeId) {
      toast.error('Please select an employee first');
      return;
    }
    if (!selectedRow) return;

    setSubmitting(true);
    try {
      const handoverEmp = allEmployees.find(emp => String(emp.id) === String(checklist.handoverEmployeeId));
      const updatedChecklist = {
        ...checklist,
        handoverStatus: 'Pending HOD',
        handover: false,
        handoverEmployeeName: handoverEmp ? handoverEmp.candidateName : (checklist.handoverEmployeeId === 'none' ? 'No task handover needed' : ''),
        handoverEmployeeCode: handoverEmp ? handoverEmp.employeeCode : '',
      };

      await resignationApi.update(selectedRow.id, {
        stage: 'Clearance',
        clearanceChecklist: updatedChecklist,
        clearanceRemark: clearanceRemark || null,
      });

      setChecklist(updatedChecklist);
      toast.success('Task handover request sent to HOD!');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to request HOD confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmHandover = async (row, isDone) => {
    try {
      const currentChecklist = row.clearanceChecklist || {};
      const updatedChecklist = {
        ...currentChecklist,
        handover: isDone,
        handoverStatus: isDone ? 'Approved' : 'Rejected',
      };
      
      await resignationApi.update(row.id, {
        clearanceChecklist: updatedChecklist,
      });

      toast.success(isDone ? 'Task handover approved!' : 'Task handover marked as rejected.');
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update task handover');
    }
  };

  const saveClearance = async (isComplete = false) => {
    if (isComplete && checklist.handoverStatus !== 'Approved') {
      toast.error('Cannot complete clearance until Task Handover is approved by HOD');
      return;
    }

    setSubmitting(true);
    try {
      const stage = isComplete ? 'Settlement' : 'Clearance';
      
      // Look up selected employee details to store in checklist JSON
      const handoverEmp = allEmployees.find(emp => String(emp.id) === String(checklist.handoverEmployeeId));
      const updatedChecklist = {
        ...checklist,
        handoverEmployeeName: handoverEmp ? handoverEmp.candidateName : (checklist.handoverEmployeeId === 'none' ? 'No task handover needed' : ''),
        handoverEmployeeCode: handoverEmp ? handoverEmp.employeeCode : '',
      };

      await resignationApi.update(selectedRow.id, {
        stage,
        clearanceChecklist: updatedChecklist,
        clearanceRemark: clearanceRemark || null,
      });

      toast.success(isComplete ? 'Clearance completed! Moved to Settlement.' : 'Clearance progress saved successfully.');
      setSelectedRow(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update clearance');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter rows:
  // Pending Clearance: Left, Clearance or handoverStatus !== 'Approved'
  // Cleared History: Settlement, Relieved AND handoverStatus === 'Approved'
  const visibleRows = rows.filter((r) => {
    const cl = r.clearanceChecklist || {};
    const isHandoverApproved = cl.handoverStatus === 'Approved' || cl.handover === true;

    if (isPureHOD || user?.role === 'hod') {
      return ['Left', 'Clearance'].includes(r.stage) || !isHandoverApproved;
    }

    if (activeTab === 'pending') return ['Left', 'Clearance'].includes(r.stage);
    return ['Settlement', 'Relieved'].includes(r.stage);
  });

  const leftEmployeeIds = new Set(
    rows
      .filter((r) => ['Left', 'Clearance', 'Settlement', 'Relieved'].includes(r.stage))
      .map((r) => r.jobApplicationId)
  );

  // Get employees of the same department only (excluding the leaving employee themselves and already left tagged employees)
  const sameDeptEmployees = selectedRow
    ? allEmployees.filter(
        (emp) =>
          Number(emp.departmentId) === Number(selectedRow.departmentId) &&
          Number(emp.id) !== Number(selectedRow.jobApplicationId) &&
          !leftEmployeeIds.has(emp.id)
      )
    : [];

  // HR can give the final approval once every other section has answered.
  const isFormFullyChecked = !!selectedRow && handoverStatusOf(selectedRow.clearanceChecklist) === 'Approved'
    && ['canteen', 'store', 'accounts'].every((s) => isSectionDone(noDuesOf(selectedRow.clearanceChecklist)[s]));

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header Card */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6 bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">
                {isPureHOD || user?.role === 'hod' ? 'Task Handover Approvals' : NO_DUES_STAGE_LABEL}
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                {isPureHOD || user?.role === 'hod'
                  ? 'Confirm task handover completion for department employees'
                  : 'After the last working day: Department (HOD), Canteen, Store and Accounts give No Due / Due, then HR approves → F&F Settlement'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
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

      {/* Tabs & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              <UserX size={16} className="inline mr-2" />
              {isPureHOD || user?.role === 'hod' ? 'Task Handover Approvals' : 'Pending'} ({
                rows.filter((r) => {
                  const cl = r.clearanceChecklist || {};
                  if (isPureHOD || user?.role === 'hod') return ['Left', 'Clearance'].includes(r.stage) || (cl.handoverStatus !== 'Approved' && !cl.handover);
                  return ['Left', 'Clearance'].includes(r.stage);
                }).length
              })
            </button>
            {!isPureHOD && user?.role !== 'hod' && (
              <button
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'cleared'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('cleared')}
              >
                <CheckCircle size={16} className="inline mr-2" />
                Cleared ({rows.filter((r) => ['Settlement', 'Relieved'].includes(r.stage)).length})
              </button>
            )}
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-6 py-3 text-left">Designation</th>
                <th className="px-6 py-3 text-left">Last Working Day</th>
                {isPureHOD || user?.role === 'hod' ? (
                  <>
                    <th className="px-6 py-3 text-left">Handover Assigned To</th>
                    <th className="px-6 py-3 text-left">Handover Status</th>
                    <th className="px-6 py-3 text-center">Confirm Handover Done?</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left">Department (HOD)</th>
                    <th className="px-4 py-3 text-left">Canteen</th>
                    <th className="px-4 py-3 text-left">Store</th>
                    <th className="px-4 py-3 text-left">Accounts</th>
                    <th className="px-4 py-3 text-left">HR</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <span className="text-sm font-semibold">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'pending' ? 'No pending clearances found.' : 'No completed clearances found.'}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const checklist = row.clearanceChecklist || {};
                  const nd = noDuesOf(checklist);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{row.candidateName}</div>
                        <div className="text-xs text-gray-400 font-mono">{row.employeeCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-800">{row.applyingForPost || '—'}</div>
                        {user?.role !== 'hod' && <div className="text-xs text-gray-400">{row.vacancyNumber}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(row.lastWorkingDay)}</td>
                      {isPureHOD || user?.role === 'hod' ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {checklist.handoverEmployeeName || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs font-semibold inline-flex px-2 py-0.5 rounded-full ${
                              checklist.handoverStatus === 'Approved' ? 'bg-green-50 border border-green-200 text-green-700' :
                              checklist.handoverStatus === 'Rejected' ? 'bg-red-50 border border-red-200 text-red-700' :
                              checklist.handoverStatus === 'Pending HOD' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
                              'bg-gray-50 border border-gray-200 text-gray-650'
                            }`}>
                              {checklist.handoverStatus || 'Not Prompted'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {checklist.handoverStatus === 'Pending HOD' ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleConfirmHandover(row, true)}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => handleConfirmHandover(row, false)}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-xs transition-colors cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 font-semibold">—</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <HandoverPill checklist={checklist} />
                            {checklist.handoverEmployeeName && <div className="text-[11px] text-gray-500 mt-0.5">To: {checklist.handoverEmployeeName}</div>}
                          </td>
                          <td className="px-4 py-4"><NoDuesPill entry={nd.canteen} /></td>
                          <td className="px-4 py-4"><NoDuesPill entry={nd.store} /></td>
                          <td className="px-4 py-4"><NoDuesPill entry={nd.accounts} /></td>
                          <td className="px-4 py-4">{['Settlement', 'Relieved'].includes(row.stage) ? <NoDuesPill entry={{ ...nd.hr, status: 'Approved' }} /> : <NoDuesPill entry={nd.hr} />}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => openClearanceModal(row)}
                              className="inline-flex items-center gap-1 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold rounded-xl text-xs transition-colors"
                            >
                              <ClipboardCheck size={13} />
                              {activeTab === 'pending' ? 'Open' : 'View'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clearance Modal */}
      {selectedRow && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-indigo-50/20">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{NO_DUES_STAGE_LABEL}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedRow.candidateName} · {selectedRow.employeeCode}</p>
              </div>
              <button onClick={() => setSelectedRow(null)} className="text-gray-500 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
              {/* Task Handover Checklist */}
              <div className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    disabled
                    checked={checklist.handoverStatus === 'Approved'}
                    className="h-5 w-5 rounded border-gray-300 text-indigo-600 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-800">Task Handover Completed</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        checklist.handoverStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                        checklist.handoverStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                        checklist.handoverStatus === 'Pending HOD' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-105 text-gray-500'
                      }`}>
                        {checklist.handoverStatus || 'Not Prompted'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Assign a team member. Task handover must be approved by their department HOD.</p>
                  </div>
                </div>

                <div className="pt-2 pl-8 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-indigo-600 mb-1">Handover Employee (Same Department) *</label>
                  <div className="flex gap-2">
                    <select
                      disabled={activeTab === 'cleared' || checklist.handoverStatus === 'Approved'}
                      value={checklist.handoverEmployeeId}
                      onChange={handleEmployeeSelect}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select an employee...</option>
                      <option value="none">No task handover needed</option>
                      {sameDeptEmployees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.candidateName} ({emp.employeeCode || emp.applicationNumber})
                        </option>
                      ))}
                    </select>
                    {checklist.handoverEmployeeId && checklist.handoverEmployeeId !== 'none' && checklist.handoverStatus !== 'Approved' && checklist.handoverStatus !== 'Pending HOD' && (
                      <button
                        type="button"
                        onClick={promptHOD}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                      >
                        Prompt HOD
                      </button>
                    )}
                  </div>
                  {sameDeptEmployees.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> No other active employees in this department.
                    </p>
                  )}
                </div>
              </div>

              {/* Canteen / Store / Accounts — answered by those teams; HR can answer here too,
                  and a Due that came in is completed by Admin/HR with "No Due" (marks it Cleared). */}
              {['canteen', 'store', 'accounts'].map((section) => {
                const e = noDuesOf(selectedRow.clearanceChecklist)[section];
                const a = answer[section] || {};
                const editable = activeTab === 'pending' && (e.status === 'Pending' || e.status === 'Due');
                const setA = (patch) => setAnswer((x) => ({ ...x, [section]: { ...(x[section] || {}), ...patch } }));
                return (
                  <div key={section} className="p-3.5 rounded-xl border border-gray-200 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-800">{SECTION_LABEL[section]}</span>
                      <NoDuesPill entry={{ ...e, remark: null }} />
                    </div>
                    {e.status !== 'Pending' && (
                      <div className="text-xs text-gray-600 space-y-0.5">
                        {e.status !== 'NoDue' && <div>Due amount: <b>{inr(e.amount)}</b></div>}
                        {e.remark && <div>Remark: {e.remark}</div>}
                        {e.by && <div className="text-gray-400">by {e.by} · {fmtDate(e.at)}</div>}
                        {e.status === 'Cleared' && <div className="text-green-700">Done by {e.clearedBy} · {fmtDate(e.clearedAt)}</div>}
                      </div>
                    )}
                    {section === 'store' && e.status === 'Pending' && (
                      storeItems.loading ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Checking Store…</p>
                      ) : storeItems.unavailable ? (
                        <p className="text-xs text-amber-600">Could not reach Store — check items returned and answer manually.</p>
                      ) : storeItems.data.length === 0 ? (
                        <p className="text-xs text-gray-500">No accessories ever issued to this employee from Store.</p>
                      ) : (
                        <div className="text-xs space-y-2">
                          {storeItems.data.filter((it) => it.status !== 'Closed').length > 0 && (
                            <div className="space-y-1">
                              <p className="text-red-700 font-medium">Not yet returned (from Employee Loan Tracker):</p>
                              <ul className="list-disc list-inside text-gray-700">
                                {storeItems.data.filter((it) => it.status !== 'Closed').map((it, i) => (
                                  <li key={i}>{it.productName} — {it.remaining} {it.uom} pending (issued {fmtDate(it.issuedAt)})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {storeItems.data.filter((it) => it.status === 'Closed').length > 0 && (
                            <div className="space-y-1">
                              <p className="text-green-700 font-medium">Already returned:</p>
                              <ul className="list-disc list-inside text-gray-600">
                                {storeItems.data.filter((it) => it.status === 'Closed').map((it, i) => (
                                  <li key={i}>
                                    {it.productName} x{it.issuedQuantity} — returned {it.returnedAt ? new Date(it.returnedAt).toLocaleString() : ''}
                                    {it.returnRemarks && <span className="italic"> ("{it.returnRemarks}")</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {storeItems.data.every((it) => it.status === 'Closed') && (
                            <p className="text-green-700">Everything issued has been returned.</p>
                          )}
                        </div>
                      )
                    )}
                    {editable && e.status === 'Pending' && section !== 'store' && (
                      <p className="text-xs text-gray-500">
                        {`Waiting for ${section === 'canteen' ? 'the canteen manager (Canteen page → No Dues Requests)' : 'accounts (EMI Management → No Dues Requests)'}. HR can also answer here.`}
                      </p>
                    )}
                    {editable && e.status === 'Due' && <p className="text-xs text-amber-700">Due received — check it, then click No Due to mark it done.</p>}
                    {editable && (!a.due ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={submitting} onClick={() => respond(section, e.status === 'Due' ? 'Cleared' : 'NoDue')}
                          className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-60">No Due</button>
                        {e.status === 'Pending' && (
                          <button type="button" disabled={submitting} onClick={() => setA({ due: true })}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold">Has Due</button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <input type="number" min="1" value={a.amount || ''} onChange={(ev) => setA({ amount: ev.target.value })} placeholder="Amount ₹" className="w-28 px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
                        <input value={a.remark || ''} onChange={(ev) => setA({ remark: ev.target.value })} placeholder="Remark" className="flex-1 min-w-[120px] px-2 py-1.5 rounded-lg border border-gray-300 text-sm" />
                        <button type="button" disabled={submitting} onClick={() => respond(section, 'Due')} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60">Send Due</button>
                        <button type="button" onClick={() => setA({ due: false })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Remark */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Clearance Remarks</label>
                <textarea
                  disabled={activeTab === 'cleared'}
                  rows={2}
                  value={clearanceRemark}
                  onChange={(e) => setClearanceRemark(e.target.value)}
                  placeholder="Notes about pending items, handover details, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setSelectedRow(null)}
                className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
              
              {activeTab === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => saveClearance(false)}
                    className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl transition-colors"
                  >
                    Save Handover / Remark
                  </button>
                  <button
                    type="button"
                    disabled={submitting || !isFormFullyChecked}
                    onClick={() => respond('hr', 'Approved')}
                    className={`px-5 py-2.5 text-white font-semibold rounded-xl transition-all duration-150 flex items-center gap-1.5 ${
                      isFormFullyChecked && !submitting
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-150'
                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                    }`}
                    title={!isFormFullyChecked ? 'Waiting for Department (HOD), Canteen, Store and Accounts (a Due must be marked Cleared)' : 'HR approval: complete No Dues Clearance and move to F&F Settlement'}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check size={16} />}
                    HR Approve → F&F
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Leaving;
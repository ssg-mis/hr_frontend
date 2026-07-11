import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ClipboardCheck, CheckCircle, X, Wallet, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { resignationApi } from '../features/resignation/resignation.api';
import { employeeApi } from '../features/employee/employee.api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const stageBadge = (stage) => {
  const style = {
    Left: 'bg-red-50 text-red-700 border border-red-200',
    Clearance: 'bg-purple-50 text-purple-700 border border-purple-200',
    Settlement: 'bg-amber-55 text-amber-800 border border-amber-200',
    Relieved: 'bg-green-50 text-green-700 border border-green-200',
  }[stage] || 'bg-gray-50 text-gray-700 border border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{stage}</span>;
};

const AfterLeavingWork = () => {
  const [activeTab, setActiveTab] = useState('progress');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Full & Final Settlement modal
  const [settling, setSettling] = useState(null); // resignation row
  const [settlementForm, setSettlementForm] = useState({
    pendingSalary: '', bonus: '', advanceDeduction: '', canteenDues: '', finalSettlementAmount: '', settlementRemark: '',
  });

  // Clearance modal
  const [clearing, setClearing] = useState(null); // resignation row being cleared
  const [checklist, setChecklist] = useState({
    assetClearance: false,
    departmentClearance: false,
    handover: false,
    handoverEmployeeId: '',
  });
  const [clearanceRemark, setClearanceRemark] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [resRes, empRes] = await Promise.all([
        resignationApi.list({ search: searchTerm, stage: 'Left,Clearance,Settlement,Relieved' }),
        employeeApi.list(),
      ]);
      setRows(resRes.data || []);
      setAllEmployees(empRes.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load after-leaving-work data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openSettlement = (row) => {
    setSettlementForm({
      pendingSalary: row.pendingSalary || '',
      bonus: row.bonus || '',
      advanceDeduction: row.advanceDeduction || '',
      canteenDues: row.canteenDues || '',
      finalSettlementAmount: row.finalSettlementAmount || '',
      settlementRemark: row.settlementRemark || '',
    });
    setSettling(row);
  };

  const openClearanceModal = (row) => {
    setClearing(row);
    const savedChecklist = row.clearanceChecklist || {};
    setChecklist({
      assetClearance: !!savedChecklist.assetClearance,
      departmentClearance: !!savedChecklist.departmentClearance,
      handover: !!savedChecklist.handover,
      handoverEmployeeId: savedChecklist.handoverEmployeeId || '',
    });
    setClearanceRemark(row.clearanceRemark || '');
  };

  const saveClearance = async (isComplete = false) => {
    if (checklist.handover && !checklist.handoverEmployeeId) {
      toast.error('Please select an employee for task handover');
      return;
    }

    setSubmitting(true);
    try {
      const stage = isComplete ? 'Settlement' : 'Clearance';
      
      const handoverEmp = allEmployees.find(emp => String(emp.id) === String(checklist.handoverEmployeeId));
      const updatedChecklist = {
        ...checklist,
        handoverEmployeeName: handoverEmp ? handoverEmp.candidateName : (checklist.handoverEmployeeId === 'none' ? 'No task handover needed' : ''),
        handoverEmployeeCode: handoverEmp ? handoverEmp.employeeCode : '',
      };

      await resignationApi.update(clearing.id, {
        stage,
        clearanceChecklist: updatedChecklist,
        clearanceRemark: clearanceRemark || null,
      });

      toast.success(isComplete ? 'Clearance completed! Moved to Settlement.' : 'Clearance progress saved successfully.');
      setClearing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update clearance');
    } finally {
      setSubmitting(false);
    }
  };

  const sanitizeNumeric = (val, allowNegative = false) => {
    let cleaned = val;
    if (allowNegative) {
      cleaned = val.replace(/[^0-9.-]/g, '');
      if (cleaned.startsWith('-')) {
        cleaned = '-' + cleaned.slice(1).replace(/-/g, '');
      } else {
        cleaned = cleaned.replace(/-/g, '');
      }
    } else {
      cleaned = val.replace(/[^0-9.]/g, '');
    }
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const calculateFinalSettlement = (form) => {
    const pending = parseFloat(form.pendingSalary) || 0;
    const bonus = parseFloat(form.bonus) || 0;
    const loan = parseFloat(form.advanceDeduction) || 0;
    const canteen = parseFloat(form.canteenDues) || 0;
    const total = pending + bonus - (loan + canteen);
    return Number(total.toFixed(2)).toString();
  };

  const handleSettlementChange = (e) => {
    const { name, value } = e.target;
    const allowNegative = name === 'finalSettlementAmount';
    
    let sanitizedValue = value;
    if (['pendingSalary', 'bonus', 'advanceDeduction', 'canteenDues', 'finalSettlementAmount'].includes(name)) {
      sanitizedValue = sanitizeNumeric(value, allowNegative);
    }
    
    setSettlementForm((prev) => {
      const updated = { ...prev, [name]: sanitizedValue };
      if (['pendingSalary', 'bonus', 'advanceDeduction', 'canteenDues'].includes(name)) {
        updated.finalSettlementAmount = calculateFinalSettlement(updated);
      }
      return updated;
    });
  };

  const saveSettlement = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(settling.id, {
        stage: 'Settlement',
        ...settlementForm,
      });
      toast.success('Settlement details saved');
      setSettling(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save settlement details');
    } finally {
      setSubmitting(false);
    }
  };

  const markRelieved = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(settling.id, {
        stage: 'Relieved',
        ...settlementForm,
      });
      toast.success('Employee relieved — full & final settlement complete');
      setSettling(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to mark as relieved');
    } finally {
      setSubmitting(false);
    }
  };

  const leftEmployeeIds = new Set(
    rows
      .filter((r) => ['Left', 'Clearance', 'Settlement', 'Relieved'].includes(r.stage))
      .map((r) => r.jobApplicationId)
  );

  const sameDeptEmployees = clearing
    ? allEmployees.filter(
        (emp) =>
          Number(emp.departmentId) === Number(clearing.departmentId) &&
          Number(emp.id) !== Number(clearing.employeeId || clearing.jobApplicationId) &&
          !leftEmployeeIds.has(emp.id) &&
          emp.status === 'Active'
      )
    : [];

  const isFormFullyChecked = checklist.assetClearance && checklist.departmentClearance && checklist.handover && checklist.handoverEmployeeId;

  const rows_ = rows.filter((r) => (activeTab === 'progress' ? ['Left', 'Clearance', 'Settlement'].includes(r.stage) : r.stage === 'Relieved'));

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">After Leaving Work</h2>
            <p className="mt-0.5 text-sm text-gray-500">Full &amp; final settlement of left employees</p>
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
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'progress' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('progress')}
            >
              <ClipboardCheck size={16} className="inline mr-2" />
              In Progress ({rows.filter((r) => ['Left', 'Clearance', 'Settlement'].includes(r.stage)).length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'relieved' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('relieved')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Relieved ({rows.filter((r) => r.stage === 'Relieved').length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Last Working Day</th>
                <th className="px-6 py-3 text-left">Stage</th>
                {activeTab === 'progress' ? (
                  <th className="px-6 py-3 text-center">Action</th>
                ) : (
                  <th className="px-6 py-3 text-left">Final Settlement</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows_.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'progress' ? 'No one is in the after-leaving-work pipeline.' : 'No employees relieved yet.'}
                  </td>
                </tr>
              ) : (
                rows_.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{r.candidateName}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.employeeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{r.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{r.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(r.lastWorkingDay)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{stageBadge(r.stage)}</td>
                    {activeTab === 'progress' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openClearanceModal(r)} className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-purple-200 text-purple-700 hover:bg-purple-50 rounded-lg text-xs font-semibold transition-colors">
                            Clearance
                          </button>
                          <button onClick={() => openSettlement(r)} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <Wallet size={13} /> F&amp;F Settlement
                          </button>
                        </div>
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{r.finalSettlementAmount || '—'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full & Final Settlement modal */}
      {settling && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Full &amp; Final Settlement</h3>
                <p className="text-sm text-gray-500 mt-0.5">{settling.candidateName} · {settling.employeeCode}</p>
              </div>
              <button onClick={() => setSettling(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pending Salary</label>
                  <input type="text" name="pendingSalary" value={settlementForm.pendingSalary} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bonus</label>
                  <input type="text" name="bonus" value={settlementForm.bonus} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Advance / Loan Deduction</label>
                  <input type="text" name="advanceDeduction" value={settlementForm.advanceDeduction} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Canteen Dues</label>
                  <input type="text" name="canteenDues" value={settlementForm.canteenDues} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Final Settlement Amount</label>
                <input type="text" name="finalSettlementAmount" value={settlementForm.finalSettlementAmount} onChange={handleSettlementChange} placeholder="Net amount payable/recoverable" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remark</label>
                <textarea name="settlementRemark" rows={2} value={settlementForm.settlementRemark} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setSettling(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={saveSettlement} disabled={submitting} className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl">Save</button>
              <button type="button" onClick={markRelieved} disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center min-h-[42px]">{submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Mark Relieved'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Clearance modal */}
      {clearing && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Exit Clearance Management</h3>
                <p className="text-sm text-gray-500 mt-0.5">{clearing.candidateName} · {clearing.employeeCode}</p>
              </div>
              <button onClick={() => setClearing(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
              {clearing.reason && (
                <div className="bg-red-50 p-3.5 rounded-xl border border-red-100">
                  <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Resignation Reason</span>
                  <p className="text-xs text-red-900 font-medium leading-relaxed mt-1">{clearing.reason}</p>
                </div>
              )}

              {/* Clearance Checklist */}
              <div className="space-y-4">
                <span className="block text-sm font-semibold text-gray-700">Clearance Checklist</span>
                
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-gray-250 bg-white cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <input type="checkbox" checked={checklist.assetClearance} onChange={() => setChecklist(prev => ({ ...prev, assetClearance: !prev.assetClearance }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Asset Clearance</span>
                    <p className="text-[10px] text-gray-500">Laptop, keys, badge collected</p>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-gray-250 bg-white cursor-pointer hover:bg-gray-50/50 transition-colors">
                  <input type="checkbox" checked={checklist.departmentClearance} onChange={() => setChecklist(prev => ({ ...prev, departmentClearance: !prev.departmentClearance }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-gray-800">Department Clearance</span>
                    <p className="text-[10px] text-gray-500">No pending projects/tasks</p>
                  </div>
                </label>

                <div className="p-3.5 rounded-xl border border-gray-250 bg-white space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={checklist.handover} onChange={() => setChecklist(prev => ({ ...prev, handover: !prev.handover, handoverEmployeeId: prev.handover ? '' : prev.handoverEmployeeId }))} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-gray-800">Task Handover</span>
                      <p className="text-[10px] text-gray-500">Knowledge transfer completed</p>
                    </div>
                  </label>
                  
                  {checklist.handover && (
                    <div className="pl-6 pt-1">
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Handover Employee</label>
                      <select value={checklist.handoverEmployeeId} onChange={(e) => setChecklist(prev => ({ ...prev, handoverEmployeeId: e.target.value }))} className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="">-- Choose Employee --</option>
                        <option value="none">No task handover needed</option>
                        {sameDeptEmployees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.candidateName} ({emp.employeeCode})
                          </option>
                        ))}
                      </select>
                      {sameDeptEmployees.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-1">No other active employees in this department.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remark</label>
                <textarea rows={2} value={clearanceRemark} onChange={(e) => setClearanceRemark(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setClearing(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={() => saveClearance(false)} disabled={submitting} className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl">Save Progress</button>
              <button type="button" onClick={() => saveClearance(true)} disabled={submitting || !isFormFullyChecked} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl">Submit Clearance</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AfterLeavingWork;

import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, X, ArrowUpRight, History, ShieldAlert, Users, Percent, IndianRupee, Layers, CheckSquare, Gift, CreditCard, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const SalaryManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('active-salaries'); // 'active-salaries' | 'requests' | 'history'
  const [requestsFilter, setRequestsFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [dialogError, setDialogError] = useState('');
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showWeekOffModal, setShowWeekOffModal] = useState(false);
  const [selectedWeekOffEmp, setSelectedWeekOffEmp] = useState(null);
  const [tempWeekOffs, setTempWeekOffs] = useState([]);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [advanceRecoveries, setAdvanceRecoveries] = useState([]);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showRecordRecoveryModal, setShowRecordRecoveryModal] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: '',
    amount: '',
    reason: '',
    recoveryOption: 'Installment',
    installmentCount: '3',
    monthlyDeduction: '0.00',
  });
  const [recoveryForm, setRecoveryForm] = useState({
    amount: '',
    recoveryMethod: 'Salary Deduction',
    remarks: '',
  });
  const [advanceTabMode, setAdvanceTabMode] = useState('requests');
  
  const [salaries, setSalaries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  
  // Forms state
  const [empForm, setEmpForm] = useState({
    employeeId: '',
    proposedBaseSalary: '',
    proposedAllowanceSalary: '',
  });
  
  const [deptForm, setDeptForm] = useState({
    departmentId: '',
    incrementType: 'percent', // 'percent' | 'flat'
    percent: '10',
    flatBase: '',
    flatAllowance: '',
  });

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSalaries(),
        fetchRequests(),
        fetchHistory(),
        fetchDepartments(),
        fetchCalendarEvents(),
        fetchAdvanceRequests(),
        fetchAdvanceRecoveries(),
      ]);
    } catch (error) {
      console.error("Error loading salary data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvanceRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/advances`);
      const result = await res.json();
      if (result.success) {
        setAdvanceRequests(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching advance requests:", err);
    }
  };

  const fetchAdvanceRecoveries = async () => {
    try {
      const res = await fetch(`${API_URL}/advances/recoveries`);
      const result = await res.json();
      if (result.success) {
        setAdvanceRecoveries(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching advance recoveries:", err);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/calendar`);
      const result = await res.json();
      if (result.success) {
        setCalendarEvents(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fetchSalaries = async () => {
    const res = await fetch(`${API_URL}/salaries`);
    const result = await res.json();
    if (result.success) {
      setSalaries(result.data);
    }
  };

  const fetchRequests = async () => {
    const res = await fetch(`${API_URL}/salaries/requests`);
    const result = await res.json();
    if (result.success) {
      setRequests(result.data);
    }
  };

  const fetchHistory = async () => {
    const res = await fetch(`${API_URL}/salaries/history`);
    const result = await res.json();
    if (result.success) {
      setHistory(result.data);
    }
  };

  const fetchDepartments = async () => {
    const res = await fetch(`${API_URL}/departments`);
    const result = await res.json();
    if (result.success) {
      setDepartments(result.data);
    }
  };

  // Create individual request
  const handleCreateEmpRequest = async (e) => {
    e.preventDefault();
    if (!empForm.employeeId || !empForm.proposedBaseSalary || !empForm.proposedAllowanceSalary) {
      toast.error("Please fill in all fields.");
      return;
    }

    const activeSalaryRecord = salaries.find(s => s.employeeId === Number(empForm.employeeId));
    if (activeSalaryRecord) {
      const isBaseUnchanged = Number(empForm.proposedBaseSalary).toFixed(2) === Number(activeSalaryRecord.baseSalary).toFixed(2);
      const isAllowanceUnchanged = Number(empForm.proposedAllowanceSalary).toFixed(2) === Number(activeSalaryRecord.allowanceSalary).toFixed(2);
      if (isBaseUnchanged && isAllowanceUnchanged) {
        setDialogError("Nothing is changed");
        return;
      }
    }

    try {
      const res = await fetch(`${API_URL}/salaries/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: "Employee",
          employeeId: empForm.employeeId,
          proposedBaseSalary: empForm.proposedBaseSalary,
          proposedAllowanceSalary: empForm.proposedAllowanceSalary,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Salary request created successfully!");
        setShowEmpModal(false);
        setEmpForm({ employeeId: '', proposedBaseSalary: '', proposedAllowanceSalary: '' });
        fetchRequests();
      } else {
        toast.error(result.message || "Failed to create request");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  // Create department-wide request
  const handleCreateDeptRequest = async (e) => {
    e.preventDefault();
    if (!deptForm.departmentId) {
      toast.error("Please select a department.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/salaries/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: "Department",
          departmentId: deptForm.departmentId,
          incrementType: deptForm.incrementType,
          percent: deptForm.percent ? Number(deptForm.percent) : undefined,
          flatBase: deptForm.flatBase ? Number(deptForm.flatBase) : undefined,
          flatAllowance: deptForm.flatAllowance ? Number(deptForm.flatAllowance) : undefined,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Successfully created salary requests for ${result.count || 0} employees!`);
        setShowDeptModal(false);
        setDeptForm({ departmentId: '', incrementType: 'percent', percent: '10', flatBase: '', flatAllowance: '' });
        fetchRequests();
      } else {
        toast.error(result.message || "Failed to create department request");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  // Trigger quick 10% auto-increase request
  const triggerQuickAutoIncrease = async (employee) => {
    const curBase = Number(employee.baseSalary);
    const curAllowance = Number(employee.allowanceSalary);
    const newBase = (curBase * 1.1).toFixed(2);
    const newAllowance = (curAllowance * 1.1).toFixed(2);

    try {
      const res = await fetch(`${API_URL}/salaries/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeType: "Employee",
          employeeId: employee.employeeId,
          proposedBaseSalary: newBase,
          proposedAllowanceSalary: newAllowance,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`10% auto-increase request submitted for ${employee.employeeName}`);
        fetchRequests();
      } else {
        toast.error(result.message || "Failed to submit request");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  // Open manual change modal for single employee
  const openManualChange = (employee) => {
    setSelectedEmp(employee);
    setEmpForm({
      employeeId: employee.employeeId,
      proposedBaseSalary: employee.baseSalary,
      proposedAllowanceSalary: employee.allowanceSalary,
    });
    setDialogError('');
    setShowEmpModal(true);
  };

  // Process approval workflow (HR / HOD)
  const processWorkflowAction = async (requestId, nextStatus) => {
    try {
      const res = await fetch(`${API_URL}/salaries/request/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Request status updated to ${nextStatus}`);
        fetchRequests();
        fetchSalaries();
        fetchHistory();
      } else {
        toast.error(result.message || "Action failed");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  // Filter salaries by search term
  const filteredSalaries = salaries.filter(s => 
    s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter requests by workflow filter
  const filteredRequests = requests.filter(r => {
    if (requestsFilter === 'all') return true;
    if (requestsFilter === 'pending') return r.status === 'Pending HR' || r.status === 'Pending HOD';
    if (requestsFilter === 'approved') return r.status === 'Approved';
    if (requestsFilter === 'rejected') return r.status === 'Rejected';
    return true;
  });

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      
      {/* Upper Navigation / Actions Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IndianRupee className="text-indigo-600 w-7 h-7" />
            <span>Salary Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage active payroll salaries, automate updates, and run approval workflows.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setSelectedEmp(null);
              setEmpForm({ employeeId: '', proposedBaseSalary: '', proposedAllowanceSalary: '' });
              setDialogError('');
              setShowEmpModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm shadow-indigo-100"
          >
            <Plus size={18} />
            <span>Employee-wise Increment</span>
          </button>
          
          <button
            onClick={() => setShowDeptModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-sm shadow-emerald-100"
          >
            <Layers size={18} />
            <span>Department-wise Increment</span>
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('active-salaries')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px ${
            activeSubTab === 'active-salaries' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Active Salaries
        </button>
        
        <button
          onClick={() => setActiveSubTab('requests')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === 'requests' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>Approval Requests</span>
          {requests.filter(r => r.status === 'Pending HR' || r.status === 'Pending HOD').length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {requests.filter(r => r.status === 'Pending HR' || r.status === 'Pending HOD').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === 'history' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History size={16} />
          <span>Previous Records (Logs)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('bonus')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === 'bonus' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Gift size={16} />
          <span>Bonus Calculations</span>
        </button>

        <button
          onClick={() => setActiveSubTab('advance-management')}
          className={`pb-4 px-6 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
            activeSubTab === 'advance-management' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard size={16} />
          <span>Advance Management</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeSubTab === 'active-salaries' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by Employee Code or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredSalaries.length} of {salaries.length} Active Employees
            </div>
          </div>

          {/* Salaries Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Allowance Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Salary</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-3"></div>
                        <span>Loading salaries data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                      No active employees found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map((emp) => {
                    const totalSalary = Number(emp.baseSalary) + Number(emp.allowanceSalary);
                    return (
                      <tr key={emp.employeeId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">{emp.employeeCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{emp.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{emp.departmentName || "Unassigned"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-700">₹{Number(emp.baseSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-700">₹{Number(emp.allowanceSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-600">₹{totalSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openManualChange(emp)}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-650 rounded-lg hover:bg-indigo-100 text-xs font-semibold transition-all"
                            >
                              Change Manually
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Requests Status Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'pending', label: 'Pending Approvals' },
              { id: 'approved', label: 'Approved Requests' },
              { id: 'rejected', label: 'Rejected Requests' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRequestsFilter(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  requestsFilter === tab.id
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Change Type</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Base/Allowance</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Proposed Base/Allowance</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Request Date</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Approvals</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                        No requests found matching the selection filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const curTotal = Number(req.currentBaseSalary) + Number(req.currentAllowanceSalary);
                      const propTotal = Number(req.proposedBaseSalary) + Number(req.proposedAllowanceSalary);
                      const diff = propTotal - curTotal;
                      const percentDiff = curTotal > 0 ? (diff / curTotal) * 100 : 0;
                      
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{req.employeeName}</p>
                              <p className="text-xs text-slate-500 font-medium">{req.employeeCode}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              req.changeType === 'Department' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-blue-50 text-blue-700'
                            }`}>
                              {req.changeType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-xs font-semibold text-slate-600">Base: ₹{Number(req.currentBaseSalary).toLocaleString('en-IN')}</div>
                            <div className="text-xs text-slate-400">All: ₹{Number(req.currentAllowanceSalary).toLocaleString('en-IN')}</div>
                            <div className="text-xs font-bold text-slate-500 mt-0.5">Total: ₹{curTotal.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-xs font-semibold text-slate-800">Base: ₹{Number(req.proposedBaseSalary).toLocaleString('en-IN')}</div>
                            <div className="text-xs text-slate-500">All: ₹{Number(req.proposedAllowanceSalary).toLocaleString('en-IN')}</div>
                            <div className="text-xs font-bold text-indigo-600 mt-0.5">Total: ₹{propTotal.toLocaleString('en-IN')}</div>
                            <span className="text-[10px] text-emerald-600 font-bold block">+{percentDiff.toFixed(0)}% Increase</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              req.status === 'Pending HR'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : req.status === 'Pending HOD'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : req.status === 'Approved'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                            <div className="flex justify-center gap-1.5">
                              {req.status === 'Pending HR' && (
                                <>
                                  <button
                                    onClick={() => processWorkflowAction(req.id, 'Pending HOD')}
                                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                  >
                                    <Check size={12} />
                                    <span>Approve HR</span>
                                  </button>
                                  <button
                                    onClick={() => processWorkflowAction(req.id, 'Rejected')}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                  >
                                    <X size={12} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              
                              {req.status === 'Pending HOD' && (
                                <>
                                  <button
                                    onClick={() => processWorkflowAction(req.id, 'Approved')}
                                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                  >
                                    <Check size={12} />
                                    <span>Approve HOD</span>
                                  </button>
                                  <button
                                    onClick={() => processWorkflowAction(req.id, 'Rejected')}
                                    className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                                  >
                                    <X size={12} />
                                    <span>Reject</span>
                                  </button>
                                </>
                              )}
                              
                              {(req.status === 'Approved' || req.status === 'Rejected') && (
                                <span className="text-xs text-slate-400 font-medium italic">Workflow Completed</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
              <History className="text-slate-500 w-4 h-4" />
              <span>Historical Salary Log (Approved Changes)</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Base Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Allowance Salary</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Update Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mx-auto"></div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                      No salary history records found.
                    </td>
                  </tr>
                ) : (
                  history.map((record) => {
                    const total = Number(record.baseSalary) + Number(record.allowanceSalary);
                    return (
                      <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700">{record.employeeCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800">{record.employeeName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-700">₹{Number(record.baseSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-700">₹{Number(record.allowanceSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-slate-800">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">{new Date(record.changedAt).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          <div>
                            <span className="font-semibold">{record.changeType}</span>
                            {record.remarks && <span className="text-xs text-slate-400 block font-normal">{record.remarks}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'bonus' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Bonus Payout</span>
              <span className="text-2xl font-bold text-slate-800">
                ₹{salaries.reduce((sum, item) => {
                  const gross = Number(item.baseSalary) + Number(item.allowanceSalary);
                  const present = (item.employeeId * 7) % 40 + 200;
                  const weekOffsDays = (item.weekOffs ? Array.from(new Set([...item.weekOffs.split(',').map(d => d.trim()), 'Sunday'])).length : 1) * 52;
                  const companyHols = calendarEvents.filter(e => e.type === 'holiday').length;
                  const bonus = (gross / 365) * (present + weekOffsDays + companyHols);
                  return sum + bonus;
                }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Company Holidays</span>
              <span className="text-2xl font-bold text-slate-850">
                {calendarEvents.filter(e => e.type === 'holiday').length} Days
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">Fetched from company calendar</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Avg Present Days (Seeded)</span>
              <span className="text-2xl font-bold text-slate-800">
                {salaries.length > 0
                  ? (salaries.reduce((sum, item) => sum + ((item.employeeId * 7) % 40 + 200), 0) / salaries.length).toFixed(1)
                  : 0} Days
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Active Employees</span>
              <span className="text-2xl font-bold text-indigo-650">{salaries.length}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4 max-w-2xl w-full">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search employee by name/code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl w-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const currentCompanyWeekOffs = salaries[0]?.weekOffs || "Sunday";
                    setTempWeekOffs(currentCompanyWeekOffs.split(',').map(d => d.trim()));
                    setShowWeekOffModal(true);
                  }}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-sm shadow-indigo-100 shrink-0"
                >
                  <Gift size={16} />
                  <span>Configure Company Week Offs</span>
                </button>
              </div>
              <div className="text-xs text-slate-450 font-bold uppercase tracking-wider text-right">
                Formula: ((Gross Salary) / 365) * (Present + Week Offs + Holidays)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Salary / Month</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Present Days</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Week Offs (Annual)</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Company Holidays</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Calculated Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalaries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    filteredSalaries.map((item) => {
                      const gross = Number(item.baseSalary) + Number(item.allowanceSalary);
                      const present = (item.employeeId * 7) % 40 + 200;
                      const uniqueWeekOffs = Array.from(new Set([...(item.weekOffs || "Sunday").split(',').map(d => d.trim()), 'Sunday'])).filter(Boolean);
                      const weekOffsDays = uniqueWeekOffs.length * 52;
                      const companyHols = calendarEvents.filter(e => e.type === 'holiday').length;
                      const bonus = (gross / 365) * (present + weekOffsDays + companyHols);

                      const weekdaysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                      const sortedWeekOffs = uniqueWeekOffs.sort((a, b) => weekdaysList.indexOf(a) - weekdaysList.indexOf(b)).join(", ");

                      return (
                        <tr key={item.employeeId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-800">{item.employeeName}</div>
                            <div className="text-xs text-slate-400">{item.employeeCode} • {item.designationName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-slate-700">
                            ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-slate-600">
                            {present}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-semibold text-slate-700">{weekOffsDays} Days</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px] mx-auto" title={sortedWeekOffs}>
                              {sortedWeekOffs}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-slate-600">
                            {companyHols}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-650">
                            ₹{bonus.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'advance-management' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Advances Issued</span>
              <span className="text-2xl font-bold text-slate-800">
                ₹{advanceRequests
                  .filter(r => r.status === 'Approved')
                  .reduce((sum, r) => sum + Number(r.amount), 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Outstanding Balance</span>
              <span className="text-2xl font-bold text-rose-650">
                ₹{advanceRequests
                  .filter(r => r.status === 'Approved')
                  .reduce((sum, r) => sum + (Number(r.amount) - Number(r.totalRecovered)), 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Total Recovered</span>
              <span className="text-2xl font-bold text-emerald-600">
                ₹{advanceRecoveries
                  .reduce((sum, r) => sum + Number(r.amount), 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-1">Pending Approvals</span>
              <span className="text-2xl font-bold text-amber-500">
                {advanceRequests.filter(r => r.status === 'Pending HOD' || r.status === 'Pending HR').length}
              </span>
            </div>
          </div>

          {/* Module Inner Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex gap-2">
              <button
                onClick={() => setAdvanceTabMode('requests')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                  advanceTabMode === 'requests'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={14} />
                <span>Advance Report (Requests)</span>
              </button>
              <button
                onClick={() => setAdvanceTabMode('recoveries')}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                  advanceTabMode === 'recoveries'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <History size={14} />
                <span>Recovery Report (Logs)</span>
              </button>
            </div>
            <button
              onClick={() => {
                setAdvanceForm({
                  employeeId: '',
                  amount: '',
                  reason: '',
                  recoveryOption: 'Installment',
                  installmentCount: '3',
                  monthlyDeduction: '0.00',
                });
                setShowAdvanceModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>Request Advance</span>
            </button>
          </div>

          {/* Tables Section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {advanceTabMode === 'requests' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Advance Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovery Option</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovered / Outstanding</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Date Raised</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500 text-sm">
                          No advance requests raised yet.
                        </td>
                      </tr>
                    ) : (
                      advanceRequests.map((req) => {
                        const amt = Number(req.amount);
                        const rec = Number(req.totalRecovered || 0);
                        const outstanding = amt - rec;
                        const progress = amt > 0 ? (rec / amt) * 100 : 0;

                        return (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-slate-800">{req.employeeName}</div>
                              <div className="text-xs text-slate-400">{req.employeeCode}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-700">
                              ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <span className="font-semibold">{req.recoveryOption}</span>
                              {req.recoveryOption === 'Installment' && (
                                <span className="text-xs text-slate-400 block">{req.installmentCount} Monthly Installments</span>
                              )}
                              {req.recoveryOption === 'Salary Deduction' && (
                                <span className="text-xs text-slate-400 block">Deduct ₹{Number(req.monthlyDeduction).toLocaleString('en-IN')}/mo</span>
                              )}
                              {req.recoveryOption === 'Outstanding Balance' && (
                                <span className="text-xs text-slate-400 block">Deduct total outstanding</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="text-xs font-semibold text-slate-650">
                                Rec: ₹{rec.toLocaleString('en-IN')} / Out: ₹{outstanding.toLocaleString('en-IN')}
                              </div>
                              <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 ml-auto overflow-hidden">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                req.status === 'Pending HOD'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : req.status === 'Pending HR'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : req.status === 'Approved'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-slate-500 font-medium">
                              {new Date(req.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex justify-center gap-1.5">
                                {req.status === 'Pending HOD' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_URL}/advances/${req.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ status: "Pending HR" }),
                                          });
                                          if ((await res.json()).success) {
                                            toast.success("HOD Approved, sent to HR");
                                            fetchAdvanceRequests();
                                          }
                                        } catch (e) { toast.error("Error approving request"); }
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                                    >
                                      <Check size={12} />
                                      <span>Approve HOD</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_URL}/advances/${req.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ status: "Rejected" }),
                                          });
                                          if ((await res.json()).success) {
                                            toast.success("Request Rejected");
                                            fetchAdvanceRequests();
                                          }
                                        } catch (e) { toast.error("Error rejecting request"); }
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                                    >
                                      <X size={12} />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}
                                {req.status === 'Pending HR' && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_URL}/advances/${req.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ status: "Approved" }),
                                          });
                                          if ((await res.json()).success) {
                                            toast.success("HR Approved, advance released!");
                                            fetchAdvanceRequests();
                                          }
                                        } catch (e) { toast.error("Error approving request"); }
                                      }}
                                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                                    >
                                      <Check size={12} />
                                      <span>Approve HR</span>
                                    </button>
                                    <button
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_URL}/advances/${req.id}`, {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ status: "Rejected" }),
                                          });
                                          if ((await res.json()).success) {
                                            toast.success("Request Rejected");
                                            fetchAdvanceRequests();
                                          }
                                        } catch (e) { toast.error("Error rejecting request"); }
                                      }}
                                      className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                                    >
                                      <X size={12} />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                )}
                                {req.status === 'Approved' && outstanding > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedAdvance(req);
                                      setRecoveryForm({
                                        amount: '',
                                        recoveryMethod: 'Salary Deduction',
                                        remarks: '',
                                      });
                                      setShowRecordRecoveryModal(true);
                                    }}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                                  >
                                    <Plus size={12} />
                                    <span>Record Recovery</span>
                                  </button>
                                )}
                                {req.status === 'Approved' && outstanding <= 0 && (
                                  <span className="text-xs text-emerald-650 font-bold">Paid</span>
                                )}
                                {req.status === 'Rejected' && (
                                  <span className="text-xs text-slate-400">Closed</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovery Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount Recovered</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Recovery Method</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {advanceRecoveries.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-sm">
                          No recovery transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      advanceRecoveries.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">
                            {new Date(rec.recoveredAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-slate-800">{rec.employeeName}</div>
                            <div className="text-xs text-slate-400">{rec.employeeCode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-650">
                            ₹{Number(rec.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">
                            {rec.recoveryMethod}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 italic max-w-[200px] truncate" title={rec.remarks}>
                            {rec.remarks || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee-wise Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowEmpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="text-indigo-600 w-5 h-5" />
              <span>{selectedEmp ? `Change Salary - ${selectedEmp.employeeName}` : 'Create Salary Request'}</span>
            </h3>

            <form onSubmit={handleCreateEmpRequest} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {dialogError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Employee</label>
                {selectedEmp ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm font-semibold text-slate-800">
                    {selectedEmp.employeeName} ({selectedEmp.employeeCode})
                  </div>
                ) : (
                  <select
                    value={empForm.employeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = salaries.find(s => s.employeeId === Number(empId));
                      setEmpForm({
                        employeeId: empId,
                        proposedBaseSalary: emp ? emp.baseSalary : '',
                        proposedAllowanceSalary: emp ? emp.allowanceSalary : '',
                      });
                    }}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">-- Choose Employee --</option>
                    {salaries.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {emp.employeeName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Show current salaries if editing */}
              {selectedEmp && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block uppercase font-semibold">Current Base</span>
                    <span className="font-bold text-slate-700">₹{Number(selectedEmp.baseSalary).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-semibold">Current Allowance</span>
                    <span className="font-bold text-slate-700">₹{Number(selectedEmp.allowanceSalary).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Proposed Base Salary</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={empForm.proposedBaseSalary}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, proposedBaseSalary: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Proposed Allowance Salary</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={empForm.proposedAllowanceSalary}
                      onChange={(e) => setEmpForm(prev => ({ ...prev, proposedAllowanceSalary: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department-wise Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowDeptModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Layers className="text-emerald-600 w-5 h-5" />
              <span>Department-wise Increment Request</span>
            </h3>

            <form onSubmit={handleCreateDeptRequest} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Department</label>
                <select
                  value={deptForm.departmentId}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, departmentId: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Increment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeptForm(prev => ({ ...prev, incrementType: 'percent' }))}
                    className={`p-3 border rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${
                      deptForm.incrementType === 'percent'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Percent size={14} />
                    <span>Percentage Increment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeptForm(prev => ({ ...prev, incrementType: 'flat' }))}
                    className={`p-3 border rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-1.5 ${
                      deptForm.incrementType === 'flat'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <IndianRupee size={14} />
                    <span>Flat Amount Increment</span>
                  </button>
                </div>
              </div>

              {deptForm.incrementType === 'percent' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Percentage Increase (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      placeholder="e.g. 10"
                      value={deptForm.percent}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, percent: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-4 top-2 text-sm text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Both base salary and allowance will be increased by this percentage.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Flat Base Salary Add</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={deptForm.flatBase}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, flatBase: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Flat Allowance Add</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={deptForm.flatAllowance}
                        onChange={(e) => setDeptForm(prev => ({ ...prev, flatAllowance: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Submit Department Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Week Offs Configuration Modal */}
      {showWeekOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowWeekOffModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Gift className="text-indigo-650 w-5 h-5" />
              <span>Configure Company-Wide Week Offs</span>
            </h3>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <p className="text-xs text-slate-400">
                Select days of the week to designate as week offs. Sunday is set by company policy and cannot be deselected.
              </p>

              <div className="space-y-2">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                  const isSunday = day === "Sunday";
                  const isChecked = tempWeekOffs.includes(day) || isSunday;

                  return (
                    <label key={day} className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all cursor-pointer ${
                      isSunday ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <span className="font-semibold">{day}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSunday}
                        onChange={(e) => {
                          if (isSunday) return;
                          const checked = e.target.checked;
                          setTempWeekOffs(prev => {
                            if (checked) {
                              return [...prev, day];
                            } else {
                              return prev.filter(d => d !== day);
                            }
                          });
                        }}
                        className={`h-4.5 w-4.5 rounded text-indigo-650 focus:ring-indigo-500 ${isSunday ? 'text-slate-300' : 'cursor-pointer'}`}
                      />
                    </label>
                  );
                })}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                <span className="font-bold text-slate-600 uppercase">Annual Week Offs Count</span>
                <span className="text-sm font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                  {Array.from(new Set([...tempWeekOffs, 'Sunday'])).length * 52} Days
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowWeekOffModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API_URL}/salaries/week-offs`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          weekOffs: tempWeekOffs.join(","),
                        }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast.success("Company-wide week offs updated successfully!");
                        setShowWeekOffModal(false);
                        fetchSalaries();
                      } else {
                        toast.error(result.message || "Failed to update week offs");
                      }
                    } catch (error) {
                      toast.error("An error occurred");
                    }
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Advance Modal */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowAdvanceModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <CreditCard className="text-indigo-650 w-5 h-5" />
              <span>Raise Advance Salary Request</span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`${API_URL}/advances`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(advanceForm),
                  });
                  const result = await res.json();
                  if (result.success) {
                    toast.success("Advance request raised successfully!");
                    setShowAdvanceModal(false);
                    fetchAdvanceRequests();
                  } else {
                    toast.error(result.message || "Failed to raise request");
                  }
                } catch (err) {
                  toast.error("An error occurred");
                }
              }}
              className="space-y-4 overflow-y-auto pr-1 flex-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Employee *</label>
                <select
                  required
                  value={advanceForm.employeeId}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Choose employee...</option>
                  {salaries.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recovery Option *</label>
                <select
                  required
                  value={advanceForm.recoveryOption}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, recoveryOption: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Installment">Installments (Monthly)</option>
                  <option value="Salary Deduction">Salary Deduction (Flat Rate)</option>
                  <option value="Outstanding Balance">Outstanding Balance (Deduct in Full)</option>
                </select>
              </div>

              {advanceForm.recoveryOption === 'Installment' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Installment Count (Months) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={advanceForm.installmentCount}
                    onChange={(e) => setAdvanceForm(prev => ({ ...prev, installmentCount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {advanceForm.recoveryOption === 'Salary Deduction' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monthly Deduction Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={advanceForm.monthlyDeduction}
                    onChange={(e) => setAdvanceForm(prev => ({ ...prev, monthlyDeduction: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Description</label>
                <textarea
                  rows="3"
                  placeholder="Why is advance salary requested..."
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Recovery Modal */}
      {showRecordRecoveryModal && selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowRecordRecoveryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Plus className="text-emerald-600 w-5 h-5" />
              <span>Record Repayment - {selectedAdvance.employeeName}</span>
            </h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const outstanding = Number(selectedAdvance.amount) - Number(selectedAdvance.totalRecovered || 0);
                if (Number(recoveryForm.amount) > outstanding) {
                  toast.error(`Repayment cannot exceed outstanding balance of ₹${outstanding.toLocaleString('en-IN')}`);
                  return;
                }
                try {
                  const res = await fetch(`${API_URL}/advances/${selectedAdvance.id}/recover`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(recoveryForm),
                  });
                  const result = await res.json();
                  if (result.success) {
                    toast.success("Recovery transaction logged successfully!");
                    setShowRecordRecoveryModal(false);
                    fetchAdvanceRequests();
                    fetchAdvanceRecoveries();
                  } else {
                    toast.error(result.message || "Failed to log recovery");
                  }
                } catch (err) {
                  toast.error("An error occurred");
                }
              }}
              className="space-y-4 overflow-y-auto pr-1 flex-1"
            >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Repayment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 5000"
                  max={Number(selectedAdvance.amount) - Number(selectedAdvance.totalRecovered || 0)}
                  value={recoveryForm.amount}
                  onChange={(e) => setRecoveryForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Recovery Method *</label>
                <select
                  required
                  value={recoveryForm.recoveryMethod}
                  onChange={(e) => setRecoveryForm(prev => ({ ...prev, recoveryMethod: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Salary Deduction">Salary Deduction</option>
                  <option value="Manual Repayment">Manual Repayment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Remarks / Reference</label>
                <textarea
                  rows="3"
                  placeholder="Reference number or deduction notes..."
                  value={recoveryForm.remarks}
                  onChange={(e) => setRecoveryForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRecordRecoveryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;

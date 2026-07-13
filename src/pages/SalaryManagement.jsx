import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, X, ArrowUpRight, History, ShieldAlert, Users, Percent, IndianRupee, Layers, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const SalaryManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('active-salaries'); // 'active-salaries' | 'requests' | 'history'
  const [requestsFilter, setRequestsFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [dialogError, setDialogError] = useState('');
  
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
      ]);
    } catch (error) {
      console.error("Error loading salary data:", error);
    } finally {
      setLoading(false);
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
                              onClick={() => triggerQuickAutoIncrease(emp)}
                              className="px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1 transition-all"
                              title="Quick +10% increment request"
                            >
                              <ArrowUpRight size={14} />
                              <span>+10% Auto</span>
                            </button>
                            <button
                              onClick={() => openManualChange(emp)}
                              className="px-2.5 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 text-xs font-semibold transition-all"
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

      {/* Employee-wise Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 overflow-hidden">
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

            <form onSubmit={handleCreateEmpRequest} className="space-y-4">
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
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 overflow-hidden">
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

            <form onSubmit={handleCreateDeptRequest} className="space-y-4">
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
    </div>
  );
};

export default SalaryManagement;

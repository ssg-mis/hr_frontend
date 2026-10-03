import React, { useState, useEffect, useMemo } from "react";
import {
  Clock, Plus, Search, CheckCircle2, XCircle, AlertCircle, 
  Calendar, User, Building2, Filter, Eye, Check, X, ShieldCheck, ChevronRight
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import useAuthStore from "../store/authStore";

const OvertimeManagement = () => {
  const { user, isAdmin, isHR, isHOD } = useAuthStore();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState("All"); // "All" | "Pending HOD" | "Pending HR" | "Approved" | "Rejected"
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");

  // Modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState({
    isOpen: false,
    requestId: null,
    role: null, // "HOD" | "HR"
    action: null, // "APPROVE" | "REJECT"
    comment: "",
  });

  // Overtime Form State
  const [formData, setFormData] = useState({
    employeeId: user?.employeeId || "",
    employeeName: user?.name || user?.candidateName || "",
    employeeCode: user?.biometricEmployeeCode || user?.employeeCode || "",
    department: user?.departmentName || "",
    hodName: "",
    workDate: todayStr,
    fromTime: "18:00",
    toTime: "21:30",
    hours: "3.5",
    reason: "",
  });

  // Calculate OT Hours dynamically based on fromTime and toTime
  const calculateHours = (from, to) => {
    if (!from || !to) return "0.0";
    const [h1, m1] = from.split(":").map(Number);
    const [h2, m2] = to.split(":").map(Number);
    let diffMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Overnight shift
    }
    const calc = Math.max(0, (diffMinutes / 60)).toFixed(2);
    return calc;
  };

  const handleTimeChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    const computed = calculateHours(
      field === "fromTime" ? val : formData.fromTime,
      field === "toTime" ? val : formData.toTime
    );
    updated.hours = computed;
    setFormData(updated);
  };

  // Fetch Requests & Employee Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [compRes, empRes] = await Promise.all([
        api.get("/compensation"),
        api.get("/employees"),
      ]);

      const rawList = Array.isArray(compRes?.data) ? compRes.data : (Array.isArray(compRes) ? compRes : []);
      setRequests(rawList);

      const rawEmps = Array.isArray(empRes?.data) ? empRes.data : (Array.isArray(empRes) ? empRes : []);
      setEmployees(rawEmps);

      // Auto-populate current employee's details in form if available
      const currentEmp = rawEmps.find(e => Number(e.id) === Number(user?.employeeId)) ||
        rawEmps.find(e => e.biometricEmployeeCode === user?.biometricEmployeeCode);

      if (currentEmp) {
        setFormData(prev => ({
          ...prev,
          employeeId: currentEmp.id,
          employeeName: currentEmp.candidateName || user?.name || "",
          employeeCode: currentEmp.biometricEmployeeCode || "",
          department: currentEmp.departmentName || "",
          hodName: currentEmp.hodName || "Department HOD",
        }));
      }
    } catch (err) {
      console.error("Error loading overtime data:", err);
      toast.error("Failed to load overtime requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch =
        !searchTerm ||
        (req.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.biometricEmployeeCode || req.employeeCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.compensationNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.reason || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        selectedDept === "All" || req.departmentName === selectedDept || req.department === selectedDept;

      const matchesStatus =
        activeTab === "All" ||
        (activeTab === "Pending HOD" && req.status === "Pending HOD") ||
        (activeTab === "Pending HR" && req.status === "Pending HR") ||
        (activeTab === "Approved" && req.status === "Approved") ||
        (activeTab === "Rejected" && req.status === "Rejected");

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [requests, searchTerm, selectedDept, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    let total = requests.length;
    let pendingHOD = 0;
    let pendingHR = 0;
    let approved = 0;
    let rejected = 0;
    let totalHours = 0;

    requests.forEach(r => {
      if (r.status === "Pending HOD") pendingHOD++;
      else if (r.status === "Pending HR") pendingHR++;
      else if (r.status === "Approved") {
        approved++;
        totalHours += Number(r.hours || 0);
      } else if (r.status === "Rejected") rejected++;
    });

    return { total, pendingHOD, pendingHR, approved, rejected, totalHours: totalHours.toFixed(1) };
  }, [requests]);

  // Departments
  const departments = useMemo(() => {
    const set = new Set();
    requests.forEach(r => {
      if (r.departmentName) set.add(r.departmentName);
    });
    return Array.from(set);
  }, [requests]);

  // Submit Overtime Request
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast.error("Please provide a valid work description / reason");
      return;
    }
    if (Number(formData.hours) <= 0) {
      toast.error("Total OT hours must be greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: formData.employeeId,
        workDate: formData.workDate,
        startDate: `${formData.workDate}T${formData.fromTime}:00`,
        endDate: `${formData.workDate}T${formData.toTime}:00`,
        hours: formData.hours,
        compensationType: "Overtime Allowance",
        reason: formData.reason,
      };

      const res = await api.post("/compensation", payload);
      if (res.success || res.data) {
        toast.success("Overtime request submitted successfully!");
        setShowApplyModal(false);
        setFormData(prev => ({
          ...prev,
          workDate: todayStr,
          fromTime: "18:00",
          toTime: "21:30",
          hours: "3.5",
          reason: "",
        }));
        loadData();
      }
    } catch (err) {
      console.error("Failed to submit overtime request:", err);
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  // Process Approval / Rejection
  const handleProcessApproval = async () => {
    const { requestId, role, action, comment } = approvalModal;
    if (!requestId || !role || !action) return;

    const toastId = toast.loading(`Processing ${action === "APPROVE" ? "approval" : "rejection"}...`);
    try {
      const endpoint = role === "HOD" 
        ? `/compensation/${requestId}/hod-approval` 
        : `/compensation/${requestId}/hr-approval`;

      const res = await api.patch(endpoint, {
        action: action,
        comment: comment || undefined,
      });

      if (res.success || res.data) {
        toast.dismiss(toastId);
        toast.success(`Request ${action === "APPROVE" ? "Approved" : "Rejected"} successfully!`);
        setApprovalModal({ isOpen: false, requestId: null, role: null, action: null, comment: "" });
        loadData();
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Approval error:", err);
      toast.error(err.message || "Approval action failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-indigo-600 w-7 h-7" />
            Overtime (OT) Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit, approve, and track employee extra working hours with 2-level HOD & HR verification.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-sm text-sm"
        >
          <Plus size={18} />
          Apply Overtime
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>

        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending HOD</div>
          <div className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingHOD}</div>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Pending HR</div>
          <div className="text-2xl font-bold text-blue-900 mt-1">{stats.pendingHR}</div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Approved</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.approved}</div>
        </div>

        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 shadow-sm col-span-2 md:col-span-1">
          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Approved OT Hours</div>
          <div className="text-2xl font-bold text-purple-900 mt-1">{stats.totalHours} <span className="text-xs font-normal">hrs</span></div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search by employee name, code, OT number, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Tabs & Dept Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
            {["All", "Pending HOD", "Pending HR", "Approved", "Rejected"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Filter size={14} className="text-gray-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-500 shrink-0">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-xs text-gray-500 font-medium">Loading overtime records...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No Overtime Requests Found</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              There are no overtime records matching your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">OT Ref.</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Work Date</th>
                  <th className="py-3 px-4 text-center">Time Slot</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4">Reason / Work</th>
                  <th className="py-3 px-4 text-center">HOD Status</th>
                  <th className="py-3 px-4 text-center">HR Status</th>
                  <th className="py-3 px-4 text-center">Overall Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => {
                  const workDateFormatted = req.workDate 
                    ? new Date(req.workDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : "—";

                  const startFormatted = req.startDate ? new Date(req.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—";
                  const endFormatted = req.endDate ? new Date(req.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—";

                  const isEmpHOD = isHOD || isAdmin;
                  const isEmpHR = isHR || isAdmin;
                  const isOwnRequest = Number(req.employeeId) === Number(user?.employeeId) || req.biometricEmployeeCode === user?.biometricEmployeeCode;
                  const canHodApprove = isEmpHOD && req.status === "Pending HOD" && !isOwnRequest;
                  const canHrApprove = isEmpHR && req.status === "Pending HR" && !isOwnRequest;

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        {req.compensationNumber || `OT-${req.id}`}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{req.employeeName || req.candidateName}</div>
                        <div className="text-[11px] font-mono text-gray-400">{req.biometricEmployeeCode || req.employeeCode}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                        {req.departmentName || req.department || "—"}
                      </td>
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap font-medium">
                        {workDateFormatted}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-gray-600 whitespace-nowrap">
                        {startFormatted} – {endFormatted}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-900 whitespace-nowrap">
                        {Number(req.hours || 0).toFixed(1)} hrs
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-gray-600" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.hodStatus === "Approved" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : req.hodStatus === "Rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {req.hodStatus || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          req.hrStatus === "Approved" 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                            : req.hrStatus === "Rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {req.hrStatus || "Pending"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          req.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "Rejected"
                            ? "bg-rose-100 text-rose-800"
                            : req.status === "Pending HR"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canHodApprove && (
                            <>
                              <button
                                onClick={() => setApprovalModal({ isOpen: true, requestId: req.id, role: "HOD", action: "APPROVE", comment: "" })}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                                title="HOD Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setApprovalModal({ isOpen: true, requestId: req.id, role: "HOD", action: "REJECT", comment: "" })}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                                title="HOD Reject"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          {canHrApprove && (
                            <>
                              <button
                                onClick={() => setApprovalModal({ isOpen: true, requestId: req.id, role: "HR", action: "APPROVE", comment: "" })}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                                title="HR Final Approve"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setApprovalModal({ isOpen: true, requestId: req.id, role: "HR", action: "REJECT", comment: "" })}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                                title="HR Reject"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => { setSelectedRequest(req); setShowDetailsModal(true); }}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Overtime Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">New Overtime Request</h3>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Auto-filled Employee Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block">Employee:</span>
                  <span className="font-semibold text-gray-900">{formData.employeeName || "—"} ({formData.employeeCode || "—"})</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Department:</span>
                  <span className="font-semibold text-gray-900">{formData.department || "—"}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-gray-200/60">
                  <span className="text-gray-500 block">Approval Route:</span>
                  <span className="font-medium text-indigo-700">HOD Verification ➔ HR Final Approval</span>
                </div>
              </div>

              {/* OT Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Overtime Date *</label>
                <input
                  type="date"
                  max={todayStr}
                  value={formData.workDate}
                  onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Time Slot (From Time & To Time) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Time (From) *</label>
                  <input
                    type="time"
                    value={formData.fromTime}
                    onChange={(e) => handleTimeChange("fromTime", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Time (To) *</label>
                  <input
                    type="time"
                    value={formData.toTime}
                    onChange={(e) => handleTimeChange("toTime", e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Computed Hours Summary */}
              <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
                <span className="text-indigo-900 font-medium">Calculated OT Duration:</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">{formData.hours} Hours</span>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Work Description / Reason *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the overtime work completed..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                    submitting ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {submitting ? "Submitting..." : "Submit Overtime Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {approvalModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                {approvalModal.action === "APPROVE" ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={24} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <XCircle size={24} />
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {approvalModal.action === "APPROVE" ? "Approve" : "Reject"} Overtime Request
                  </h3>
                  <p className="text-xs text-gray-500">
                    Acting as {approvalModal.role === "HOD" ? "Department HOD" : "HR Administrator"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Optional Comment / Note:</label>
                <textarea
                  rows={2}
                  placeholder="Add any remarks for the record..."
                  value={approvalModal.comment}
                  onChange={(e) => setApprovalModal({ ...approvalModal, comment: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovalModal({ isOpen: false, requestId: null, role: null, action: null, comment: "" })}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessApproval}
                  className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-all ${
                    approvalModal.action === "APPROVE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  Confirm {approvalModal.action === "APPROVE" ? "Approval" : "Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Overtime Request Details</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-500 block">Reference No:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedRequest.compensationNumber || `OT-${selectedRequest.id}`}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Overall Status:</span>
                  <span className="font-bold text-gray-900">{selectedRequest.status}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Employee Name:</span>
                  <span className="font-semibold text-gray-900">{selectedRequest.employeeName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Employee Code:</span>
                  <span className="font-mono font-semibold text-gray-900">{selectedRequest.biometricEmployeeCode || selectedRequest.employeeCode}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Work Date:</span>
                  <span className="font-semibold text-gray-900">
                    {selectedRequest.workDate ? new Date(selectedRequest.workDate).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Duration:</span>
                  <span className="font-mono font-bold text-indigo-700">{Number(selectedRequest.hours || 0).toFixed(1)} Hours</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 block mb-1 font-semibold">Work Description / Reason:</span>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed">
                  {selectedRequest.reason}
                </div>
              </div>

              {/* Approval Timeline */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <span className="text-gray-500 block font-semibold">Approval History:</span>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span>HOD Review: <strong>{selectedRequest.hodStatus || "Pending"}</strong></span>
                  <span className="text-gray-400">
                    {selectedRequest.hodApprovedAt ? new Date(selectedRequest.hodApprovedAt).toLocaleDateString() : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200/60">
                  <span>HR Review: <strong>{selectedRequest.hrStatus || "Pending"}</strong></span>
                  <span className="text-gray-400">
                    {selectedRequest.hrApprovedAt ? new Date(selectedRequest.hrApprovedAt).toLocaleDateString() : ""}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeManagement;

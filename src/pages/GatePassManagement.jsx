import React, { useState, useEffect, useRef } from "react";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Users,
  Building,
  CheckCircle2,
  XCircle,
  LogOut,
  LogIn,
  Printer,
  X,
  FileText,
  Calendar,
  ShieldCheck,
  Phone,
  Car,
  CreditCard,
  AlertCircle,
  Info,
  Copy,
  ExternalLink,
  Share2,
  ArrowRight,
  Check,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import useAuthStore from "../store/authStore";

const GatePassManagement = () => {
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? (user?.role ? [user.role] : []);
  const hasRole = (r) => roles.some((role) => role.toLowerCase() === r.toLowerCase());

  const isAdmin = hasRole("admin");
  const isHR = hasRole("hr");
  const isHOD = hasRole("hod");
  const isEmployeeOnly = !isAdmin && !isHR && !isHOD;

  const [passes, setPasses] = useState([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    currentlyOut: 0,
    pendingHodCount: 0,
    pendingHrCount: 0,
    visitorsToday: 0,
    employeesToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modal states
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [activeTab, setActiveTab] = useState("EMPLOYEE"); // 'EMPLOYEE' | 'VISITOR'
  const [submitting, setSubmitting] = useState(false);

  // Selected pass for viewing / printing
  const [selectedPass, setSelectedPass] = useState(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Rejection Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectPassId, setRejectPassId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // External Visitor Link share modal state
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [form, setForm] = useState({
    employeeId: "",
    visitorName: "",
    visitorPhone: "",
    visitorCompany: "",
    hostEmployeeId: "",
    hostName: "",
    departmentId: "",
    purpose: "",
    outReasonCategory: "Official", // 'Official' | 'Personal' | 'Vendor' | 'Visit'
    idProofType: "Aadhar",
    idProofNumber: "",
    vehicleNumber: "",
    expectedOutTime: new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16),
    expectedInTime: "",
    remarks: "",
  });

  const printRef = useRef(null);

  const getPublicVisitorLink = () => {
    return `${window.location.origin}/visitor-pass-request`;
  };

  const copyVisitorLink = () => {
    const link = getPublicVisitorLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Visitor pass request link copied to clipboard!");
    setTimeout(() => setCopied(false), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.append("passType", filterType);
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const [passesRes, statsRes] = await Promise.all([
        api.get(`/gate-passes?${params.toString()}`),
        api.get("/gate-passes/stats"),
      ]);

      if (passesRes.success) setPasses(passesRes.data || []);
      if (statsRes.success) setStats(statsRes.data || {});
    } catch (err) {
      console.error("Error fetching gate passes:", err);
      toast.error(err.message || "Failed to load gate pass records");
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [empRes, deptRes] = await Promise.all([
        api.get("/employees/active").catch(() => ({ success: false })),
        api.get("/departments").catch(() => ({ success: false })),
      ]);

      if (empRes.success) setEmployeesList(empRes.data || []);
      if (deptRes.success) setDepartmentsList(deptRes.data || []);
    } catch (err) {
      console.error("Error fetching reference lists:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterStatus]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "employeeId" && value) {
        const selected = employeesList.find(
          (emp) => String(emp.employee_id || emp.id) === String(value)
        );
        if (selected) {
          const deptId = selected.department_id || selected.departmentId || (selected.department && selected.department.id);
          if (deptId) updated.departmentId = String(deptId);
        }
      }
      return updated;
    });
  };

  const resetForm = () => {
    let empId = isEmployeeOnly ? String(user?.employeeId || "") : "";
    let deptId = user?.departmentId ? String(user.departmentId) : "";

    // If an employee ID is set, attempt to derive department
    if (empId && employeesList.length > 0) {
      const selected = employeesList.find(
        (emp) => String(emp.employee_id || emp.id) === String(empId)
      );
      if (selected) {
        const foundDept = selected.department_id || selected.departmentId || (selected.department && selected.department.id);
        if (foundDept) deptId = String(foundDept);
      }
    }

    setForm({
      employeeId: empId,
      visitorName: "",
      visitorPhone: "",
      visitorCompany: "",
      hostEmployeeId: "",
      hostName: "",
      departmentId: deptId,
      purpose: "",
      outReasonCategory: activeTab === "EMPLOYEE" ? "Official" : "Visit",
      idProofType: "Aadhar",
      idProofNumber: "",
      vehicleNumber: "",
      expectedOutTime: new Date(Date.now() + 15 * 60000).toISOString().slice(0, 16),
      expectedInTime: "",
      remarks: "",
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setForm((prev) => ({
      ...prev,
      outReasonCategory: tab === "EMPLOYEE" ? "Official" : "Visit",
    }));
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!form.purpose || !form.expectedOutTime) {
      toast.error("Purpose and Exit Time are required.");
      return;
    }

    const empIdToSubmit = isEmployeeOnly ? user?.employeeId : form.employeeId ? Number(form.employeeId) : null;

    if (activeTab === "EMPLOYEE" && !empIdToSubmit) {
      toast.error("Please select an employee.");
      return;
    }

    if (activeTab === "VISITOR" && !form.visitorName) {
      toast.error("Please enter visitor name.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        employeeId: empIdToSubmit,
        departmentId: form.departmentId ? Number(form.departmentId) : user?.departmentId || null,
        passType: activeTab,
      };

      const res = await api.post("/gate-passes", payload);
      if (res.success) {
        toast.success(res.message || "Gate pass request submitted!");
        setShowIssueModal(false);
        resetForm();
        fetchData();
        setSelectedPass(res.data);
        setShowPrintModal(true);
      }
    } catch (err) {
      console.error("Create gate pass error:", err);
      toast.error(err.message || "Failed to issue gate pass");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (passId, newStatus, reason = "") => {
    try {
      const res = await api.patch(`/gate-passes/${passId}/status`, {
        status: newStatus,
        rejectionReason: reason || undefined,
      });

      if (res.success) {
        toast.success(res.message || `Pass status updated to ${newStatus}`);
        if (showRejectModal) setShowRejectModal(false);
        setRejectionReason("");
        setRejectPassId(null);
        fetchData();
      }
    } catch (err) {
      console.error("Status update error:", err);
      toast.error(err.message || "Failed to update status");
    }
  };

  const openRejectModal = (passId) => {
    setRejectPassId(passId);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-pass-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      toast.error("Please allow popup windows to print the pass.");
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gate Pass - ${selectedPass?.passNumber || "Ticket"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 20px; background: white !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 flex justify-center items-center min-h-screen p-6">
          <div class="w-full max-w-lg border-4 border-double border-indigo-950 p-6 rounded-xl space-y-4">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING_HOD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <Clock size={13} />
            Pending HOD
          </span>
        );
      case "PENDING_HR":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Clock size={13} />
            Pending HR
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} />
            Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle size={13} />
            Rejected
          </span>
        );
      case "OUT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
            <LogOut size={13} />
            Out Campus
          </span>
        );
      case "IN":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <LogIn size={13} />
            Returned (In)
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            <XCircle size={13} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Ticket className="text-indigo-600" size={28} />
            <span>Gate Pass Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Raise, approve (HOD & HR), track, and manage gate passes for employees & visitors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* External Visitor Pass Link Button */}
          {(isAdmin || isHR) && (
            <button
              onClick={() => setShowShareLinkModal(true)}
              className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold px-4 py-2.5 rounded-xl transition duration-200 cursor-pointer text-sm"
            >
              <Share2 size={17} />
              <span>External Visitor Link</span>
            </button>
          )}

          {/* Issue Pass Button */}
          <button
            onClick={() => {
              resetForm();
              setShowIssueModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition duration-200 cursor-pointer text-sm"
          >
            <Plus size={18} />
            <span>{isEmployeeOnly ? "Request Gate Pass" : "Issue Gate Pass"}</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Total Today</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{stats.totalToday || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Ticket size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-orange-200 bg-orange-50/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Pending HOD</p>
            <h3 className="text-2xl font-extrabold text-orange-900 mt-1">{stats.pendingHodCount || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-indigo-200 bg-indigo-50/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Pending HR</p>
            <h3 className="text-2xl font-extrabold text-indigo-900 mt-1">{stats.pendingHrCount || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Currently Out</p>
            <h3 className="text-2xl font-extrabold text-amber-900 mt-1">{stats.currentlyOut || 0}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <LogOut size={24} />
          </div>
        </div>
      </div>

      {/* Main Filter & Pass Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Filter bar */}
        <div className="p-4 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/50">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by Pass #, Visitor, Employee Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </div>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Type */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <Filter size={15} />
              <span>Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="EMPLOYEE">Employee Out Pass</option>
                <option value="VISITOR">Visitor Pass</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
              <span>Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_HOD">Pending HOD</option>
                <option value="PENDING_HR">Pending HR</option>
                <option value="APPROVED">Approved</option>
                <option value="OUT">Out Campus</option>
                <option value="IN">Returned (In)</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : passes.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <Ticket size={40} className="mx-auto text-gray-300" />
            <p className="text-base font-medium text-gray-600">No gate pass records found</p>
            <p className="text-xs text-gray-400">Click "Issue Gate Pass" above to create a new pass.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Pass #</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Person / Visitor</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Host / Dept</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Purpose</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Expected Exit</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {passes.map((pass) => (
                  <tr key={pass.id} className="hover:bg-gray-50/60 transition duration-150">
                    {/* Pass # */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-indigo-700 text-sm">{pass.passNumber}</span>
                        <span className="text-[11px] text-gray-400">By {pass.issuedByName || "System"}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          pass.passType === "VISITOR"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}
                      >
                        {pass.passType === "VISITOR" ? <Users size={12} /> : <User size={12} />}
                        {pass.passType}
                      </span>
                    </td>

                    {/* Person */}
                    <td className="px-6 py-4">
                      {pass.passType === "EMPLOYEE" ? (
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{pass.employeeName || "Employee"}</p>
                          <p className="text-xs text-gray-500">Code: {pass.employeeCode || "-"}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{pass.visitorName}</p>
                          <p className="text-xs text-gray-500">Ph: {pass.visitorPhone || "-"}</p>
                          {pass.visitorCompany && (
                            <p className="text-[11px] text-purple-600 font-medium">Comp: {pass.visitorCompany}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Host / Dept */}
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {pass.passType === "VISITOR" ? (
                        <div>
                          <p className="font-medium text-gray-900">{pass.hostName || "N/A"}</p>
                          {pass.departmentName && <p className="text-gray-500">{pass.departmentName}</p>}
                        </div>
                      ) : (
                        <p className="font-medium text-gray-700">{pass.departmentName || "-"}</p>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-800 line-clamp-1 font-medium">{pass.purpose}</p>
                        {pass.vehicleNumber && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <Car size={11} /> {pass.vehicleNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Exit Time */}
                    <td className="px-6 py-4 text-xs font-medium text-gray-700">
                      <p>{formatDateTime(pass.expectedOutTime)}</p>
                      {pass.expectedInTime && (
                        <p className="text-gray-400 text-[11px]">Ret: {formatDateTime(pass.expectedInTime)}</p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(pass.status)}</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Status PENDING_HOD Actions:
                            - ONLY HOD (or Admin) can approve HOD stage -> PENDING_HR
                            - HR cannot approve on behalf of HOD
                        */}
                        {pass.status === "PENDING_HOD" && (isHOD || isAdmin) && (
                          <button
                            onClick={() => handleStatusUpdate(pass.id, "PENDING_HR")}
                            className="inline-flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition shadow-sm"
                            title="Approve as HOD (Moves request to HR approval stage)"
                          >
                            <CheckCircle2 size={13} /> Approve (HOD)
                          </button>
                        )}

                        {/* Status PENDING_HR Actions:
                            - ONLY HR or Admin can approve HR stage -> APPROVED
                            - HOD cannot approve here
                        */}
                        {pass.status === "PENDING_HR" && (isHR || isAdmin) && (
                          <button
                            onClick={() => handleStatusUpdate(pass.id, "APPROVED")}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition shadow-sm"
                            title="Approve as HR (Final Approval)"
                          >
                            <CheckCircle2 size={13} /> Approve (HR)
                          </button>
                        )}

                        {/* Reject Button (HOD for PENDING_HOD, HR/Admin for PENDING_HOD or PENDING_HR) */}
                        {((pass.status === "PENDING_HOD" && (isHOD || isHR || isAdmin)) ||
                          (pass.status === "PENDING_HR" && (isHR || isAdmin))) && (
                          <button
                            onClick={() => openRejectModal(pass.id)}
                            className="inline-flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold px-2 py-1 rounded-lg transition"
                            title="Reject Request"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        )}

                        {/* Out / In execution workflows */}
                        {pass.status === "APPROVED" && (isHR || isAdmin) && (
                          <button
                            onClick={() => handleStatusUpdate(pass.id, "OUT")}
                            title="Mark Left Campus (Out)"
                            className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition"
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                        {pass.status === "OUT" && (isHR || isAdmin) && (
                          <button
                            onClick={() => handleStatusUpdate(pass.id, "IN")}
                            title="Mark Returned (In)"
                            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          >
                            <LogIn size={16} />
                          </button>
                        )}

                        {/* Print Pass Button */}
                        <button
                          onClick={() => {
                            setSelectedPass(pass);
                            setShowPrintModal(true);
                          }}
                          title="Print / View Gate Pass"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Share External Visitor Link */}
      {showShareLinkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-purple-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Share2 size={18} />
                <span>External Visitor Gate Pass Link</span>
              </h3>
              <button
                onClick={() => setShowShareLinkModal(false)}
                className="text-purple-200 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Share this link with visitors to allow them to submit gate pass requests online. Submitted visitor requests go directly to HR for approval.
              </p>

              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={getPublicVisitorLink()}
                  className="flex-1 bg-transparent text-xs font-mono text-gray-800 outline-none select-all"
                />
                <button
                  onClick={copyVisitorLink}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>

              <div className="pt-2 text-right">
                <a
                  href={getPublicVisitorLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-bold text-xs"
                >
                  <span>Open Form Preview</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowShareLinkModal(false)}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center text-red-900">
              <h3 className="font-bold text-base flex items-center gap-2">
                <XCircle size={18} className="text-red-600" />
                <span>Reject Gate Pass Request</span>
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-600">
                Please provide a reason for rejecting this gate pass request:
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(rejectPassId, "REJECTED", rejectionReason)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Issue Gate Pass */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Ticket className="text-indigo-600" size={20} />
                <span>{isEmployeeOnly ? "Request Gate Pass" : "Issue New Gate Pass"}</span>
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg border border-gray-200 bg-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab switcher (only for non-employee or HR/Admin) */}
            {!isEmployeeOnly && (
              <div className="flex border-b border-gray-200 bg-gray-100/50 p-1">
                <button
                  type="button"
                  onClick={() => handleTabChange("EMPLOYEE")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                    activeTab === "EMPLOYEE"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <User size={16} />
                  <span>Employee Out Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTabChange("VISITOR")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                    activeTab === "VISITOR"
                      ? "bg-white text-purple-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Users size={16} />
                  <span>Visitor Gate Pass</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreatePass}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {activeTab === "EMPLOYEE" ? (
                  /* Employee Pass Form Fields */
                  <>
                    {!isEmployeeOnly && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Select Employee *</label>
                        <select
                          name="employeeId"
                          value={form.employeeId}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Choose Employee --</option>
                          {employeesList.map((emp) => {
                            const id = emp.employee_id || emp.id;
                            const name = emp.candidateName || emp.name_as_per_aadhar || emp.name || "Employee";
                            const code = emp.employee_code || emp.employeeCode || emp.biotime_emp_code || "";
                            return (
                              <option key={id} value={id}>
                                {name} {code ? `(${code})` : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Category</label>
                        <select
                          name="outReasonCategory"
                          value={form.outReasonCategory}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white"
                        >
                          <option value="Official">Official Duty</option>
                          <option value="Personal">Personal Work</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700 flex items-center justify-between">
                          <span>Department</span>
                          <span className="text-[10px] text-gray-500 font-normal flex items-center gap-1">
                            <Lock size={10} /> Auto-assigned
                          </span>
                        </label>
                        <select
                          name="departmentId"
                          value={form.departmentId}
                          disabled={true}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-gray-100 text-gray-700 font-medium cursor-not-allowed"
                        >
                          <option value="">-- Auto-filled Department --</option>
                          {departmentsList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Visitor Pass Form Fields */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Visitor Name *</label>
                        <input
                          type="text"
                          name="visitorName"
                          placeholder="e.g. John Doe"
                          value={form.visitorName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Contact Number</label>
                        <input
                          type="text"
                          name="visitorPhone"
                          placeholder="Mobile Number"
                          value={form.visitorPhone}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Company / Organization</label>
                        <input
                          type="text"
                          name="visitorCompany"
                          placeholder="e.g. Acme Corp"
                          value={form.visitorCompany}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">Host / Person To Visit</label>
                        <input
                          type="text"
                          name="hostName"
                          placeholder="Host Employee Name"
                          value={form.hostName}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>
                    </div>

                    {/* ID Proof */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">ID Proof Type</label>
                        <select
                          name="idProofType"
                          value={form.idProofType}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white"
                        >
                          <option value="Aadhar">Aadhar Card</option>
                          <option value="PAN">PAN Card</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Passport">Passport</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase text-gray-700">ID Number</label>
                        <input
                          type="text"
                          name="idProofNumber"
                          placeholder="ID Proof Number"
                          value={form.idProofNumber}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Common Fields: Purpose, Vehicle No, Exit/Return Times */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-gray-700">Purpose of Departure / Visit *</label>
                  <textarea
                    name="purpose"
                    rows={2}
                    placeholder="Enter reason or visit details..."
                    value={form.purpose}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Expected Exit Date & Time *</label>
                    <input
                      type="datetime-local"
                      name="expectedOutTime"
                      value={form.expectedOutTime}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Expected Return Date & Time</label>
                    <input
                      type="datetime-local"
                      name="expectedInTime"
                      value={form.expectedInTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Vehicle Number (Optional)</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      placeholder="e.g. MH-12-AB-1234"
                      value={form.vehicleNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase text-gray-700">Remarks / Notes</label>
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Additional remarks"
                      value={form.remarks}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow-md transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Pass Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Printable Gate Pass Ticket Preview */}
      {showPrintModal && selectedPass && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-300 overflow-hidden transform transition-all">
            {/* Header controls (no-print) */}
            <div className="no-print px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Printer size={18} />
                <span>Gate Pass Ticket Preview</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer size={14} /> Print Ticket
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-indigo-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Print Pass Document Body */}
            <div id="printable-pass-area" ref={printRef} className="p-6 bg-white text-gray-900">
              {/* Pass Outer Border Box */}
              <div className="border-4 border-double border-indigo-950 p-6 rounded-xl relative space-y-4 bg-white">
                {/* Header */}
                <div className="text-center border-b-2 border-indigo-950 pb-3">
                  <h2 className="text-2xl font-black tracking-wider text-indigo-950 uppercase">
                    CAMPUS GATE PASS
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-800 mt-0.5">
                    HR FMS AUTHORIZED PASS
                  </p>
                </div>

                {/* Badge Type & Pass Number */}
                <div className="flex justify-between items-center bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest block">
                      PASS NUMBER
                    </span>
                    <span className="text-lg font-black text-indigo-900 tracking-wider font-mono">
                      {selectedPass.passNumber}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                      STATUS / TYPE
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wide text-indigo-950 px-2 py-0.5 bg-indigo-200 rounded">
                      {selectedPass.status} ({selectedPass.passType})
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs border-b border-gray-200 pb-3">
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Holder Name:</span>
                    <span className="font-black text-sm text-gray-900">
                      {selectedPass.passType === "EMPLOYEE"
                        ? selectedPass.employeeName
                        : selectedPass.visitorName}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">
                      {selectedPass.passType === "EMPLOYEE" ? "Employee Code:" : "Contact Phone:"}
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedPass.passType === "EMPLOYEE"
                        ? selectedPass.employeeCode
                        : selectedPass.visitorPhone || "N/A"}
                    </span>
                  </div>

                  {selectedPass.passType === "VISITOR" && (
                    <>
                      <div>
                        <span className="font-bold text-gray-500 uppercase text-[10px] block">Visitor Company:</span>
                        <span className="font-bold text-gray-900">{selectedPass.visitorCompany || "N/A"}</span>
                      </div>
                      <div>
                        <span className="font-bold text-gray-500 uppercase text-[10px] block">Host Person:</span>
                        <span className="font-bold text-gray-900">{selectedPass.hostName || "N/A"}</span>
                      </div>
                    </>
                  )}

                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Department:</span>
                    <span className="font-bold text-gray-900">{selectedPass.departmentName || "N/A"}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Purpose:</span>
                    <span className="font-bold text-gray-900">{selectedPass.purpose}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Category:</span>
                    <span className="font-bold text-gray-900">{selectedPass.outReasonCategory || "Official"}</span>
                  </div>

                  {selectedPass.vehicleNumber && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase text-[10px] block">Vehicle No:</span>
                      <span className="font-bold text-gray-900">{selectedPass.vehicleNumber}</span>
                    </div>
                  )}

                  {selectedPass.idProofType && (
                    <div>
                      <span className="font-bold text-gray-500 uppercase text-[10px] block">ID Proof:</span>
                      <span className="font-bold text-gray-900">
                        {selectedPass.idProofType} ({selectedPass.idProofNumber || "Verified"})
                      </span>
                    </div>
                  )}
                </div>

                {/* Audit & Approval Trail */}
                <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 font-semibold">HOD Approval:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPass.hodApprovedByName
                        ? `${selectedPass.hodApprovedByName} (${formatDateTime(selectedPass.hodApprovedAt)})`
                        : selectedPass.passType === "VISITOR"
                        ? "N/A (Visitor Direct to HR)"
                        : "Pending HOD Stage"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-gray-500 font-semibold">HR Approval:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedPass.hrApprovedByName
                        ? `${selectedPass.hrApprovedByName} (${formatDateTime(selectedPass.hrApprovedAt)})`
                        : "Pending HR Stage"}
                    </span>
                  </div>
                  {selectedPass.rejectionReason && (
                    <div className="flex justify-between text-[11px] text-red-600 font-medium pt-1 border-t border-red-100">
                      <span>Rejection Reason:</span>
                      <span>{selectedPass.rejectionReason}</span>
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Expected Exit:</span>
                    <span className="font-bold text-indigo-900">{formatDateTime(selectedPass.expectedOutTime)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500 uppercase text-[10px] block">Expected Return:</span>
                    <span className="font-bold text-indigo-900">{formatDateTime(selectedPass.expectedInTime)}</span>
                  </div>
                </div>

                {/* Barcode visual simulation */}
                <div className="py-2 text-center border-t border-b border-dashed border-gray-300">
                  <div className="font-mono text-[10px] tracking-widest text-gray-400 mb-1">
                    ||| | ||||| ||| |||| ||||| ||| ||||||| |||
                  </div>
                  <span className="text-[11px] font-mono font-bold text-gray-700">{selectedPass.passNumber}</span>
                </div>

                {/* Signature / Authority footer */}
                <div className="pt-3 flex justify-between items-end text-xs">
                  <div className="text-center">
                    <div className="w-28 border-b border-gray-400 mb-1"></div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">Security Gate Stamp</span>
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] font-bold text-indigo-900 mb-1">Issued by: {selectedPass.issuedByName || "System"}</p>
                    <div className="w-28 border-b border-gray-400 mb-1"></div>
                    <span className="text-[10px] font-bold uppercase text-gray-500">HR / Admin Auth Sign</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer controls (no-print) */}
            <div className="no-print px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl text-sm shadow flex items-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> Print Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePassManagement;

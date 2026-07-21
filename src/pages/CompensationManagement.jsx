import React, { useState, useEffect } from "react";
import {
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Building,
  Calendar,
  FileText,
  AlertCircle,
  Trash2,
  ShieldCheck,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import useAuthStore from "../store/authStore";

const CompensationManagement = () => {
  const { user, isAdmin, isHR, isHOD } = useAuthStore();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Employees & dropdown lists for Admin/HR
  const [employeesList, setEmployeesList] = useState([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalStage, setApprovalStage] = useState("HOD"); // 'HOD' | 'HR'
  const [approvalComment, setApprovalComment] = useState("");

  // Form State
  const [form, setForm] = useState({
    employeeId: "",
    workDate: new Date().toISOString().slice(0, 10),
    compensationType: "Comp-Off Leave",
    hours: "8.00",
    reason: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await api.get(`/compensation?${params.toString()}`);
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching compensation requests:", err);
      toast.error(err.message || "Failed to load compensation requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    if (isAdmin || isHR) {
      try {
        const res = await api.get("/employees");
        if (res.success) {
          setEmployeesList(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching employees list:", err);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.workDate || !form.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        employeeId: (isAdmin || isHR) && form.employeeId ? Number(form.employeeId) : user?.employeeId,
        workDate: form.workDate,
        compensationType: form.compensationType,
        hours: Number(form.hours) || 8.0,
        reason: form.reason,
      };

      const res = await api.post("/compensation", payload);
      if (res.success) {
        toast.success(res.message || "Compensation request submitted successfully");
        setShowRequestModal(false);
        setForm({
          employeeId: "",
          workDate: new Date().toISOString().slice(0, 10),
          compensationType: "Comp-Off Leave",
          hours: "8.00",
          reason: "",
        });
        fetchData();
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApproval = (reqItem, stage) => {
    setSelectedRequest(reqItem);
    setApprovalStage(stage);
    setApprovalComment("");
    setShowApprovalModal(true);
  };

  const handleProcessApproval = async (action) => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const endpoint =
        approvalStage === "HOD"
          ? `/compensation/${selectedRequest.id}/hod-approval`
          : `/compensation/${selectedRequest.id}/hr-approval`;

      const res = await api.patch(endpoint, {
        action: action,
        comment: approvalComment,
      });

      if (res.success) {
        toast.success(res.message || `Request ${action.toLowerCase()}d successfully`);
        setShowApprovalModal(false);
        setSelectedRequest(null);
        fetchData();
      }
    } catch (err) {
      console.error("Approval process error:", err);
      toast.error(err.message || "Failed to update approval status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this compensation request?")) return;
    try {
      const res = await api.delete(`/compensation/${id}`);
      if (res.success) {
        toast.success("Request deleted successfully");
        fetchData();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete request");
    }
  };

  // Metrics summary
  const totalCount = requests.length;
  const pendingHodCount = requests.filter((r) => r.status === "Pending HOD").length;
  const pendingHrCount = requests.filter((r) => r.status === "Pending HR").length;
  const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={13} className="mr-1" /> Approved
          </span>
        );
      case "Pending HOD":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={13} className="mr-1" /> Pending HOD
          </span>
        );
      case "Pending HR":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock size={13} className="mr-1" /> Pending HR
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle size={13} className="mr-1" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Award className="h-7 w-7 text-indigo-300" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Compensation Management</h1>
          </div>
          <p className="text-indigo-200 text-sm md:text-base">
            Request compensation for overtime or extra work days with multi-stage HOD & HR approval workflows.
          </p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-semibold rounded-xl shadow-lg transition duration-200"
        >
          <Plus size={18} className="mr-2" /> Request Compensation
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500">Total Requests</span>
          <span className="text-2xl font-bold text-slate-800 mt-1">{totalCount}</span>
        </div>
        <div className="bg-amber-50/60 p-4 rounded-xl shadow-sm border border-amber-200 flex flex-col justify-between">
          <span className="text-xs font-medium text-amber-700">Pending HOD</span>
          <span className="text-2xl font-bold text-amber-900 mt-1">{pendingHodCount}</span>
        </div>
        <div className="bg-blue-50/60 p-4 rounded-xl shadow-sm border border-blue-200 flex flex-col justify-between">
          <span className="text-xs font-medium text-blue-700">Pending HR</span>
          <span className="text-2xl font-bold text-blue-900 mt-1">{pendingHrCount}</span>
        </div>
        <div className="bg-emerald-50/60 p-4 rounded-xl shadow-sm border border-emerald-200 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-700">Approved</span>
          <span className="text-2xl font-bold text-emerald-900 mt-1">{approvedCount}</span>
        </div>
        <div className="bg-rose-50/60 p-4 rounded-xl shadow-sm border border-rose-200 flex flex-col justify-between">
          <span className="text-xs font-medium text-rose-700">Rejected</span>
          <span className="text-2xl font-bold text-rose-900 mt-1">{rejectedCount}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, employee name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </form>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter size={16} className="text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending HOD">Pending HOD</option>
            <option value="Pending HR">Pending HR</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Clock className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
            <p>Loading compensation requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Info className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">No compensation requests found</p>
            <p className="text-xs">Submit a request or try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request No</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Work Date</th>
                  <th className="py-3.5 px-4">Type & Hours</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Approval Workflow</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {requests.map((item) => {
                  const canHodApprove =
                    (isAdmin || isHR || (isHOD && item.departmentId === user?.departmentId)) &&
                    item.status === "Pending HOD";
                  const canHrApprove = (isAdmin || isHR) && (item.status === "Pending HR" || item.status === "Pending HOD");
                  const canDelete =
                    isAdmin || (item.employeeId === user?.employeeId && item.status === "Pending HOD");

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition duration-150">
                      <td className="py-3.5 px-4 font-mono font-medium text-indigo-950">{item.compensationNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{item.employeeName || "N/A"}</div>
                        <div className="text-xs text-slate-400 font-mono">{item.biometricEmployeeCode || `ID: ${item.employeeId}`}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{item.departmentName || "—"}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.workDate ? new Date(item.workDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">{item.compensationType}</span>
                        <div className="text-xs text-slate-500">{item.hours} hrs</div>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-xs">
                          {/* HOD stage badge */}
                          <span
                            title={item.hodComment ? `HOD Remark: ${item.hodComment}` : "HOD Approval Stage"}
                            className={`px-2 py-0.5 rounded font-medium ${
                              item.hodStatus === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.hodStatus === "Rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            HOD: {item.hodStatus}
                          </span>
                          <ChevronRight size={14} className="text-slate-300" />
                          {/* HR stage badge */}
                          <span
                            title={item.hrComment ? `HR Remark: ${item.hrComment}` : "HR Approval Stage"}
                            className={`px-2 py-0.5 rounded font-medium ${
                              item.hrStatus === "Approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.hrStatus === "Rejected"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            HR: {item.hrStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {canHodApprove && (
                            <button
                              onClick={() => handleOpenApproval(item, "HOD")}
                              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
                            >
                              HOD Review
                            </button>
                          )}
                          {canHrApprove && item.status === "Pending HR" && (
                            <button
                              onClick={() => handleOpenApproval(item, "HR")}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                            >
                              HR Review
                            </button>
                          )}
                          {canHrApprove && item.status === "Pending HOD" && !canHodApprove && (
                            <button
                              onClick={() => handleOpenApproval(item, "HOD")}
                              className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
                            >
                              HOD Review
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition"
                              title="Delete request"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
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

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 bg-indigo-900 text-white">
              <h3 className="font-semibold text-lg flex items-center">
                <Award size={20} className="mr-2 text-indigo-300" /> New Compensation Request
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="p-1 hover:bg-indigo-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              {(isAdmin || isHR) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee (Admin/HR Option)
                  </label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Self ({user?.name || user?.username})</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.candidateName} ({emp.biometricEmployeeCode || emp.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Date *</label>
                  <input
                    type="date"
                    required
                    value={form.workDate}
                    onChange={(e) => setForm({ ...form, workDate: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hours / Duration *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="24"
                    required
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Compensation Type *</label>
                <select
                  value={form.compensationType}
                  onChange={(e) => setForm({ ...form, compensationType: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="Comp-Off Leave">Comp-Off Leave Credit</option>
                  <option value="Overtime Allowance">Overtime Allowance / Monetary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Details *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain extra work, project assignment, or holiday duty performed..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Stage Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-semibold text-lg">
                {approvalStage === "HOD" ? "Department HOD Review" : "HR Final Approval"}
              </h3>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Request Code:</span>
                  <span className="font-mono font-semibold">{selectedRequest.compensationNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold">{selectedRequest.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Work Date & Hours:</span>
                  <span className="font-medium">
                    {new Date(selectedRequest.workDate).toLocaleDateString()} ({selectedRequest.hours} hrs)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type:</span>
                  <span className="font-medium">{selectedRequest.compensationType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Reason:</span>
                  <p className="text-xs bg-white p-2 rounded border border-slate-200 text-slate-700 italic">
                    "{selectedRequest.reason}"
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {approvalStage} Review Remarks / Comments
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter remark for approval or rejection..."
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleProcessApproval("REJECT")}
                  className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleProcessApproval("APPROVE")}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationManagement;

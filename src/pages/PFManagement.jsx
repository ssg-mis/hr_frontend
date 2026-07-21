import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Building,
  Edit2,
  X,
  Users,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { api } from "../lib/api";

const fmtINR = (val) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

const PFManagement = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isHR = useAuthStore((state) => state.isHR);
  const isHOD = useAuthStore((state) => state.isHOD);

  const canEdit = Boolean(isAdmin || isHR); // Only Admin & HR can edit statutory details and opt-in choices

  const isEmployeeOnly = !isAdmin && !isHR && !isHOD;
  const [myPfData, setMyPfData] = useState(null);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    uanNumber: "",
    pfNumber: "",
    isOptedIn: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPfRecords = async () => {
    setLoading(true);
    try {
      if (isEmployeeOnly) {
        const res = await api.get("/pf/my-pf");
        const payload = res?.data || res;
        if (payload?.employeeId || payload?.pfId || res?.success) {
          setMyPfData(res?.data || res);
        }
      } else {
        const res = await api.get("/pf");
        const list = res?.data || (Array.isArray(res) ? res : []);
        setRecords(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Fetch PF records error:", err);
      toast.error(err.message || "Failed to load PF records");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMyPfOptIn = async (newVal) => {
    if (!myPfData) return;
    try {
      const res = await api.put(`/pf/${myPfData.employeeId}`, {
        isOptedIn: newVal,
      });
      if (res?.success || res?.data) {
        toast.success(newVal ? "Enrolled in Provident Fund (PF)" : "Opted out of Provident Fund (PF)");
        setMyPfData((prev) => (prev ? { ...prev, isOptedIn: newVal, calculatedDeduction: newVal ? 1800 : 0 } : prev));
        fetchPfRecords();
      } else {
        toast.error(res?.message || "Failed to update PF preference");
      }
    } catch (err) {
      console.error("PF update error:", err);
      toast.error(err.message || "Failed to update PF preference");
    }
  };

  useEffect(() => {
    fetchPfRecords();
  }, [isEmployeeOnly]);

  const handleOpenEditModal = (rec) => {
    setEditingRecord(rec);
    setEditForm({
      uanNumber: rec.uanNumber || "",
      pfNumber: rec.pfNumber || "",
      isOptedIn: rec.isOptedIn,
    });
  };

  const handleSavePfDetails = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/pf/${editingRecord.employeeId}`, {
        uanNumber: editForm.uanNumber,
        pfNumber: editForm.pfNumber,
        isOptedIn: editForm.isOptedIn,
      });

      if (res?.success || res?.data) {
        toast.success("PF details updated successfully");
        setEditingRecord(null);
        fetchPfRecords();
      } else {
        toast.error(res?.message || "Failed to update PF details");
      }
    } catch (err) {
      console.error("Update PF record error:", err);
      toast.error(err.message || "Failed to update PF details");
    } finally {
      setSubmitting(false);
    }
  };

  // Departments for dropdown filter
  const departments = ["All", ...new Set(records.map((r) => r.department).filter(Boolean))];

  // Filtering
  const filteredRecords = records.filter((r) => {
    if (!r || r.status === "Relieved") return false;
    const nameStr = (r.name || "").toLowerCase();
    const codeStr = (r.employeeCode || "").toLowerCase();
    const uanStr = String(r.uanNumber || "");
    const searchLower = (searchTerm || "").toLowerCase();

    const matchesSearch =
      nameStr.includes(searchLower) ||
      codeStr.includes(searchLower) ||
      uanStr.includes(searchLower);
    const matchesDept = departmentFilter === "All" || r.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  // KPI Calculations
  const totalEmployees = records.length;
  const mandatoryCount = records.filter((r) => r.isMandatory).length;
  const optedInVoluntaryCount = records.filter((r) => !r.isMandatory && r.isOptedIn === true).length;
  const pendingCount = records.filter((r) => !r.isMandatory && (r.isOptedIn === null || r.isOptedIn === undefined)).length;
  const totalEmployeePfDeduction = records.reduce((acc, r) => acc + (r.employeeDeduction || r.calculatedDeduction || 0), 0);
  const totalCompanyPfContribution = records.reduce((acc, r) => acc + (r.companyContribution || r.calculatedDeduction || 0), 0);
  const totalCombinedPf = totalEmployeePfDeduction + totalCompanyPfContribution;

  if (isEmployeeOnly) {
    return (
      <div className="space-y-6 page-content p-6">
        {/* Header Banner */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={28} className="text-indigo-600" />
            <span>My Provident Fund (PF) Details</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View statutory Provident Fund status, member UAN number, and manage your voluntary PF acceptance
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : myPfData ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {myPfData.name} ({myPfData.employeeCode})
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Base Salary: <strong>₹{myPfData.baseSalary?.toLocaleString()}</strong> • Monthly PF Deduction:{" "}
                  <strong className="text-indigo-600 text-sm">₹{myPfData.calculatedDeduction?.toLocaleString()}</strong>
                </p>
              </div>

              {myPfData.isMandatory ? (
                <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                  Mandatory Statutory PF (12% of Base)
                </span>
              ) : myPfData.isOptedIn === true ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                  <CheckCircle size={14} />
                  <span>Opted In (₹1,800/mo)</span>
                </span>
              ) : myPfData.isOptedIn === false ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 self-start sm:self-auto">
                  <XCircle size={14} />
                  <span>Opted Out (₹0/mo)</span>
                </span>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider mb-0.5">
                      <AlertCircle size={12} /> Pending Selection
                    </span>
                    <p className="text-xs text-amber-950 font-semibold">Please select your PF preference:</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleMyPfOptIn(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} />
                      <span>Yes (Opt In)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleMyPfOptIn(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>No (Opt Out)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Universal Account Number (UAN)</span>
                <p className="font-mono text-base font-bold text-gray-900 mt-1">
                  {myPfData.uanNumber ? myPfData.uanNumber : <span className="text-gray-400 italic text-xs">Not set by HR</span>}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Member PF Number</span>
                <p className="font-mono text-base font-bold text-gray-900 mt-1">
                  {myPfData.pfNumber ? myPfData.pfNumber : <span className="text-gray-400 italic text-xs">Not set by HR</span>}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong className="font-semibold">PF Scheme Rules:</strong>
                <p className="mt-0.5">
                  If your base salary is $\le$ ₹15,000, statutory PF is mandatory (12% of actual base salary). If your base salary is &gt; ₹15,000, PF is voluntary. When opted in, deduction is capped at 12% of ₹15,000 (₹1,800/month).
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">PF record not found.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 page-content p-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={28} className="text-indigo-600" />
            <span>Provident Fund (PF) Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage employee statutory Provident Fund contributions, UAN numbers, and opt-in rules
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Employees</p>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalEmployees}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Employee PF Total (12%)</p>
              <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{fmtINR(totalEmployeePfDeduction)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Company PF Total (12%)</p>
              <h3 className="text-2xl font-extrabold text-teal-600 mt-1">{fmtINR(totalCompanyPfContribution)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <Building size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Monthly PF (24%)</p>
              <h3 className="text-2xl font-extrabold text-purple-600 mt-1">{fmtINR(totalCombinedPf)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <strong className="font-semibold">PF Calculation Guidelines:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Base Salary $\le$ ₹15,000:</strong> PF deduction is mandatory at <strong>12% of actual Base Salary</strong> without opt-out.</li>
            <li><strong>Base Salary &gt; ₹15,000:</strong> Voluntary enrollment. If opted in, deduction is capped at <strong>12% of ₹15,000 (₹1,800/month)</strong>. If opted out, deduction is <strong>₹0</strong>.</li>
          </ul>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search code, name, or UAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-gray-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Departments" : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No PF records found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-4">Emp Code</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4 text-right">Base Salary</th>
                  <th className="px-5 py-4 text-center">PF Status</th>
                  <th className="px-5 py-4">UAN Number</th>
                  <th className="px-5 py-4 text-right">Employee PF (12%)</th>
                  <th className="px-5 py-4 text-right">Company PF (12%)</th>
                  <th className="px-5 py-4 text-right">Total PF (24%)</th>
                  {canEdit && <th className="px-5 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm">
                {filteredRecords.map((rec) => {
                  const empDeduction = rec.employeeDeduction ?? rec.calculatedDeduction ?? 0;
                  const compContribution = rec.companyContribution ?? empDeduction;
                  const totalPfVal = rec.totalPf ?? (empDeduction + compContribution);

                  return (
                    <tr key={rec.employeeId} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-4 font-semibold text-gray-900">{rec.employeeCode}</td>
                      <td className="px-5 py-4 font-medium text-gray-800">{rec.name}</td>
                      <td className="px-5 py-4 text-gray-600">{rec.department}</td>
                      <td className="px-5 py-4 text-right font-medium text-gray-900">{fmtINR(rec.baseSalary)}</td>
                      <td className="px-5 py-4 text-center">
                        {rec.isMandatory ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Mandatory (12%)
                          </span>
                        ) : rec.isOptedIn === true ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Opted In (₹1,800)
                          </span>
                        ) : rec.isOptedIn === false ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Opted Out (₹0)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Selection
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-700">
                        {rec.uanNumber ? rec.uanNumber : <span className="text-gray-300 italic">Not set</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-indigo-600">
                        {fmtINR(empDeduction)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-teal-600">
                        {fmtINR(compContribution)}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-purple-700 bg-purple-50/30">
                        {fmtINR(totalPfVal)}
                      </td>
                      {canEdit && (
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-900 font-semibold border border-indigo-200 rounded-lg px-3 py-1.5 bg-indigo-50/50 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Edit2 size={14} />
                            <span>Edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal (Admin / HR) */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Edit PF Configuration</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingRecord.name} ({editingRecord.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePfDetails}>
              <div className="p-6 space-y-4">
                {/* Employee Salary Info */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-500">Base Salary</span>
                    <p className="font-extrabold text-indigo-950 text-base">{fmtINR(editingRecord.baseSalary)}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-500">PF Scheme</span>
                    <p className="font-bold text-indigo-900 text-sm">
                      {editingRecord.isMandatory ? "Mandatory (<= ₹15k)" : "Voluntary (> ₹15k)"}
                    </p>
                  </div>
                </div>

                {/* Voluntary Opt-In Selector (Only if base salary > 15,000) */}
                {!editingRecord.isMandatory ? (
                  <div className="flex flex-col gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">PF Status</label>
                    <select
                      value={editForm.isOptedIn === null || editForm.isOptedIn === undefined ? "pending" : editForm.isOptedIn ? "opted_in" : "opted_out"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm({
                          ...editForm,
                          isOptedIn: val === "pending" ? null : val === "opted_in" ? true : false,
                        });
                      }}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="pending">Pending Selection (Not selected yet)</option>
                      <option value="opted_in">Opted In (₹1,800/mo)</option>
                      <option value="opted_out">Opted Out (₹0/mo)</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium">
                    PF deduction is mandatory for employees with base salary $\le$ ₹15,000.
                  </div>
                )}

                {/* UAN Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    UAN Number (12 Digits)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100912345678"
                    value={editForm.uanNumber}
                    onChange={(e) => setEditForm({ ...editForm, uanNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* PF Number */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Member PF Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MH/BAN/0012345/000/0000123"
                    value={editForm.pfNumber}
                    onChange={(e) => setEditForm({ ...editForm, pfNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-60 shadow-md"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PFManagement;

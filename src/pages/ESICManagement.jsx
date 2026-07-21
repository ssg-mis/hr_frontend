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
  CreditCard,
  PlusCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { api } from "../lib/api";

const fmtINR = (val) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val || 0);

const ESICManagement = () => {
  const user = useAuthStore((state) => state.user);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isHR = useAuthStore((state) => state.isHR);
  const isHOD = useAuthStore((state) => state.isHOD);

  const canEdit = Boolean(isAdmin || isHR);

  const isEmployeeOnly = !isAdmin && !isHR && !isHOD;
  const [myEsicData, setMyEsicData] = useState(null);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({
    esicNumber: "",
    isOptedIn: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEsicRecords = async () => {
    setLoading(true);
    try {
      if (isEmployeeOnly) {
        const res = await api.get("/esic/my-esic");
        const payload = res?.data || res;
        if (payload?.employeeId || payload?.esicId || res?.success) {
          setMyEsicData(res?.data || res);
        }
      } else {
        const res = await api.get("/esic");
        const list = res?.data || (Array.isArray(res) ? res : []);
        setRecords(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error("Fetch ESIC records error:", err);
      toast.error(err.message || "Failed to load ESIC records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEsicRecords();
  }, [isEmployeeOnly]);

  const handleOpenEditModal = (rec) => {
    setEditingRecord(rec);
    setEditForm({
      esicNumber: rec.esicNumber || "",
      isOptedIn: rec.isOptedIn !== false,
    });
  };

  const handleSaveEsicDetails = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    setSubmitting(true);
    try {
      const res = await api.put(`/esic/${editingRecord.employeeId}`, {
        esicNumber: editForm.esicNumber,
        isOptedIn: editForm.isOptedIn,
      });

      if (res?.success || res?.data) {
        toast.success("ESIC details updated successfully");
        setEditingRecord(null);
        fetchEsicRecords();
      } else {
        toast.error(res?.message || "Failed to update ESIC details");
      }
    } catch (err) {
      console.error("Update ESIC record error:", err);
      toast.error(err.message || "Failed to update ESIC details");
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
    const esicStr = String(r.esicNumber || "");
    const searchLower = (searchTerm || "").toLowerCase();

    const matchesSearch =
      nameStr.includes(searchLower) ||
      codeStr.includes(searchLower) ||
      esicStr.includes(searchLower);
    const matchesDept = departmentFilter === "All" || r.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  // KPI Calculations
  const totalEmployees = records.length;
  const totalEmployeeEsic = records.reduce((acc, r) => acc + (r.employeeContribution || 0), 0);
  const totalCompanyEsic = records.reduce((acc, r) => acc + (r.companyContribution || 0), 0);
  const totalCombinedEsic = totalEmployeeEsic + totalCompanyEsic;

  if (isEmployeeOnly) {
    return (
      <div className="space-y-6 page-content p-6">
        {/* Header Banner */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={28} className="text-teal-600" />
            <span>My ESIC Details</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View statutory Employee State Insurance (ESIC) contributions and insurance details
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
          </div>
        ) : myEsicData ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-5 gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {myEsicData.name} ({myEsicData.employeeCode})
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Overall Salary (Base + Allowance): <strong>₹{myEsicData.overallSalary?.toLocaleString()}</strong>
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 self-start sm:self-auto">
                <CheckCircle size={14} />
                <span>ESIC Active (4% Contribution)</span>
              </span>
            </div>

            {/* ESIC Contribution Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100">
                <span className="text-xs text-teal-700 font-bold uppercase tracking-wider">Employee Cut (0.75%)</span>
                <p className="text-xl font-extrabold text-teal-900 mt-1">
                  ₹{myEsicData.employeeContribution?.toLocaleString()} <span className="text-xs font-normal text-teal-700">/ mo</span>
                </p>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <span className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Company Addition (3.25%)</span>
                <p className="text-xl font-extrabold text-indigo-900 mt-1">
                  ₹{myEsicData.companyContribution?.toLocaleString()} <span className="text-xs font-normal text-indigo-700">/ mo</span>
                </p>
              </div>

              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                <span className="text-xs text-purple-700 font-bold uppercase tracking-wider">Total Monthly ESIC (4.0%)</span>
                <p className="text-xl font-extrabold text-purple-900 mt-1">
                  ₹{myEsicData.totalEsic?.toLocaleString()} <span className="text-xs font-normal text-purple-700">/ mo</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">ESIC Insurance Number (IP)</span>
              <p className="font-mono text-base font-bold text-gray-900 mt-1">
                {myEsicData.esicNumber ? myEsicData.esicNumber : <span className="text-gray-400 italic text-xs">Not set by HR</span>}
              </p>
            </div>

            <div className="bg-teal-50 border border-teal-150 rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs text-teal-900 leading-relaxed">
                <strong className="font-semibold">ESIC Statutory Calculation:</strong>
                <p className="mt-0.5">
                  ESIC is calculated on your overall monthly gross salary (Base Salary + Allowances).
                  An employee deduction of <strong>0.75%</strong> is cut from your salary, and the company adds <strong>3.25%</strong>, making a total monthly contribution of <strong>4.0%</strong>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">ESIC record not found.</p>
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
            <ShieldCheck size={28} className="text-teal-600" />
            <span>ESIC Management</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage statutory Employee State Insurance (ESIC) calculations: 0.75% Employee cut, 3.25% Company addition
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
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <Users size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Employee ESIC (0.75%)</p>
              <h3 className="text-2xl font-extrabold text-teal-600 mt-1">{fmtINR(totalEmployeeEsic)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Company ESIC (3.25%)</p>
              <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{fmtINR(totalCompanyEsic)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Building size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Monthly ESIC (4.0%)</p>
              <h3 className="text-2xl font-extrabold text-purple-600 mt-1">{fmtINR(totalCombinedEsic)}</h3>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Rules Notice */}
      <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={20} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 leading-relaxed">
          <strong className="font-semibold">ESIC Scheme Calculation:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li><strong>Overall Salary Base:</strong> Calculated on total gross salary (Base Salary + Allowances).</li>
            <li><strong>Employee Deduction:</strong> <strong>0.75%</strong> cut from overall salary.</li>
            <li><strong>Company Contribution:</strong> <strong>3.25%</strong> added by company.</li>
            <li><strong>Combined Total:</strong> <strong>4.00%</strong> statutory monthly ESIC contribution.</li>
          </ul>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search code, name, or ESIC No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-gray-500" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white font-medium"
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
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No ESIC records found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-4">Emp Code</th>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Department</th>
                  <th className="px-4 py-4 text-right">Base</th>
                  <th className="px-4 py-4 text-right">Allowance</th>
                  <th className="px-4 py-4 text-right font-bold">Overall Salary</th>
                  <th className="px-4 py-4 text-right text-teal-700">Emp ESIC (0.75%)</th>
                  <th className="px-4 py-4 text-right text-indigo-700">Company (3.25%)</th>
                  <th className="px-4 py-4 text-right font-bold text-purple-700">Total ESIC (4%)</th>
                  <th className="px-4 py-4">ESIC No</th>
                  {canEdit && <th className="px-4 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-sm">
                {filteredRecords.map((rec) => (
                  <tr key={rec.employeeId} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-4 font-semibold text-gray-900">{rec.employeeCode}</td>
                    <td className="px-4 py-4 font-medium text-gray-800">{rec.name}</td>
                    <td className="px-4 py-4 text-gray-600">{rec.department}</td>
                    <td className="px-4 py-4 text-right text-gray-700">{fmtINR(rec.baseSalary)}</td>
                    <td className="px-4 py-4 text-right text-gray-700">{fmtINR(rec.allowanceSalary)}</td>
                    <td className="px-4 py-4 text-right font-bold text-gray-900">{fmtINR(rec.overallSalary)}</td>
                    <td className="px-4 py-4 text-right font-medium text-teal-600">{fmtINR(rec.employeeContribution)}</td>
                    <td className="px-4 py-4 text-right font-medium text-indigo-600">{fmtINR(rec.companyContribution)}</td>
                    <td className="px-4 py-4 text-right font-bold text-purple-700 bg-purple-50/30">{fmtINR(rec.totalEsic)}</td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-700">
                      {rec.esicNumber ? rec.esicNumber : <span className="text-gray-300 italic">Not set</span>}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleOpenEditModal(rec)}
                          className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-900 font-semibold border border-teal-200 rounded-lg px-3 py-1.5 bg-teal-50/50 hover:bg-teal-50 transition cursor-pointer"
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit ESIC Details Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Edit ESIC Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingRecord.name} ({editingRecord.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEsicDetails} className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs space-y-1">
                <div className="flex justify-between text-gray-700">
                  <span>Base Salary:</span>
                  <span className="font-semibold">{fmtINR(editingRecord.baseSalary)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Allowance Salary:</span>
                  <span className="font-semibold">{fmtINR(editingRecord.allowanceSalary)}</span>
                </div>
                <div className="flex justify-between text-gray-900 pt-1 border-t border-gray-200 font-bold">
                  <span>Overall Salary:</span>
                  <span>{fmtINR(editingRecord.overallSalary)}</span>
                </div>
                <div className="flex justify-between text-teal-700 pt-1">
                  <span>Employee ESIC Cut (0.75%):</span>
                  <span className="font-bold">{fmtINR(editingRecord.employeeContribution)}</span>
                </div>
                <div className="flex justify-between text-indigo-700">
                  <span>Company ESIC Addition (3.25%):</span>
                  <span className="font-bold">{fmtINR(editingRecord.companyContribution)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  ESIC Insurance Number (17 digits)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 31000987654321098"
                  value={editForm.esicNumber}
                  onChange={(e) => setEditForm({ ...editForm, esicNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isOptedIn"
                  checked={editForm.isOptedIn}
                  onChange={(e) => setEditForm({ ...editForm, isOptedIn: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <label htmlFor="isOptedIn" className="text-xs font-medium text-gray-800 cursor-pointer">
                  Enable ESIC Deduction & Contribution for this employee
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition border border-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save ESIC Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ESICManagement;

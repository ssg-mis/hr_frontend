import React, { useState, useEffect } from "react";
import { Clock, Plus, Search, Calendar, User, X } from "lucide-react";
import toast from "react-hot-toast";

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    shiftId: "A",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  });

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  const fetchShifts = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/shifts`);
      const result = await res.json();
      if (result.success) {
        setShifts(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching shifts:", err);
      toast.error("Failed to load shift assignments");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees/active`);
      const result = await res.json();
      if (result.success) {
        setEmployeesList(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching active employees:", err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchShifts(), fetchEmployees()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.shiftId || !form.effectiveFrom) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/attendance/shifts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: Number(form.employeeId),
          shiftId: form.shiftId,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(result.message || "Shift assigned successfully");
        setShowModal(false);
        // Reset form
        setForm({
          employeeId: "",
          shiftId: "A",
          effectiveFrom: new Date().toISOString().split("T")[0],
          effectiveTo: "",
        });
        await fetchShifts();
      } else {
        throw new Error(result.message || "Failed to assign shift");
      }
    } catch (err) {
      console.error("Submit shift error:", err);
      toast.error(err.message || "Failed to assign shift");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  const filteredShifts = shifts.filter((s) =>
    s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-sm text-gray-500">View and assign work shifts (A, B, C, D) to employees</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition duration-200 cursor-pointer text-sm"
          >
            <Plus size={18} />
            <span>Assign Shift</span>
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by Employee Code or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Shift Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No shift assignments found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Emp Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Shift</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Effective From</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Effective To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredShifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{shift.employeeCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{shift.employeeName}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
                        ${shift.shiftId === "A" ? "bg-purple-100 text-purple-800" : ""}
                        ${shift.shiftId === "B" ? "bg-teal-100 text-teal-800" : ""}
                        ${shift.shiftId === "C" ? "bg-amber-100 text-amber-800" : ""}
                        ${shift.shiftId === "D" ? "bg-rose-100 text-rose-800" : ""}
                      `}>
                        <Clock size={12} />
                        Shift {shift.shiftId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {formatDate(shift.effectiveFrom)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {formatDate(shift.effectiveTo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-950 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                <span>Assign Employee Shift</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Employee select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Employee *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <select
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none appearance-none bg-white"
                    >
                      <option value="">Select Employee</option>
                      {employeesList.map((emp) => (
                        <option key={emp.employee_id} value={emp.employee_id}>
                          {emp.name_as_per_aadhar} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shift ID select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Shift Type *</label>
                  <select
                    name="shiftId"
                    value={form.shiftId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                    <option value="C">Shift C</option>
                    <option value="D">Shift D</option>
                  </select>
                </div>

                {/* Effective dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Effective From *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input
                        type="date"
                        name="effectiveFrom"
                        value={form.effectiveFrom}
                        onChange={handleInputChange}
                        required
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Effective To</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input
                        type="date"
                        name="effectiveTo"
                        value={form.effectiveTo}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
                >
                  {submitting ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;

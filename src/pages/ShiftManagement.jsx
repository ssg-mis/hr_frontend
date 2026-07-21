import React, { useState, useEffect } from "react";
import { Clock, Plus, Search, Calendar, User, X, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const MASTER_SHIFTS = [
  { id: "a", name: "a", startTime: "05:45", endTime: "14:15", label: "Shift A", timing: "5:45 AM - 2:15 PM", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "general", name: "general", startTime: "08:45", endTime: "17:35", label: "General", timing: "8:45 AM - 5:35 PM", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "b", name: "b", startTime: "13:45", endTime: "22:15", label: "Shift B", timing: "1:45 PM - 10:15 PM", color: "bg-teal-100 text-teal-800 border-teal-200" },
  { id: "c", name: "c", startTime: "21:45", endTime: "06:15", label: "Shift C", timing: "9:45 PM - 6:15 AM", color: "bg-amber-100 text-amber-800 border-amber-200" },
];

const ShiftManagement = () => {
  const [shifts, setShifts] = useState([]);
  const [masterShifts, setMasterShifts] = useState(MASTER_SHIFTS);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    shiftId: "general",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
  });

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  const fetchMasterShifts = async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/shifts/master`);
      const result = await res.json();
      if (result.success && result.data && result.data.length > 0) {
        // Merge timings info
        const updated = result.data.map(ms => {
          const matched = MASTER_SHIFTS.find(m => m.name.toLowerCase() === ms.name.toLowerCase());
          return {
            ...ms,
            label: matched?.label || `Shift ${ms.name.toUpperCase()}`,
            timing: matched?.timing || `${ms.startTime} - ${ms.endTime}`,
            color: matched?.color || "bg-indigo-100 text-indigo-800 border-indigo-200",
          };
        });
        setMasterShifts(updated);
      }
    } catch (err) {
      console.error("Error fetching master shifts:", err);
    }
  };

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
    await Promise.all([fetchMasterShifts(), fetchShifts(), fetchEmployees()]);
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
        setForm({
          employeeId: "",
          shiftId: "general",
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
    (s.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.employeeCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.shiftName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getShiftBadge = (shiftName, startTime, endTime) => {
    const sName = (shiftName || "").toLowerCase();
    let badgeStyle = "bg-gray-100 text-gray-800 border-gray-200";
    let label = `Shift ${shiftName}`;
    let time = startTime && endTime ? `${startTime} - ${endTime}` : "";

    if (sName === "a") {
      badgeStyle = "bg-purple-100 text-purple-800 border-purple-200";
      label = "Shift A";
      time = time || "05:45 - 14:15";
    } else if (sName === "general") {
      badgeStyle = "bg-blue-100 text-blue-800 border-blue-200";
      label = "General";
      time = time || "08:45 - 17:35";
    } else if (sName === "b") {
      badgeStyle = "bg-teal-100 text-teal-800 border-teal-200";
      label = "Shift B";
      time = time || "13:45 - 22:15";
    } else if (sName === "c") {
      badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";
      label = "Shift C";
      time = time || "21:45 - 06:15";
    }

    return (
      <div className="flex flex-col gap-0.5">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeStyle}`}>
          <Clock size={12} />
          {label}
        </span>
        {time && <span className="text-[11px] text-gray-500 font-medium pl-1">{time}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-sm text-gray-500">Configure shifts (a, general, b, c) and assign work schedules to employees</p>
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

      {/* Master Shifts Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {masterShifts.map((mShift) => (
          <div
            key={mShift.name}
            className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition duration-200"
          >
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${mShift.color || "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                  Shift {mShift.name.toUpperCase()}
                </span>
                <Clock size={16} className="text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 capitalize text-base">
                {mShift.name === "general" ? "General Shift" : `Shift ${mShift.name.toUpperCase()}`}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {mShift.startTime} to {mShift.endTime}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Timing</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {mShift.timing || `${mShift.startTime} - ${mShift.endTime}`}
              </span>
            </div>
          </div>
        ))}
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
                placeholder="Search by Employee Code, Name, or Shift..."
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
                      {getShiftBadge(shift.shiftName || shift.shiftId, shift.startTime, shift.endTime)}
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
                        <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                          {emp.candidateName || emp.name_as_per_aadhar || emp.name} ({emp.employeeCode || emp.employee_code})
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
                    {masterShifts.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name === "general" ? "General Shift (08:45 - 17:35)" : `Shift ${m.name.toUpperCase()} (${m.startTime} - ${m.endTime})`}
                      </option>
                    ))}
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

import React, { useState, useEffect } from "react";
import { Clock, Plus, Search, Calendar, User, X, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
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

  // Pagination calculations
  const totalPages = Math.ceil(filteredShifts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredShifts.slice(indexOfFirstItem, indexOfLastItem);

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
          <p className="text-sm text-gray-500">Configure shifts (a, general, b, c) and view work schedules of employees</p>
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
          <>
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
                  {currentItems.map((shift) => (
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      Showing <span className="font-bold text-gray-800">{indexOfFirstItem + 1}</span> to{" "}
                      <span className="font-bold text-gray-800">{Math.min(indexOfLastItem, filteredShifts.length)}</span> of{" "}
                      <span className="font-bold text-gray-800">{filteredShifts.length}</span> assignments
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-xs" aria-label="Pagination">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft size={16} />
                      </button>

                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (
                          totalPages > 5 &&
                          pageNum !== 1 &&
                          pageNum !== totalPages &&
                          Math.abs(pageNum - currentPage) > 1
                        ) {
                          if (pageNum === 2 && currentPage > 3) {
                            return (
                              <span key="dots1" className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-300">
                                ...
                              </span>
                            );
                          }
                          if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                            return (
                              <span key="dots2" className="relative inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-500 ring-1 ring-inset ring-gray-300">
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <button
                            type="button"
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-3 py-2 text-xs font-bold ring-1 ring-inset ring-gray-300 cursor-pointer ${
                              currentPage === pageNum
                                ? "z-10 bg-indigo-600 text-white ring-indigo-600"
                                : "text-gray-900 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight size={16} />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal dialog */}

    </div>
  );
};

export default ShiftManagement;

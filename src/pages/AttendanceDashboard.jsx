import React, { useState, useEffect } from "react";
import { Users, UserCheck, UserX, Calendar, Search, Eye, X, Plus, Clock } from "lucide-react";
import toast from "react-hot-toast";

const AttendanceDashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Selected employee session timeline modal
  const [selectedSessionTimeline, setSelectedSessionTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Record Event modal for HR
  const [recordModalEmp, setRecordModalEmp] = useState(null);
  const [eventForm, setEventForm] = useState({
    eventType: "CHECK_IN",
    eventTime: "",
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  const fetchAttendanceData = async (date) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/sessions?date=${date}`);
      const result = await res.json();
      if (result.success) {
        setAttendanceRecords(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch attendance sessions");
      }
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      toast.error(err.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData(selectedDate);
  }, [selectedDate]);

  // Fetch timeline logs for a specific employee session
  const handleOpenTimeline = async (record) => {
    if (!record.sessionId) {
      toast.error("No active check-in session for this employee today");
      return;
    }
    setTimelineLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/sessions/today?employeeId=${record.employeeId}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSelectedSessionTimeline({
          employeeName: record.employeeName,
          employeeCode: record.employeeCode,
          workDate: record.workDate,
          events: result.data.events || [],
        });
      } else {
        toast.error("Failed to load session timeline details");
      }
    } catch (err) {
      console.error("Error loading session timeline details:", err);
      toast.error("Failed to fetch session details");
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleOpenRecordEventModal = (record) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setEventForm({
      eventType: "CHECK_IN",
      eventTime: `${selectedDate}T${timeStr}`,
    });
    setRecordModalEmp(record);
  };

  const handleRecordEventSubmit = async (e) => {
    e.preventDefault();
    if (!recordModalEmp) return;
    setSubmittingEvent(true);
    try {
      const res = await fetch(`${API_URL}/attendance/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: recordModalEmp.employeeId,
          eventType: eventForm.eventType,
          eventTime: eventForm.eventTime,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Attendance event logged successfully");
        setRecordModalEmp(null);
        fetchAttendanceData(selectedDate);
      } else {
        throw new Error(result.message || "Failed to log event");
      }
    } catch (err) {
      console.error("Error logging attendance event:", err);
      toast.error(err.message || "Failed to log event");
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return "0 mins";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculations
  const filteredRecords = attendanceRecords.filter((r) =>
    r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployees = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === "Present").length;
  const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length;
  const leaveCount = attendanceRecords.filter((r) => r.status === "leave").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor and log employee daily attendance (HR Mode)</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Select Date:</label>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <Calendar size={18} className="text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="text-sm font-medium text-gray-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Active Employees */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Employees</span>
              <p className="text-2xl font-extrabold text-gray-800">{totalEmployees}</p>
            </div>
            <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
              <Users size={20} />
            </div>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Present</span>
              <p className="text-2xl font-extrabold text-green-600">{presentCount}</p>
            </div>
            <div className="bg-green-50 p-2.5 rounded-lg text-green-600">
              <UserCheck size={20} />
            </div>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">On Leave</span>
              <p className="text-2xl font-extrabold text-blue-600">{leaveCount}</p>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600">
              <Calendar size={20} />
            </div>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition duration-200">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Absent</span>
              <p className="text-2xl font-extrabold text-red-600">{absentCount}</p>
            </div>
            <div className="bg-red-50 p-2.5 rounded-lg text-red-600">
              <UserX size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Search & Actions toolbar */}
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

        {/* Table representation */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No records found matching the query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Emp Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Work Time</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredRecords.map((record) => (
                  <tr key={record.employeeId} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{record.employeeCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{record.employeeName}</td>
                    <td className="px-6 py-4">
                      {record.status === "Present" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Present
                        </span>
                      )}
                      {record.status === "Absent" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Absent
                        </span>
                      )}
                      {record.status === "leave" && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          On Leave
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      {formatMinutes(record.workMinutes)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {record.isRecorded && (
                          <button
                            onClick={() => handleOpenTimeline(record)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-900 font-semibold cursor-pointer border border-indigo-200 rounded-lg px-2.5 py-1.5 bg-indigo-50/50 hover:bg-indigo-50"
                          >
                            <Eye size={14} />
                            <span>Logs</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenRecordEventModal(record)}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-900 font-semibold cursor-pointer border border-emerald-200 rounded-lg px-2.5 py-1.5 bg-emerald-50/50 hover:bg-emerald-50"
                        >
                          <Plus size={14} />
                          <span>Log Event</span>
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

      {/* Session Timeline Detail Modal */}
      {selectedSessionTimeline && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-950">{selectedSessionTimeline.employeeName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Code: {selectedSessionTimeline.employeeCode}</p>
              </div>
              <button
                onClick={() => setSelectedSessionTimeline(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline Events</h4>
              
              {selectedSessionTimeline.events.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center">No logs found.</p>
              ) : (
                <div className="relative pl-6 border-l border-gray-200 space-y-6">
                  {selectedSessionTimeline.events.map((ev, index) => (
                    <div key={ev.id} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center shadow-sm
                        ${ev.eventType === "CHECK_IN" ? "bg-green-500" : ""}
                        ${ev.eventType === "CHECK_OUT" ? "bg-red-500" : ""}
                        ${ev.eventType === "BREAK_START" ? "bg-yellow-500" : ""}
                        ${ev.eventType === "BREAK_END" ? "bg-indigo-500" : ""}
                      `}></span>
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {ev.eventType === "CHECK_IN" && "Checked In"}
                            {ev.eventType === "CHECK_OUT" && "Checked Out"}
                            {ev.eventType === "BREAK_START" && "Started Break"}
                            {ev.eventType === "BREAK_END" && "Resumed Work"}
                          </h4>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">
                          {formatTime(ev.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedSessionTimeline(null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md transition duration-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Attendance Event Modal (HR Mode) */}
      {recordModalEmp && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-950 flex items-center gap-2">
                <Clock size={20} className="text-emerald-600" />
                <span>Log Attendance Event</span>
              </h3>
              <button
                onClick={() => setRecordModalEmp(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRecordEventSubmit}>
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Employee</span>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">
                    {recordModalEmp.employeeName} ({recordModalEmp.employeeCode})
                  </p>
                </div>

                {/* Event Type select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Event Type *</label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="CHECK_IN">Check In</option>
                    <option value="BREAK_START">Start Break</option>
                    <option value="BREAK_END">End Break</option>
                    <option value="CHECK_OUT">Check Out</option>
                  </select>
                </div>

                {/* Time picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Event Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.eventTime}
                    onChange={(e) => setEventForm({ ...eventForm, eventTime: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRecordModalEmp(null)}
                  className="bg-white border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEvent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55"
                >
                  {submittingEvent ? "Logging..." : "Log Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;

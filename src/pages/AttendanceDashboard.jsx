import React, { useState, useEffect } from "react";
import {
  Users, UserCheck, UserX, Calendar, Search, Eye, X, Plus, Clock, RefreshCw,
  User, Mail, Phone, MapPin, CreditCard, DollarSign, Briefcase, Building, Hash, FileText
} from "lucide-react";
import toast from "react-hot-toast";

const Avatar = ({ name, size = "md" }) => {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  const sz = size === "lg" ? "w-14 h-14 text-lg" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const employeeStatusBadge = (status) => {
  const map = {
    Active: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Working' },
    Pending: { cls: 'bg-amber-50  text-amber-700  border border-amber-200', label: 'Resignation Requested' },
    Relieved: { cls: 'bg-red-50    text-red-700    border border-red-200', label: 'Relieved' },
  };
  const { cls = 'bg-gray-100 text-gray-600 border border-gray-200', label = status } = map[status] || {};
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const AttendanceDashboard = () => {
  const getStartOfMonth = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  };

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState(null);
  
  // Selected employee session timeline modal
  const [selectedSessionTimeline, setSelectedSessionTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Selected employee detailed info modal
  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);
  const [selectedRecordForInfo, setSelectedRecordForInfo] = useState(null);
  const [employeeInfoLoading, setEmployeeInfoLoading] = useState(false);

  // Record Event modal for HR
  const [recordModalEmp, setRecordModalEmp] = useState(null);
  const [eventForm, setEventForm] = useState({
    eventType: "CHECK_IN",
    eventTime: "",
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

  const handleSyncBiometricData = async () => {
    setSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/attendance/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ startDate, endDate }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Biometric sync complete! Processed ${result.data?.totalProcessed || 0} punches.`);
        fetchAttendanceData(startDate, endDate);
      } else {
        throw new Error(result.message || "Sync failed");
      }
    } catch (err) {
      console.error("Error syncing biometric data:", err);
      toast.error(err.message || "Failed to sync biometric data");
    } finally {
      setSyncing(false);
    }
  };

  const fetchAttendanceData = async (start, end) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/sessions?startDate=${start}&endDate=${end}`);
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
    let isCurrent = true;

    const syncAndFetch = async () => {
      if (!startDate || !endDate) return;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) return;

      // 1. Fetch current database records immediately
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
        const result = await res.json();
        if (isCurrent && result.success) {
          setAttendanceRecords(result.data || []);
        }
      } catch (err) {
        console.error("Error fetching existing attendance:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }

      // 2. Trigger the sync from BioTime API
      if (isCurrent) setSyncing(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/attendance/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ startDate, endDate }),
        });
        const result = await res.json();
        if (isCurrent) {
          if (result.success) {
            toast.success(`Biometric sync complete! Processed ${result.data?.totalProcessed || 0} punches.`);
            
            // Refetch updated data from DB
            const refetchRes = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
            const refetchResult = await refetchRes.json();
            if (isCurrent && refetchResult.success) {
              setAttendanceRecords(refetchResult.data || []);
            }
          } else {
            console.warn("BioTime sync failed:", result.message);
            toast.error(result.message || "Failed to sync biometric data");
          }
        }
      } catch (err) {
        console.error("Error syncing biometric data:", err);
        if (isCurrent) toast.error("Failed to sync biometric data");
      } finally {
        if (isCurrent) setSyncing(false);
      }
    };

    syncAndFetch();

    return () => {
      isCurrent = false;
    };
  }, [startDate, endDate]);

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

  const handleOpenEmployeeInfo = async (record) => {
    setSelectedRecordForInfo(record);
    setEmployeeInfoLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/employees?id=${record.employeeId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      const result = await res.json();
      if (result.success && result.data && result.data.length > 0) {
        setSelectedEmployeeInfo(result.data[0]);
      } else {
        toast.error("Failed to load employee details");
      }
    } catch (err) {
      console.error("Error loading employee details:", err);
      toast.error("Failed to fetch employee details");
    } finally {
      setEmployeeInfoLoading(false);
    }
  };

  const formatPunchTime = (dateStr) => {
    if (!dateStr) return "—";
    return formatTime(dateStr);
  };

  const handleOpenRecordEventModal = (record) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setEventForm({
      eventType: "CHECK_IN",
      eventTime: `${startDate}T${timeStr}`,
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
        fetchAttendanceData(startDate, endDate);
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

  const formatMinutes = (minutes) => {
    if (!minutes) return "0 mins";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group daily logs by employee for range summaries
  const employeesSummaryMap = {};
  attendanceRecords.forEach((record) => {
    const empId = record.employeeId;
    if (!employeesSummaryMap[empId]) {
      employeesSummaryMap[empId] = {
        employeeId: empId,
        employeeCode: record.employeeCode,
        employeeName: record.employeeName,
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
        leaveDays: 0,
        workingMinutes: 0,
        overtimeMinutes: 0,
        payableDays: 0.0,
        days: [],
      };
    }

    const emp = employeesSummaryMap[empId];
    emp.days.push(record);

    if (record.status === "Present") {
      if (record.workMinutes >= 480) {
        emp.presentDays++;
        emp.payableDays += 1.0;
      } else {
        emp.halfDays++;
        emp.payableDays += 0.5;
      }
      emp.workingMinutes += record.workMinutes;
      emp.overtimeMinutes += Math.max(0, record.workMinutes - 480);
    } else if (record.status === "leave") {
      emp.leaveDays++;
      emp.payableDays += 1.0;
    } else {
      emp.absentDays++;
      const d = new Date(record.workDate);
      const isWeekoff = (d.getDay() === 0 || d.getDay() === 6);
      if (isWeekoff) {
        emp.payableDays += 1.0;
      }
    }
  });

  const employeesSummaryList = Object.values(employeesSummaryMap);

  const filteredSummaryList = employeesSummaryList.filter((emp) =>
    emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEmployees = employeesSummaryList.length;
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
          <button
            onClick={handleSyncBiometricData}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Biometric Logs"}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <span className="text-xs text-gray-500 font-semibold uppercase">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-sm font-medium text-gray-800 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
              <span className="text-xs text-gray-500 font-semibold uppercase">To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-sm font-medium text-gray-800 focus:outline-none"
              />
            </div>
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

      {/* Biometric Sync Indicator Banner */}
      {syncing && (
        <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 flex items-center gap-3 animate-pulse shadow-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent shrink-0"></div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-indigo-950">Syncing Biometric Logs...</h4>
            <p className="text-xs text-indigo-600 mt-0.5">We are currently fetching and recalculating the latest punches from the ZKTeco BioTime API. The dashboard will automatically refresh shortly.</p>
          </div>
        </div>
      )}

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
        ) : filteredSummaryList.length === 0 ? (
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
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Present</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Half Day</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Absent</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">On Leave</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Overtime (Hrs)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Payable Days</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredSummaryList.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-gray-50/50 transition duration-150">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{emp.employeeCode}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{emp.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold">{emp.presentDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold">{emp.halfDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold text-red-600">{emp.absentDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold text-blue-600">{emp.leaveDays}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold">{(emp.overtimeMinutes / 60).toFixed(1)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 text-center font-bold text-indigo-600 bg-indigo-50/30">{emp.payableDays.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEmployeeLogs(emp)}
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-900 font-semibold cursor-pointer border border-indigo-200 rounded-lg px-3 py-1.5 bg-indigo-50/50 hover:bg-indigo-50"
                      >
                        <Clock size={14} />
                        <span>Logs</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Employee Logs Modal */}
      {selectedEmployeeLogs && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-950 text-lg">Daily Attendance Logs</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Employee: <strong className="text-gray-700">{selectedEmployeeLogs.employeeName}</strong> ({selectedEmployeeLogs.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeLogs(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Check In</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Check Out</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500">Duration</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Raw Punches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {selectedEmployeeLogs.days.map((day) => (
                    <tr key={day.workDate} className="hover:bg-gray-50/50 transition duration-150">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmtDate(day.workDate)}</td>
                      <td className="px-4 py-3">
                        {day.status === "Present" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Present
                          </span>
                        )}
                        {day.status === "Absent" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Absent
                          </span>
                        )}
                        {day.status === "leave" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            On Leave
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">{formatPunchTime(day.punchIn)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">{formatPunchTime(day.punchOut)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-semibold">{day.status === "Present" ? formatMinutes(day.workMinutes) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {day.isRecorded ? (
                          <button
                            onClick={() => handleOpenTimeline(day)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-900 font-semibold cursor-pointer border border-indigo-100 rounded bg-indigo-50/50 px-2 py-1"
                          >
                            <Clock size={12} />
                            <span>Timeline</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Punches</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeLogs(null)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold rounded-lg text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Detailed Employee Info Modal */}
      {selectedEmployeeInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-2xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Gradient Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Avatar name={selectedEmployeeInfo.candidateName} size="lg" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">{selectedEmployeeInfo.candidateName}</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">{selectedEmployeeInfo.employeeCode}</p>
                  <div className="mt-1">{employeeStatusBadge(selectedEmployeeInfo.status)}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedEmployeeInfo(null);
                  setSelectedRecordForInfo(null);
                }}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition duration-150 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
              
              {/* Today's Attendance Highlight Card */}
              {selectedRecordForInfo && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Clock size={14} />
                    <span>Today's Attendance Summary ({selectedDate})</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-55 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status</span>
                      <span className="font-semibold text-gray-800">
                        {selectedRecordForInfo.status === "Present" && (
                          <span className="text-green-600 font-bold">Present</span>
                        )}
                        {selectedRecordForInfo.status === "Absent" && (
                          <span className="text-red-600 font-bold">Absent</span>
                        )}
                        {selectedRecordForInfo.status === "leave" && (
                          <span className="text-blue-600 font-bold">On Leave</span>
                        )}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-55 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Work Time</span>
                      <span className="font-semibold text-gray-800">{formatMinutes(selectedRecordForInfo.workMinutes)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-55 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Punch In</span>
                      <span className="font-semibold text-gray-700">{formatPunchTime(selectedRecordForInfo.punchIn)}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-indigo-55 shadow-sm">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Punch Out</span>
                      <span className="font-semibold text-gray-700">{formatPunchTime(selectedRecordForInfo.punchOut)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* General details grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1.5">
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Email Address</span>
                      <span className="text-gray-800 font-medium break-all">{selectedEmployeeInfo.candidateEmail || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Phone Number</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.candidatePhone || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Present Address</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.presentAddress || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CreditCard size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Aadhar Number</span>
                      <span className="text-gray-800 font-medium font-mono">{selectedEmployeeInfo.aadharNo || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Date of Birth</span>
                      <span className="text-gray-800 font-medium">{fmtDate(selectedEmployeeInfo.dob)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Marital Status</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.maritalStatus || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1.5">
                  Professional Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <Building size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Department</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.departmentName || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Briefcase size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Designation</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.applyingForPost || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Date of Joining</span>
                      <span className="text-gray-800 font-medium">{fmtDate(selectedEmployeeInfo.joiningDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Hash size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Vacancy Number</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.vacancyNumber || "—"}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 md:col-span-2">
                    <FileText size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-semibold text-gray-400 block uppercase">Joining Remark</span>
                      <span className="text-gray-800 font-medium">{selectedEmployeeInfo.joiningRemark || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial details */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-1.5">
                  Compensation Info
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Base Salary</span>
                      <span className="text-base font-extrabold text-gray-800 mt-0.5 block">
                        {selectedEmployeeInfo.baseSalary ? `₹${Number(selectedEmployeeInfo.baseSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "₹0.00"}
                      </span>
                    </div>
                    <DollarSign size={20} className="text-indigo-500 shrink-0" />
                  </div>
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-wider">Allowance Salary</span>
                      <span className="text-base font-extrabold text-gray-800 mt-0.5 block">
                        {selectedEmployeeInfo.allowanceSalary ? `₹${Number(selectedEmployeeInfo.allowanceSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "₹0.00"}
                      </span>
                    </div>
                    <DollarSign size={20} className="text-indigo-500 shrink-0" />
                  </div>
                </div>
              </div>

              {/* Canteen QR code */}
              <div className="pt-4 border-t border-gray-100 flex flex-col items-center">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Employee Canteen QR Code</h4>
                <div className="bg-white p-3 border border-gray-200 rounded-2xl shadow-sm relative group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(selectedEmployeeInfo.employeeCode)}`}
                    alt="Employee QR Code"
                    className="w-32 h-32 object-contain"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 font-mono font-semibold">{selectedEmployeeInfo.employeeCode}</p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedEmployeeInfo(null);
                  setSelectedRecordForInfo(null);
                }}
                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition duration-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceDashboard;

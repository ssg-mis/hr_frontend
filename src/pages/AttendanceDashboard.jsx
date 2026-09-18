import React, { useState, useEffect } from "react";
import {
  Users, UserCheck, UserX, Calendar, Search, Eye, X, Plus, Clock, RefreshCw,
  User, Mail, Phone, MapPin, CreditCard, DollarSign, Briefcase, Building, Hash, FileText, Download, Trash2, Edit3
} from "lucide-react";
import toast from "react-hot-toast";
import ExcelJS from "exceljs";

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

const fmtDate = (d) => {
  if (!d) return '—';
  if (typeof d === 'string' && d.includes('-') && !d.includes('T')) {
    const [y, m, day] = d.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(day).padStart(2, '0')} ${months[(m || 1) - 1]} ${y}`;
  }
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '—';
  return dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

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

  const getTodayStr = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  };

  const [startDate, setStartDate] = useState(getStartOfMonth());
  const [endDate, setEndDate] = useState(getTodayStr());

  // Controlled inputs for date picker (only applied on button click)
  const [filterFrom, setFilterFrom] = useState(getStartOfMonth());
  const [filterTo, setFilterTo] = useState(getTodayStr());

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecords, setTodayRecords] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeLogs, setSelectedEmployeeLogs] = useState(null);

  // Holidays set for fast lookup
  const holidaysSet = React.useMemo(() => {
    const set = new Set();
    const pad = (n) => String(n).padStart(2, '0');
    holidaysList.forEach(h => {
      if (h.type === 'holiday' && h.date) {
        const d = new Date(h.date);
        if (!isNaN(d.getTime())) {
          set.add(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
          set.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
          if (typeof h.date === 'string') set.add(h.date.slice(0, 10));
        }
      }
    });
    return set;
  }, [holidaysList]);

  // Selected employee session timeline modal
  const [selectedSessionTimeline, setSelectedSessionTimeline] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Selected employee detailed info modal
  const [selectedEmployeeInfo, setSelectedEmployeeInfo] = useState(null);
  const [selectedRecordForInfo, setSelectedRecordForInfo] = useState(null);
  const [employeeInfoLoading, setEmployeeInfoLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Record Event modal for HR
  const [recordModalEmp, setRecordModalEmp] = useState(null);
  const [modalTab, setModalTab] = useState("add"); // "add" | "edit"
  const [addForm, setAddForm] = useState({
    eventType: "CHECK_IN",
    eventTime: "",
  });
  const [editForm, setEditForm] = useState({
    checkIn: "",
    checkOut: "",
    status: "Present",
    remarks: "",
    hasExistingPunches: false,
  });
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [deletingPunch, setDeletingPunch] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const safeJson = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, message: `Server error (${res.status})` };
    }
  };

  const fetchTodayRecords = async () => {
    try {
      const today = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      const res = await fetch(`${API_URL}/attendance/sessions?startDate=${todayStr}&endDate=${todayStr}`);
      const result = await safeJson(res);
      if (result.success) {
        setTodayRecords(result.data || []);
      }
    } catch (err) {
      console.error("Error fetching today's records:", err);
    }
  };

  const fetchAttendanceData = async (start, end) => {
    setLoading(true);
    try {
      const [res, calRes] = await Promise.all([
        fetch(`${API_URL}/attendance/sessions?startDate=${start}&endDate=${end}`),
        fetch(`${API_URL}/calendar`).catch(() => null),
      ]);
      const result = await safeJson(res);
      if (result.success) {
        setAttendanceRecords(result.data || []);
      } else {
        throw new Error(result.message || "Failed to fetch attendance sessions");
      }
      if (calRes) {
        const calJson = await safeJson(calRes);
        if (calJson.success && Array.isArray(calJson.data)) {
          setHolidaysList(calJson.data);
        }
      }
      await fetchTodayRecords();
    } catch (err) {
      console.error("Error fetching attendance data:", err);
      toast.error(err.message || "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (!filterFrom || !filterTo) return;
    if (filterFrom > filterTo) {
      toast.error("'From' date cannot be after 'To' date.");
      return;
    }
    setStartDate(filterFrom);
    setEndDate(filterTo);
  };

  useEffect(() => {
    let isCurrent = true;

    const loadAndSync = async () => {
      if (!startDate || !endDate) return;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) return;

      // Step 1: Load existing DB data immediately — no waiting for BioTime
      setLoading(true);
      try {
        const [res, calRes] = await Promise.all([
          fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`),
          fetch(`${API_URL}/calendar`).catch(() => null),
        ]);

        // Parse BOTH before any setState so React batches them in one render
        // This ensures holidaysSet is populated when OT is computed
        const result = await safeJson(res);
        const calJson = calRes ? await safeJson(calRes) : null;

        if (isCurrent) {
          if (result.success) setAttendanceRecords(result.data || []);
          if (calJson && calJson.success && Array.isArray(calJson.data)) setHolidaysList(calJson.data);
        }

        const today = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        const todayRes = await fetch(`${API_URL}/attendance/sessions?startDate=${todayStr}&endDate=${todayStr}`);
        const todayResult = await safeJson(todayRes);
        if (isCurrent && todayResult.success) {
          setTodayRecords(todayResult.data || []);
        }
      } catch (err) {
        console.error("Error fetching existing attendance:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }

      // Step 2: Smart sync in background — backend only fetches BioTime for MISSING dates.
      // Today is excluded from BioTime requests by the backend.
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
        const result = await safeJson(res);
        if (isCurrent) {
          if (result.success) {
            const processed = result.data?.totalProcessed || 0;
            if (processed > 0) {
              // New punches were found — refetch from DB and notify
              toast.success(`Synced ${processed} new punches from BioTime.`);
              const refetchRes = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
              const refetchResult = await safeJson(refetchRes);
              if (isCurrent && refetchResult.success) {
                setAttendanceRecords(refetchResult.data || []);
              }
            }
            // If processed === 0, data was already up to date — no toast needed, silent success
          } else {
            console.warn("BioTime sync failed:", result.message);
            toast.error(result.message || "Failed to sync biometric data");
          }
        }
      } catch (err) {
        console.error("Error syncing biometric data:", err);
        if (isCurrent) toast.error("Failed to sync biometric data");
      } finally {
        setSyncing(false);
      }
    };

    loadAndSync();

    return () => {
      isCurrent = false;
      setSyncing(false);
    };
  }, [startDate, endDate]);

  // Fetch timeline logs for a specific employee session
  const handleOpenTimeline = async (record) => {
    const dateStr = record.workDate ? new Date(record.workDate).toISOString().split('T')[0] : '';
    setTimelineLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/sessions/today?employeeId=${record.employeeId}&date=${dateStr}`);
      const result = await res.json();
      if (result.success && result.data) {
        setSelectedSessionTimeline({
          employeeName: record.employeeName,
          employeeCode: record.employeeCode,
          workDate: record.workDate,
          shiftName: result.data.shiftName || record.shiftName,
          startTime: result.data.startTime || record.startTime,
          endTime: result.data.endTime || record.endTime,
          firstCheckIn: result.data.firstCheckIn || record.punchIn,
          lastCheckOut: result.data.lastCheckOut || record.punchOut,
          workingMinutes: result.data.workingMinutes || record.workMinutes,
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

  const handleDailyOtChange = async (day, val) => {
    const otHours = parseFloat(val) || 0;
    const otMinutes = Math.round(otHours * 60);

    setSelectedEmployeeLogs((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.sessionId === day.sessionId || (d.employeeId === day.employeeId && d.workDate === day.workDate)
            ? { ...d, customOtHours: val, effectiveOtMinutes: otMinutes, overtimeMinutes: otMinutes }
            : d
        ),
      };
    });

    setAttendanceRecords((prev) =>
      prev.map((d) =>
        d.sessionId === day.sessionId || (d.employeeId === day.employeeId && d.workDate === day.workDate)
          ? { ...d, customOtHours: val, effectiveOtMinutes: otMinutes, overtimeMinutes: otMinutes }
          : d
      )
    );

    try {
      const token = localStorage.getItem("token");
      const dateStr = typeof day.workDate === "string" ? day.workDate.slice(0, 10) : new Date(day.workDate).toISOString().slice(0, 10);
      const res = await fetch(`${API_URL}/attendance/overtime`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employeeId: day.employeeId,
          date: dateStr,
          sessionSeq: day.sessionSeq || 1,
          overtimeHours: otHours,
          overtimeMinutes: otMinutes,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Overtime updated successfully");
      }
    } catch (err) {
      console.error("Failed to save overtime:", err);
      toast.error("Failed to save overtime");
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

  const handleOpenRecordEventModal = (record, preferredTab = null) => {
    const pad = (n) => String(n).padStart(2, "0");
    const toDtLocal = (dVal) => {
      if (!dVal) return "";
      const d = new Date(dVal);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const workDateKey = typeof record.workDate === "string" 
      ? record.workDate.slice(0, 10) 
      : (record.workDate ? new Date(record.workDate).toISOString().slice(0, 10) : startDate);

    const hasPunchIn = Boolean(record.punchIn);
    const hasPunchOut = Boolean(record.punchOut);
    const hasPunches = hasPunchIn || hasPunchOut || Boolean(record.isRecorded);

    // Populate Old Add Form
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setAddForm({
      eventType: hasPunchIn && !hasPunchOut ? "CHECK_OUT" : "CHECK_IN",
      eventTime: `${workDateKey}T${timeStr}`,
    });

    // Populate Edit Form
    setEditForm({
      checkIn: hasPunchIn ? toDtLocal(record.punchIn) : (hasPunches ? "" : `${workDateKey}T08:45`),
      checkOut: hasPunchOut ? toDtLocal(record.punchOut) : "",
      status: record.status || "Present",
      remarks: record.remarks || "",
      hasExistingPunches: hasPunches,
    });

    const activeTab = preferredTab || (hasPunches ? "edit" : "add");
    setModalTab(activeTab);

    setRecordModalEmp({
      ...record,
      employeeId: record.employeeId || selectedEmployeeLogs?.employeeId,
      employeeName: record.employeeName || selectedEmployeeLogs?.employeeName,
      employeeCode: record.employeeCode || selectedEmployeeLogs?.employeeCode,
    });
  };

  // 1. Old Add Event submit handler (POST /attendance/events)
  const handleAddEventSubmit = async (e, target = "db") => {
    e.preventDefault();
    if (!recordModalEmp || !addForm.eventTime) return;
    setSubmittingEvent(true);
    try {
      const token = localStorage.getItem("token");
      const targetEmpId = recordModalEmp.employeeId || selectedEmployeeLogs?.employeeId;
      const endpoint = target === "biotime" ? "/attendance/events/biotime" : "/attendance/events";

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employeeId: targetEmpId,
          eventType: addForm.eventType,
          eventTime: addForm.eventTime,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success(target === "biotime" ? "Punch pushed to BioTime and logged" : "Attendance event logged successfully");
        setRecordModalEmp(null);

        // Refetch sessions from backend to update UI
        const refetchRes = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
        const refetchResult = await refetchRes.json();
        if (refetchResult.success) {
          setAttendanceRecords(refetchResult.data || []);
        }
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

  // 2. Edit / Update Punch handler (PUT /attendance/events)
  const handleUpdatePunchSubmit = async (e) => {
    e.preventDefault();
    if (!recordModalEmp) return;
    setSubmittingEvent(true);
    try {
      const token = localStorage.getItem("token");
      const workDateStr = typeof recordModalEmp.workDate === "string" 
        ? recordModalEmp.workDate.slice(0, 10) 
        : new Date(recordModalEmp.workDate).toISOString().slice(0, 10);

      const targetEmpId = recordModalEmp.employeeId || selectedEmployeeLogs?.employeeId;

      const payload = {
        employeeId: targetEmpId,
        date: workDateStr,
        checkIn: editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null,
        checkOut: editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null,
        status: editForm.status,
        remarks: editForm.remarks || "Manual punch update by Admin",
      };

      const res = await fetch(`${API_URL}/attendance/events`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Attendance punch updated successfully");
        setRecordModalEmp(null);

        // Refetch sessions from backend to update UI
        const refetchRes = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
        const refetchResult = await refetchRes.json();
        if (refetchResult.success) {
          setAttendanceRecords(refetchResult.data || []);
        }
      } else {
        throw new Error(result.message || "Failed to update attendance");
      }
    } catch (err) {
      console.error("Error saving attendance punch:", err);
      toast.error(err.message || "Failed to update attendance");
    } finally {
      setSubmittingEvent(false);
    }
  };

  // 3. Delete Punch handler (DELETE /attendance/events)
  const handleDeletePunch = async () => {
    if (!recordModalEmp) return;
    const workDateStr = typeof recordModalEmp.workDate === "string" 
      ? recordModalEmp.workDate.slice(0, 10) 
      : new Date(recordModalEmp.workDate).toISOString().slice(0, 10);

    const empName = recordModalEmp.employeeName || selectedEmployeeLogs?.employeeName || "Employee";

    if (!window.confirm(`Are you sure you want to delete attendance punches for ${empName} on ${fmtDate(workDateStr)}? The day will revert to Absent.`)) {
      return;
    }

    setDeletingPunch(true);
    try {
      const token = localStorage.getItem("token");
      const targetEmpId = recordModalEmp.employeeId || selectedEmployeeLogs?.employeeId;

      const res = await fetch(`${API_URL}/attendance/events`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employeeId: targetEmpId,
          date: workDateStr,
        }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Attendance punch deleted successfully");
        setRecordModalEmp(null);

        // Refetch sessions from backend to update UI
        const refetchRes = await fetch(`${API_URL}/attendance/sessions?startDate=${startDate}&endDate=${endDate}`);
        const refetchResult = await refetchRes.json();
        if (refetchResult.success) {
          setAttendanceRecords(refetchResult.data || []);
        }
      } else {
        throw new Error(result.message || "Failed to delete punch");
      }
    } catch (err) {
      console.error("Error deleting attendance punch:", err);
      toast.error(err.message || "Failed to delete punch");
    } finally {
      setDeletingPunch(false);
    }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return "0 mins";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "—";
    if (typeof dateStr === "string" && (dateStr.includes(" ") || dateStr.includes("T"))) {
      const parts = dateStr.trim().split(/[ T]/);
      if (parts.length >= 2 && parts[1]) {
        const timeParts = parts[1].split(":");
        if (timeParts.length >= 2) {
          let hours = parseInt(timeParts[0], 10);
          const minutes = timeParts[1].padStart(2, "0");
          if (!isNaN(hours)) {
            const ampm = hours >= 12 ? "pm" : "am";
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hrsStr = String(hours).padStart(2, "0");
            return `${hrsStr}:${minutes} ${ampm}`;
          }
        }
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hrsStr = String(hours).padStart(2, "0");
    return `${hrsStr}:${minutes} ${ampm}`;
  };


  // Group daily logs by employee for range summaries (using exact Payroll calculation logic)
  const employeesSummaryMap = {};
  attendanceRecords.forEach((record) => {
    const empId = record.employeeId;
    if (!employeesSummaryMap[empId]) {
      employeesSummaryMap[empId] = {
        employeeId: empId,
        employeeCode: record.employeeCode,
        employeeName: record.employeeName,
        assignedShiftName: record.assignedShiftName,
        assignedShiftStartTime: record.assignedShiftStartTime,
        assignedShiftEndTime: record.assignedShiftEndTime,
        weeklyOffDay: (record.weeklyOffDay || "SUN").toUpperCase(),
        days: [],
      };
    }
    employeesSummaryMap[empId].days.push(record);
    if (record.weeklyOffDay) {
      employeesSummaryMap[empId].weeklyOffDay = record.weeklyOffDay.toUpperCase();
    }
  });

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const pad = (n) => String(n).padStart(2, "0");

  const toDateKey = (d) => {
    if (!d) return "";
    if (typeof d === "string") return d.slice(0, 10);
    if (d instanceof Date) {
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    }
    return "";
  };

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  let totalRangeDays = 0;
  let rangeDates = [];
  if (startDate && endDate) {
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const sDt = new Date(Date.UTC(sy, sm - 1, sd));
    const eDt = new Date(Date.UTC(ey, em - 1, ed));
    totalRangeDays = Math.max(0, Math.round((eDt.getTime() - sDt.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    for (let i = 0; i < totalRangeDays; i++) {
      const cur = new Date(Date.UTC(sy, sm - 1, sd + i));
      rangeDates.push({
        dateStr: `${cur.getUTCFullYear()}-${pad(cur.getUTCMonth() + 1)}-${pad(cur.getUTCDate())}`,
        dayName: dayNames[cur.getUTCDay()],
        dt: cur,
      });
    }
  }

  Object.values(employeesSummaryMap).forEach((emp) => {
    const presentDates = new Set();
    const paidLeavesDates = new Set();
    const halfDayDates = new Set();
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;

    emp.days.forEach((record) => {
      const dateKey = toDateKey(record.workDate);
      const statusLower = (record.status || "").toLowerCase();
      const hasPunches = Boolean(record.punchIn) || Boolean(record.punchOut);
      const isPresent = hasPunches || (statusLower === "present" && !record.isWeeklyOff);
      const isLeave = statusLower === "leave";

      let calcMinutes = record.workMinutes || 0;
      if (!calcMinutes && record.punchIn && record.punchOut) {
        const inTime = new Date(record.punchIn).getTime();
        const outTime = new Date(record.punchOut).getTime();
        if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
          let diff = (outTime - inTime) / (1000 * 60);
          if (diff < 0) diff += 24 * 60;
          calcMinutes = Math.round(diff);
        }
      }

      const sStart = record.startTime || "08:45";
      const sEnd = record.endTime || "17:35";
      const [sH = 8, sM = 45] = sStart.split(":").map(Number);
      const [eH = 17, eM = 35] = sEnd.split(":").map(Number);
      const shiftStartMins = sH * 60 + sM;
      const shiftEndMins = eH * 60 + eM;
      const isNightShift = shiftEndMins < shiftStartMins;
      const expShiftMins = isNightShift ? (1440 - shiftStartMins) + shiftEndMins : shiftEndMins - shiftStartMins;
      const halfShiftThreshold = Math.floor(expShiftMins / 2);

      const isHoliday = holidaysSet.has(dateKey);
      let dayOtMinutes = 0;
      if (record.overtimeMinutes !== undefined && record.overtimeMinutes !== null && Number(record.overtimeMinutes) > 0) {
        dayOtMinutes = Number(record.overtimeMinutes);
      } else if (isHoliday && isPresent && (record.punchIn || record.punchOut)) {
        // Only credit 8 hrs OT if employee actually punched in/out on the holiday
        dayOtMinutes = 480;
      }
      record.effectiveOtMinutes = dayOtMinutes;
      totalOvertimeMinutes += dayOtMinutes;

      if (isPresent) {
        if (dateKey) presentDates.add(dateKey);
        totalWorkingMinutes += calcMinutes;
        const isWeekoffDay = record.isWeeklyOff === true;
        if (!isWeekoffDay && (statusLower === "halfday" || statusLower === "half_day" || statusLower === "half day")) {
          halfDayDates.add(dateKey);
        }
      } else if (isLeave) {
        if (dateKey) paidLeavesDates.add(dateKey);
      }
    });

    const targetWo = (emp.weeklyOffDay || "SUN").toUpperCase();
    let workedWoCount = 0;
    let unworkedEarnedWoCount = 0;
    let disallowedWo = 0;
    let workedHolidayCount = 0;
    let unworkedEarnedHolidayCount = 0;
    let disallowedHolidayCount = 0;
    let elapsedDaysInPeriod = 0;

    rangeDates.forEach(({ dateStr, dayName, dt }) => {
      if (dateStr <= todayKey) {
        elapsedDaysInPeriod++;
      }

      // Skip future dates — WOs/Holidays not yet reached should not be counted
      if (dateStr > todayKey) return;

      const isWo = dayName === targetWo;
      const isHoliday = holidaysSet.has(dateStr);

      if (isWo) {
        if (presentDates.has(dateStr)) {
          workedWoCount++;
          return;
        }
        if (paidLeavesDates.has(dateStr)) {
          unworkedEarnedWoCount++;
          return;
        }

        // Check 1 day before (WO - 1)
        const prevDt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - 1));
        const prevDateStr = `${prevDt.getUTCFullYear()}-${pad(prevDt.getUTCMonth() + 1)}-${pad(prevDt.getUTCDate())}`;
        const isPrevPresent = presentDates.has(prevDateStr) || paidLeavesDates.has(prevDateStr);

        // Check 1 day after (WO + 1)
        const nextDt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1));
        const nextDateStr = `${nextDt.getUTCFullYear()}-${pad(nextDt.getUTCMonth() + 1)}-${pad(nextDt.getUTCDate())}`;
        const isNextPresent = presentDates.has(nextDateStr) || paidLeavesDates.has(nextDateStr);

        if (isPrevPresent || isNextPresent) {
          unworkedEarnedWoCount++;
        } else {
          disallowedWo++;
        }
      } else if (isHoliday) {
        // Holiday falling on a working day (e.g. 15 Aug Saturday)
        if (presentDates.has(dateStr)) {
          workedHolidayCount++;
          return;
        }
        if (paidLeavesDates.has(dateStr)) {
          unworkedEarnedHolidayCount++;
          return;
        }

        // Check 1 day before (Holiday - 1)
        const prevDt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() - 1));
        const prevDateStr = `${prevDt.getUTCFullYear()}-${pad(prevDt.getUTCMonth() + 1)}-${pad(prevDt.getUTCDate())}`;
        const isPrevPresent = presentDates.has(prevDateStr) || paidLeavesDates.has(prevDateStr);

        // Check 1 day after (Holiday + 1)
        const nextDt = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate() + 1));
        const nextDateStr = `${nextDt.getUTCFullYear()}-${pad(nextDt.getUTCMonth() + 1)}-${pad(nextDt.getUTCDate())}`;
        const isNextPresent = presentDates.has(nextDateStr) || paidLeavesDates.has(nextDateStr);

        if (isPrevPresent || isNextPresent) {
          unworkedEarnedHolidayCount++;
        } else {
          disallowedHolidayCount++;
        }
      }
    });

    const totalEarnedWo = workedWoCount + unworkedEarnedWoCount;
    const halfDaysCount = halfDayDates.size;
    const presentDaysCount = presentDates.size;
    const paidLeavesCount = paidLeavesDates.size;

    // Exact Payroll Calculation:
    // Payable Days = Present (physically worked) + Paid Leaves + Earned unworked WOs + Earned unworked Holidays - (half-day penalty)
    const payableDays = presentDaysCount + paidLeavesCount + unworkedEarnedWoCount + unworkedEarnedHolidayCount - (halfDaysCount * 0.5);
    const absentDays = Math.max(0, Math.round(elapsedDaysInPeriod - (presentDaysCount + paidLeavesCount + unworkedEarnedWoCount + unworkedEarnedHolidayCount)));

    // Standard Display: Present = physical days worked, excluding days where employee worked on WO
    emp.presentDays = Math.max(0, presentDaysCount - workedWoCount);
    emp.halfDays = halfDaysCount;
    emp.absentDays = absentDays;
    emp.weekoffDays = totalEarnedWo;
    emp.leaveDays = paidLeavesCount;
    emp.payableDays = payableDays;
    emp.workingMinutes = totalWorkingMinutes;
    emp.overtimeMinutes = totalOvertimeMinutes;
  });

  const employeesSummaryList = Object.values(employeesSummaryMap);

  const filteredSummaryList = employeesSummaryList.filter((emp) =>
    emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFilteredCount = filteredSummaryList.length;
  const totalPages = Math.ceil(totalFilteredCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSummaryList = filteredSummaryList.slice(startIndex, startIndex + pageSize);

  const totalEmployees = employeesSummaryList.length;
  const presentCount = todayRecords.filter(
    (r) => (r.status || "").toLowerCase() === "present" || Boolean(r.punchIn)
  ).length;
  const leaveCount = todayRecords.filter(
    (r) => (r.status || "").toLowerCase() === "leave" && !r.punchIn
  ).length;
  const absentCount = todayRecords.filter(
    (r) => (r.status || "").toLowerCase() === "absent" && !r.punchIn
  ).length;

  // Filter-wise Attendance Excel Export using ExcelJS
  const exportAttendanceToExcel = async () => {
    try {
      if (!filteredSummaryList || filteredSummaryList.length === 0) {
        toast.error("No attendance data available to export for current filters.");
        return;
      }

      toast.loading("Generating Attendance Excel...", { id: "att-export" });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "HR FMS System";
      workbook.lastModifiedBy = "HR Admin";
      workbook.created = new Date();
      workbook.modified = new Date();

      const worksheet = workbook.addWorksheet("Attendance Summary", {
        views: [{ showGridLines: true }]
      });

      // 1. Title Banner (Merged A1:K1)
      worksheet.mergeCells("A1:K1");
      const titleCell = worksheet.getCell("A1");
      titleCell.value = "EMPLOYEE ATTENDANCE SUMMARY REPORT";
      titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" } // Dark Navy Blue
      };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(1).height = 28;

      // 2. Filter Subtitle (Merged A2:K2)
      worksheet.mergeCells("A2:K2");
      const subtitleCell = worksheet.getCell("A2");
      const searchNote = searchTerm ? ` | Search: "${searchTerm}"` : "";
      subtitleCell.value = `Period: ${filterFrom} to ${filterTo} | Total Records: ${filteredSummaryList.length}${searchNote} | Generated: ${new Date().toLocaleDateString("en-IN")}`;
      subtitleCell.font = { name: "Calibri", size: 9, italic: true, color: { argb: "FF334155" } };
      subtitleCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" } // Slate 100
      };
      subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(2).height = 20;

      // Blank Row 3
      worksheet.getRow(3).height = 10;

      // 3. Header Row (Row 4)
      const headers = [
        "Sr. No.",
        "Emp Code",
        "Employee Name",
        "Assigned Shift",
        "Present Days",
        "Half Day",
        "Absent Days",
        "Weekly Off (WO)",
        "On Leave",
        "Overtime (Hrs)",
        "Payable Days"
      ];

      const headerRow = worksheet.getRow(4);
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4338CA" } // Indigo 700
        };
        cell.alignment = {
          horizontal: idx >= 4 ? "center" : idx === 0 ? "center" : "left",
          vertical: "middle"
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "medium", color: { argb: "FF1E1B4B" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };
      });
      headerRow.height = 24;

      // 4. Data Rows (Row 5 onwards)
      let totalPresent = 0;
      let totalHalf = 0;
      let totalAbsent = 0;
      let totalWo = 0;
      let totalLeave = 0;
      let totalOtHrs = 0;
      let totalPayable = 0;

      filteredSummaryList.forEach((emp, index) => {
        const rowIdx = index + 5;
        const row = worksheet.getRow(rowIdx);
        const isEven = index % 2 === 0;

        const shiftStr = `${emp.assignedShiftName || "General"} (${emp.assignedShiftStartTime || "08:45"}-${emp.assignedShiftEndTime || "17:35"})`;
        const otHrs = Number((emp.overtimeMinutes / 60).toFixed(1));
        const payable = Number(emp.payableDays.toFixed(1));

        totalPresent += (emp.presentDays || 0);
        totalHalf += (emp.halfDays || 0);
        totalAbsent += (emp.absentDays || 0);
        totalWo += (emp.weekoffDays || 0);
        totalLeave += (emp.leaveDays || 0);
        totalOtHrs += otHrs;
        totalPayable += payable;

        const rowValues = [
          index + 1,
          emp.employeeCode,
          emp.employeeName,
          shiftStr,
          emp.presentDays ?? 0,
          emp.halfDays ?? 0,
          emp.absentDays ?? 0,
          emp.weekoffDays ?? 0,
          emp.leaveDays ?? 0,
          otHrs,
          payable
        ];

        rowValues.forEach((val, cIdx) => {
          const cell = row.getCell(cIdx + 1);
          cell.value = val;
          cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
          cell.alignment = {
            horizontal: cIdx >= 4 ? "center" : cIdx === 0 ? "center" : "left",
            vertical: "middle"
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFFFFFFF" : "FFF8FAFC" }
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } }
          };
        });
        row.height = 20;
      });

      // 5. Total Row
      const totalRowIdx = filteredSummaryList.length + 5;
      const totalRow = worksheet.getRow(totalRowIdx);
      const totalValues = [
        "",
        "TOTAL",
        `(${filteredSummaryList.length} Employees)`,
        "",
        totalPresent,
        totalHalf,
        totalAbsent,
        totalWo,
        totalLeave,
        Number(totalOtHrs.toFixed(1)),
        Number(totalPayable.toFixed(1))
      ];

      totalValues.forEach((val, cIdx) => {
        const cell = totalRow.getCell(cIdx + 1);
        cell.value = val;
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF0F172A" } };
        cell.alignment = {
          horizontal: cIdx >= 4 ? "center" : cIdx === 1 ? "center" : "left",
          vertical: "middle"
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFEF08A" } // Soft Amber / Yellow
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "double", color: { argb: "FF0F172A" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };
      });
      totalRow.height = 22;

      // 6. Column Widths
      worksheet.columns = [
        { width: 8 },  // Sr. No.
        { width: 14 }, // Emp Code
        { width: 26 }, // Employee Name
        { width: 24 }, // Assigned Shift
        { width: 14 }, // Present Days
        { width: 12 }, // Half Day
        { width: 14 }, // Absent Days
        { width: 16 }, // Weekly Off
        { width: 12 }, // On Leave
        { width: 16 }, // Overtime (Hrs)
        { width: 16 }  // Payable Days
      ];

      // 7. Write to Buffer & Trigger Browser Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `Attendance_Summary_${filterFrom}_to_${filterTo}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      toast.success("Attendance summary exported successfully!", { id: "att-export" });
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error("Failed to export Excel. Please try again.", { id: "att-export" });
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Dashboard</h1>
          <p className="text-sm text-gray-500">Monitor and log employee daily attendance (HR Mode)</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2">
          {/* From – To date range filter */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-500">From</span>
            <input
              type="date"
              id="att-filter-from"
              value={filterFrom}
              max={filterTo}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="text-xs border-0 outline-none bg-transparent text-gray-700 font-medium cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-semibold text-gray-500">To</span>
            <input
              type="date"
              id="att-filter-to"
              value={filterTo}
              min={filterFrom}
              onChange={(e) => setFilterTo(e.target.value)}
              className="text-xs border-0 outline-none bg-transparent text-gray-700 font-medium cursor-pointer"
            />
          </div>
          <button
            id="att-filter-apply"
            onClick={applyDateFilter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Search size={13} />
            Apply
          </button>
          <button
            onClick={exportAttendanceToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
            title="Export filtered attendance summary to Excel"
          >
            <Download size={13} />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleSyncBiometricData}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing..." : "Sync Biometric"}</span>
          </button>
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
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Present Today</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">On Leave Today</span>
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
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Absent Today</span>
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
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 shadow-sm bg-gray-50 border-b border-gray-200">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Emp Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Name</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Shift</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Present</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Half Day</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Absent</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-purple-600 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">WO</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">On Leave</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Overtime (Hrs)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Payable Days</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right sticky top-0 bg-gray-50 z-20 border-b border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {paginatedSummaryList.map((emp) => {
                  const sName = emp.assignedShiftName || 'general';
                  const sStart = emp.assignedShiftStartTime || '08:45';
                  const sEnd = emp.assignedShiftEndTime || '17:35';

                  return (
                    <tr key={emp.employeeId} className="hover:bg-gray-50/50 transition duration-150">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{emp.employeeCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{emp.employeeName}</td>
                      <td className="px-6 py-4 text-xs font-medium">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {sName === 'general' ? 'General' : `Shift ${sName.toUpperCase()}`} ({sStart}-{sEnd})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold">{emp.presentDays}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold">{emp.halfDays}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold text-red-600">{emp.absentDays}</td>
                      <td className="px-6 py-4 text-sm text-center font-bold text-purple-700">{emp.weekoffDays}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 text-center font-semibold text-blue-600">{emp.leaveDays}</td>
                      <td className="px-6 py-4 text-sm text-center font-bold text-emerald-600">{(emp.overtimeMinutes / 60).toFixed(1)}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalFilteredCount > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-gray-600">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-gray-900">{startIndex + 1}</strong> to{" "}
                <strong className="text-gray-900">{Math.min(startIndex + pageSize, totalFilteredCount)}</strong> of{" "}
                <strong className="text-gray-900">{totalFilteredCount}</strong> employees
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-gray-500">Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-sm"
              >
                Previous
              </button>

              <span className="px-3 py-1.5 font-bold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-sm">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Employee Logs Modal */}
      {selectedEmployeeLogs && (() => {
        const activeEmp = employeesSummaryMap[selectedEmployeeLogs.employeeId] || selectedEmployeeLogs;
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl mx-auto shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-950 text-lg">Daily Attendance Logs</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Employee: <strong className="text-gray-700">{activeEmp.employeeName}</strong> ({activeEmp.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeLogs(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content — fixed height scroll area */}
            <div className="overflow-auto flex-1" style={{ maxHeight: 'calc(90vh - 130px)' }}>
              <table className="w-full text-left border-collapse" style={{ minWidth: '900px' }}>
                <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 shadow-sm">
                  <tr>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Date</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Shift</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-purple-500 whitespace-nowrap">WO</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Check In</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Check Out</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Duration</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-amber-600 text-center whitespace-nowrap">OT (HRS)</th>
                    <th className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {[...activeEmp.days]
                    .sort((a, b) => {
                      const dDiff = new Date(a.workDate) - new Date(b.workDate);
                      if (dDiff !== 0) return dDiff;
                      return (a.sessionSeq || 1) - (b.sessionSeq || 1);
                    })
                    .map((day) => {
                      let mins = day.workMinutes || 0;
                      if (!mins && day.punchIn && day.punchOut) {
                        const inTime = new Date(day.punchIn).getTime();
                        const outTime = new Date(day.punchOut).getTime();
                        if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
                          let diff = (outTime - inTime) / (1000 * 60);
                          if (diff < 0) diff += 24 * 60;
                          mins = Math.round(diff);
                        }
                      }
                      const dateKey = typeof day.workDate === 'string' ? day.workDate.slice(0, 10) : new Date(day.workDate).toISOString().slice(0, 10);
                      const isHoliday = day.isHoliday || holidaysSet.has(dateKey);
                      const isPhysicalPresent = Boolean(day.punchIn) || Boolean(day.punchOut);
                      const isWeekoff = Boolean(day.isWeeklyOff) || (day.status || '').toLowerCase() === 'weekoff' || (day.status || '').toLowerCase() === 'wo';

                      // Proximity check for holiday without punches:
                      const prevDayRecord = selectedEmployeeLogs?.days?.find((d) => {
                        const dKey = typeof d.workDate === 'string' ? d.workDate.slice(0, 10) : new Date(d.workDate).toISOString().slice(0, 10);
                        const diff = Math.round((new Date(dateKey).getTime() - new Date(dKey).getTime()) / (24 * 60 * 60 * 1000));
                        return diff === 1 && ((d.status || '').toLowerCase() === 'present' || Boolean(d.punchIn) || Boolean(d.punchOut) || (d.status || '').toLowerCase() === 'leave');
                      });
                      const nextDayRecord = selectedEmployeeLogs?.days?.find((d) => {
                        const dKey = typeof d.workDate === 'string' ? d.workDate.slice(0, 10) : new Date(d.workDate).toISOString().slice(0, 10);
                        const diff = Math.round((new Date(dKey).getTime() - new Date(dateKey).getTime()) / (24 * 60 * 60 * 1000));
                        return diff === 1 && ((d.status || '').toLowerCase() === 'present' || Boolean(d.punchIn) || Boolean(d.punchOut) || (d.status || '').toLowerCase() === 'leave');
                      });
                      const isHolidayEarned = isHoliday && (isPhysicalPresent || Boolean(prevDayRecord) || Boolean(nextDayRecord) || day.isHolidayPaid);
                      const isWoEarned = isWeekoff && (isPhysicalPresent || Boolean(prevDayRecord) || Boolean(nextDayRecord) || day.isWeekoffPaid);

                      const isPresent = isPhysicalPresent || (day.status || '').toLowerCase() === 'present' || isHolidayEarned || isWoEarned;
                      const isLeave = (day.status || '').toLowerCase() === 'leave' && !isPhysicalPresent;
                      const isUpcoming = (day.status || '').toLowerCase() === 'upcoming';
                      const isSinglePunch = isPhysicalPresent && (!day.punchIn || !day.punchOut);

                      return (
                        <tr key={`${day.workDate}-${day.sessionId || 'none'}`} className="hover:bg-gray-50/50 transition duration-150 border-b border-gray-100">
                          <td className="px-3 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {fmtDate(day.workDate)}
                            {/* Show session suffix for multi-session days (sessionSeq > 1) */}
                            {day.sessionSeq > 1 && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                Shift {day.sessionSeq}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium whitespace-nowrap">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {day.shiftName === 'general' ? 'General' : `Shift ${day.shiftName?.toUpperCase()}`} ({day.startTime}-{day.endTime})
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                <span>Present</span>
                                {isHoliday && (
                                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full border border-purple-200" title={day.holidayTitle || "National Holiday"}>
                                    NL
                                  </span>
                                )}
                                {isSinglePunch && !isHoliday && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full border border-amber-200" title={!day.punchIn ? "Missing Check-in" : "Missing Check-out"}>
                                    Single Punch
                                  </span>
                                )}
                              </span>
                            ) : isLeave ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                On Leave
                              </span>
                            ) : isUpcoming ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                                Upcoming
                              </span>
                            ) : day.isWeeklyOff || isWeekoff ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                Weekoff
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                <span>Absent</span>
                                {isHoliday && (
                                  <span className="text-[10px] font-bold bg-red-200 text-red-900 px-1 py-0.2 rounded" title="Missed adjacent days - Holiday Disallowed">
                                    NL
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {day.isWeeklyOff ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                WO
                              </span>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-sm text-gray-600 font-medium whitespace-nowrap">{formatPunchTime(day.punchIn)}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-600 font-medium whitespace-nowrap">{formatPunchTime(day.punchOut)}</td>
                          <td className="px-3 py-2.5 text-sm text-gray-600 font-semibold whitespace-nowrap">{isPhysicalPresent ? formatMinutes(mins) : "—"}</td>

                          {/* OT (HRS) Column - Editable by Admin */}
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={day.customOtHours !== undefined ? day.customOtHours : (day.effectiveOtMinutes !== undefined ? (day.effectiveOtMinutes / 60) : (isHoliday && isPhysicalPresent ? 8 : (day.overtimeMinutes ? (day.overtimeMinutes / 60) : 0)))}
                              onChange={(e) => handleDailyOtChange(day, e.target.value)}
                              className="w-16 bg-white border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5 text-center text-xs font-semibold font-mono text-gray-800 shadow-sm"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
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
                              <button
                                onClick={() => handleOpenRecordEventModal(day)}
                                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer border border-emerald-200 rounded bg-emerald-50/50 px-2 py-1"
                              >
                                <Plus size={12} />
                                <span>Record Punch</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
        );
      })()}

      {/* Session Timeline Detail Modal */}
      {selectedSessionTimeline && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-950 text-base">{selectedSessionTimeline.employeeName}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Code: {selectedSessionTimeline.employeeCode} • Date: {fmtDate(selectedSessionTimeline.workDate)}</p>
              </div>
              <button
                onClick={() => setSelectedSessionTimeline(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Shift & Daily Table Punches Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-indigo-100 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Shift (detected)</span>
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-indigo-600 text-white shadow-sm">
                    {selectedSessionTimeline.shiftName === 'general' ? 'General Shift' : `Shift ${selectedSessionTimeline.shiftName?.toUpperCase()}`} ({selectedSessionTimeline.startTime} - {selectedSessionTimeline.endTime})
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white rounded-lg p-2 border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Official Check-In</span>
                    <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                      {formatPunchTime(selectedSessionTimeline.firstCheckIn)}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Official Check-Out</span>
                    <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                      {formatPunchTime(selectedSessionTimeline.lastCheckOut)}
                    </span>
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-indigo-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Duration</span>
                    <span className="text-xs font-bold text-gray-800 mt-0.5 block">
                      {selectedSessionTimeline.firstCheckIn ? formatMinutes(selectedSessionTimeline.workingMinutes) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Events Section */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Raw Biometric Punches Timeline</h4>

                {selectedSessionTimeline.events.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">No raw punches recorded for this shift window.</p>
                ) : (
                  <div className="relative pl-6 border-l-2 border-indigo-150 space-y-4 pt-1">
                    {selectedSessionTimeline.events.map((ev) => (
                      <div key={ev.id} className="relative group">
                        {/* Timeline dot */}
                        <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-sm
                          ${ev.eventType === "CHECK_IN" ? "bg-emerald-500 ring-4 ring-emerald-50" : "bg-rose-500 ring-4 ring-rose-50"}
                        `}></span>

                        <div className="flex justify-between items-center bg-gray-50 hover:bg-indigo-50/50 p-2.5 rounded-xl border border-gray-150 transition duration-150">
                          <div>
                            <h5 className="font-bold text-gray-900 text-xs">
                              {ev.eventType === "CHECK_IN" ? "Checked In (Punch)" : "Checked Out (Punch)"}
                            </h5>
                          </div>
                          <span className="text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded-md border border-gray-200 shadow-2xs">
                            {formatTime(ev.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                <span>Manage Attendance Punch</span>
              </h3>
              <button
                onClick={() => setRecordModalEmp(null)}
                className="text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg p-1.5 shadow-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Employee & Date Banner */}
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Employee</span>
                  <p className="font-bold text-gray-800 text-sm mt-0.5">
                    {recordModalEmp.employeeName} ({recordModalEmp.employeeCode})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</span>
                  <p className="font-semibold text-gray-700 text-xs mt-0.5">
                    {fmtDate(recordModalEmp.workDate)}
                  </p>
                </div>
              </div>

              {/* Tab Selector: Add Event (Old) vs Edit / Update Punch */}
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab("add")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalTab === "add"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Plus size={13} />
                  <span>Add Punch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("edit")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    modalTab === "edit"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Edit / Delete</span>
                </button>
              </div>

              {/* TAB 1: ADD EVENT (EXACT OLD FORM) */}
              {modalTab === "add" && (
                <form onSubmit={handleAddEventSubmit} className="space-y-4">
                  {/* Event Type select */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Event Type *</label>
                    <select
                      value={addForm.eventType}
                      onChange={(e) => setAddForm({ ...addForm, eventType: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-white font-medium"
                    >
                      <option value="CHECK_IN">Check In</option>
                      <option value="CHECK_OUT">Check Out</option>
                    </select>
                  </div>

                  {/* Time picker */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Event Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={addForm.eventTime}
                      onChange={(e) => setAddForm({ ...addForm, eventTime: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none font-medium"
                    />
                    <p className="text-[11px] text-gray-400">
                      "Log Event" updates our records for this employee.
                    </p>
                  </div>

                  {/* Modal Footer for Add */}
                  <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
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
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>{submittingEvent ? "Logging..." : "Log Event"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: EDIT / UPDATE PUNCH */}
              {modalTab === "edit" && (
                <form onSubmit={handleUpdatePunchSubmit} className="space-y-4">
                  {/* Check In Date & Time */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Check-In Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Check Out Date & Time */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Check-Out Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Status selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Status</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none bg-white font-medium capitalize"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="leave">On Leave</option>
                    </select>
                  </div>

                  {/* Remarks */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Remarks / Reason (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Punch corrected by Admin"
                      value={editForm.remarks}
                      onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none font-medium text-gray-700"
                    />
                  </div>

                  {/* Modal Footer for Edit */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      {editForm.hasExistingPunches && (
                        <button
                          type="button"
                          disabled={deletingPunch || submittingEvent}
                          onClick={handleDeletePunch}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs px-3.5 py-2 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Trash2 size={14} />
                          <span>{deletingPunch ? "Deleting..." : "Delete Punch"}</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setRecordModalEmp(null)}
                        className="bg-white border border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-gray-50 transition duration-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingEvent || deletingPunch}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow-md transition duration-200 cursor-pointer disabled:opacity-55 flex items-center gap-1.5"
                      >
                        <Edit3 size={14} />
                        <span>{submittingEvent ? "Saving..." : "Update Punch"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
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

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';

const MyAttendance = () => {
  const hasPageAccess = useAuthStore((state) => state.hasPageAccess);
  const canViewMonthly = hasPageAccess('/my-attendance/monthly');

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week'
  // Admin can revoke the monthly view per-employee/role from Settings → Employee Role Management.
  // When revoked, the employee always gets the simple last-7-days view with no controls.
  const effectiveViewMode = canViewMonthly ? viewMode : 'week';
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [userAttendanceData, setUserAttendanceData] = useState([]);
  const [assignedShift, setAssignedShift] = useState(null);

  // Get employee code from localStorage
  const getUserEmployeeCode = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        return parsedUser.employeeCode || parsedUser.username || '';
      }
      return '';
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      return '';
    }
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${day}/${month + 1}/${year}`;
  };

  // Shared date/time formatting used when mapping raw attendance rows
  const formatDate = (isoString) => {
    if (!isoString) return '';
    if (typeof isoString === 'string' && isoString.includes('-') && !isoString.includes('T')) {
      return isoString;
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    if (typeof isoString === "string" && (isoString.includes(" ") || isoString.includes("T"))) {
      const parts = isoString.trim().split(/[ T]/);
      if (parts.length >= 2 && parts[1]) {
        const timeParts = parts[1].split(":");
        if (timeParts.length >= 2) {
          let hours = parseInt(timeParts[0], 10);
          const minutes = timeParts[1].padStart(2, "0");
          if (!isNaN(hours)) {
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const hrsStr = String(hours).padStart(2, '0');
            return `${hrsStr}:${minutes} ${ampm}`;
          }
        }
      }
    }
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hrsStr = String(hours).padStart(2, '0');
    return `${hrsStr}:${minutes} ${ampm}`;
  };

  // Maps raw backend attendance rows into display-ready records
  const processAttendanceRecords = (rawRecords, approvedLeaves) => {
    return (rawRecords || []).map(record => {
      const recordDateStr = formatDate(record.Date);

      // Check if this date falls within any approved leave range
      const isOnLeave = approvedLeaves.some(leave => {
        const start = formatDate(leave.startDate);
        const end = formatDate(leave.endDate);
        return recordDateStr >= start && recordDateStr <= end;
      });

      let calcWorkingHours = record.workingHours || 0;
      let calcOvertime = record.overtime || 0;

      if (!calcWorkingHours && record.In && record.Out) {
        const inDate = new Date(record.In);
        const outDate = new Date(record.Out);
        if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
          let hours = (outDate - inDate) / (1000 * 60 * 60);
          if (hours < 0) hours += 24;
          calcWorkingHours = hours;
        }
      }

      return {
        ...record,
        Date: recordDateStr,
        In: formatTime(record.In),
        Out: formatTime(record.Out),
        workingHours: calcWorkingHours,
        overtime: calcOvertime,
        status: isOnLeave ? 'Leave' : (record.status || 'Absent')
      };
    });
  };

  // Last 7 days (inclusive of today)
  const getLast7DaysRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return { start, end };
  };

  // Every (month, year) pair that the [start, end] range touches, in order
  const getMonthsInRange = (start, end) => {
    const months = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cur <= last) {
      months.push({ month: cur.getMonth() + 1, year: cur.getFullYear() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return months;
  };

  const fetchDataSheet = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const userEmpCode = getUserEmployeeCode();
      if (!userEmpCode) {
        throw new Error('Employee code not found. Please log in again.');
      }

      const leaveResult = await api.get(`/leaves/personal?employeeCode=${encodeURIComponent(userEmpCode)}`);
      const approvedLeaves = (leaveResult.data || []).filter(l => l.status === 'Approved');

      if (effectiveViewMode === 'week') {
        const { start, end } = getLast7DaysRange();
        const monthsNeeded = getMonthsInRange(start, end);

        const monthResults = await Promise.all(
          monthsNeeded.map(({ month, year }) =>
            api.get(`/attendance/personal?employeeCode=${encodeURIComponent(userEmpCode)}&month=${month}&year=${year}`)
          )
        );

        // The last fetched month covers "today" — use its shift as the assigned shift
        const currentMonthResult = monthResults[monthResults.length - 1];
        if (currentMonthResult?.shift) {
          setAssignedShift(currentMonthResult.shift);
        }

        const rawRecords = monthResults.flatMap(r => r.data || []);
        const processed = processAttendanceRecords(rawRecords, approvedLeaves);

        const startKey = formatDate(start.toISOString());
        const endKey = formatDate(end.toISOString());
        const rangeFiltered = processed
          .filter(r => r.Date && r.Date >= startKey && r.Date <= endKey)
          .sort((a, b) => a.Date.localeCompare(b.Date));

        setAttendanceData(rangeFiltered);
        setUserAttendanceData(rangeFiltered);
      } else {
        const attResult = await api.get(`/attendance/personal?employeeCode=${encodeURIComponent(userEmpCode)}&month=${selectedMonth + 1}&year=${selectedYear}`);

        if (attResult.shift) {
          setAssignedShift(attResult.shift);
        }

        const processedData = processAttendanceRecords(attResult.data || [], approvedLeaves);
        setAttendanceData(processedData);
        setUserAttendanceData(processedData);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSheet();
  }, [selectedMonth, selectedYear, effectiveViewMode]);

  // Week view is already the exact filtered/sorted range; month view still needs
  // the month/year guard since attendanceData may include padding rows.
  const filteredAttendance = effectiveViewMode === 'week'
    ? attendanceData
    : attendanceData.filter(record => {
      if (!record.Date) return false;

      try {
        const recordDate = new Date(record.Date);
        return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
      } catch (error) {
        return false;
      }
    });

  const totalDays = filteredAttendance.length;
  const presentDays = filteredAttendance.filter(record =>
    record.status === 'Present' || (record.In && record.In !== '' && record.In !== '-')
  ).length;
  const leaveDays = filteredAttendance.filter(record =>
    record.status === 'Leave' || record.status === 'leave'
  ).length;
  const absentDays = filteredAttendance.filter(record =>
    record.status === 'Absent'
  ).length;

  const totalWorkingHours = filteredAttendance.reduce((sum, record) => sum + (record.workingHours || 0), 0);
  const totalOvertime = filteredAttendance.reduce((sum, record) => sum + (record.overtime || 0), 0);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [new Date().getFullYear()];

  const getShiftDisplay = (shiftObj) => {
    if (!shiftObj) return { label: 'General Shift', timing: '8:45 AM - 5:35 PM', color: 'bg-blue-100 text-blue-800' };
    const name = (shiftObj.name || '').toLowerCase();
    if (name === 'a') return { label: 'Shift A', timing: `${shiftObj.startTime} - ${shiftObj.endTime}`, color: 'bg-purple-100 text-purple-800' };
    if (name === 'general') return { label: 'General Shift', timing: `${shiftObj.startTime} - ${shiftObj.endTime}`, color: 'bg-blue-100 text-blue-800' };
    if (name === 'b') return { label: 'Shift B', timing: `${shiftObj.startTime} - ${shiftObj.endTime}`, color: 'bg-teal-100 text-teal-800' };
    if (name === 'c') return { label: 'Shift C (Night)', timing: `${shiftObj.startTime} - ${shiftObj.endTime}`, color: 'bg-amber-100 text-amber-800' };
    return { label: `Shift ${shiftObj.name}`, timing: `${shiftObj.startTime} - ${shiftObj.endTime}`, color: 'bg-indigo-100 text-indigo-800' };
  };

  const shiftInfo = getShiftDisplay(assignedShift);

  const { start: last7Start, end: last7End } = getLast7DaysRange();
  const last7RangeLabel = `${formatDOB(last7Start.toISOString())} - ${formatDOB(last7End.toISOString())}`;

  return (
    <div className="space-y-6 page-content p-6">

      {/* Filter & Assigned Shift Section */}
      <div className={`bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 ${canViewMonthly ? 'md:justify-between' : 'md:justify-end'}`}>
        {canViewMonthly && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* View mode toggle */}
            <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-gray-50 self-start">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'month' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${viewMode === 'week' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                Last 7 Days
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  disabled={viewMode === 'week'}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  disabled={viewMode === 'week'}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Assigned Shift Badge */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl">
          <Clock size={20} className="text-indigo-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-semibold">Assigned Shift:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${shiftInfo.color}`}>
                {shiftInfo.label}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-600">Timing: {shiftInfo.timing}</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Present Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{presentDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <XCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Absent Days</p>
              <h3 className="text-2xl font-bold text-gray-800">{absentDays}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-indigo-100 mr-4">
              <Clock size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Working Hours</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalWorkingHours.toFixed(1)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 mr-4">
              <Clock size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Overtime Hours</p>
              <h3 className="text-2xl font-bold text-gray-800">{totalOvertime.toFixed(1)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h2 className="text-lg font-bold text-gray-800">
              {canViewMonthly
                ? `Attendance Records - ${viewMode === 'week' ? `Last 7 Days (${last7RangeLabel})` : `${months[selectedMonth]} ${selectedYear}`}`
                : 'Attendance Records'}
            </h2>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Shift auto-detected from daily punch times
            </span>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Loading attendance data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record, index) => {
                    const status = record.status || 'Absent';
                    const workingHours = record.workingHours || 0;
                    const overtime = record.overtime || 0;
                    const sNameRaw = record.shiftName || assignedShift?.name || 'general';
                    const sName = sNameRaw.toLowerCase();
                    const sStart = record.startTime || assignedShift?.startTime || '08:45';
                    const sEnd = record.endTime || assignedShift?.endTime || '17:35';
                    const shiftLabel = sName === 'general' ? 'General Shift' : `Shift ${sName.toUpperCase()}`;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDOB(record.Date) || formatDOB(record.date) || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                          <span className="font-semibold capitalize text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                            {shiftLabel} ({sStart} - {sEnd})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.In || record.inTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.Out || record.outTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${status === 'Present' ? 'bg-green-100 text-green-800' :
                              status === 'Leave' || status === 'leave' ? 'bg-blue-100 text-blue-800' :
                                status === 'Weekoff' ? 'bg-purple-100 text-purple-800' :
                                  status === 'Holiday' ? 'bg-amber-100 text-amber-800' :
                                    status === 'Upcoming' ? 'bg-gray-100 text-gray-500' :
                                      'bg-red-100 text-red-800'
                            }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {workingHours.toFixed(1)} hrs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {overtime.toFixed(1)} hrs
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAttendance.length === 0 && !loading && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No attendance records found for the selected period.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAttendance;
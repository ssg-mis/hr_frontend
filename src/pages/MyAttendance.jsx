import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';

const MyAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  const fetchDataSheet = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const userEmpCode = getUserEmployeeCode();
      if (!userEmpCode) {
        throw new Error('Employee code not found. Please log in again.');
      }

      // Fetch both attendance and leaves in parallel using the api client
      const [attResult, leaveResult] = await Promise.all([
        api.get(`/attendance/personal?employeeCode=${encodeURIComponent(userEmpCode)}&month=${selectedMonth + 1}&year=${selectedYear}`),
        api.get(`/leaves/personal?employeeCode=${encodeURIComponent(userEmpCode)}`)
      ]);

      if (attResult.shift) {
        setAssignedShift(attResult.shift);
      }

      const approvedLeaves = (leaveResult.data || []).filter(l => l.status === 'Approved');

      // Map backend attendance data
      const processedData = (attResult.data || []).map(record => {
        const formatDate = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return '';
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const recordDateStr = formatDate(record.Date);
        
        // Check if this date falls within any approved leave range
        const isOnLeave = approvedLeaves.some(leave => {
          const start = formatDate(leave.startDate);
          const end = formatDate(leave.endDate);
          return recordDateStr >= start && recordDateStr <= end;
        });

        const formatTime = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return '';
          let hours = date.getUTCHours();
          const minutes = String(date.getUTCMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          const hrsStr = String(hours).padStart(2, '0');
          return `${hrsStr}:${minutes} ${ampm}`;
        };


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
          Date: formatDate(record.Date),
          In: formatTime(record.In),
          Out: formatTime(record.Out),
          workingHours: calcWorkingHours,
          overtime: calcOvertime,
          status: isOnLeave ? 'Leave' : (record.status || 'Absent')
        };
      });

      setAttendanceData(processedData);
      setUserAttendanceData(processedData);

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
  }, [selectedMonth, selectedYear]);

  const filteredAttendance = attendanceData.filter(record => {
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

  return (
    <div className="space-y-6 page-content p-6">

      {/* Filter & Assigned Shift Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

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
              Attendance Records - {months[selectedMonth]} {selectedYear}
            </h2>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Calculated using assigned shift timings
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
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            status === 'Present' ? 'bg-green-100 text-green-800' :
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
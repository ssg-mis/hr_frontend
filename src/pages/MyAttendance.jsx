import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const MyAttendance = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [userAttendanceData, setUserAttendanceData] = useState([]);

  // Get full name from localStorage (corresponds to 'name' column in users table)
  const getUserFullName = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        // Prioritize 'Name' as it maps to the database 'name' column
        return parsedUser.Name || parsedUser.name || '';
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
      return dateString; // Return as-is if not a valid date
    }
    
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  const fetchDataSheet = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const userFullName = getUserFullName();
      if (!userFullName) {
        throw new Error('User name not found. Please log in again.');
      }

      const apiBase = import.meta.env.VITE_API_URL || "/api/v1";
      
      // Fetch both attendance and leaves in parallel
      const [attResponse, leaveResponse] = await Promise.all([
        fetch(`${apiBase}/attendance/personal?employee=${encodeURIComponent(userFullName)}&month=${selectedMonth + 1}&year=${selectedYear}`),
        fetch(`${apiBase}/leaves/personal?employeeName=${encodeURIComponent(userFullName)}`)
      ]);

      if (!attResponse.ok) throw new Error(`Attendance API error! status: ${attResponse.status}`);
      if (!leaveResponse.ok) throw new Error(`Leaves API error! status: ${leaveResponse.status}`);

      const attResult = await attResponse.json();
      const leaveResult = await leaveResponse.json();

      console.log('Backend Response - Attendance:', attResult, 'Leaves:', leaveResult);

      const approvedLeaves = (leaveResult.data || []).filter(l => l.status === 'Approved');

      // Map backend attendance data
      const processedData = (attResult.data || []).map(record => {
        const recordDateStr = record.Date ? new Date(record.Date).toISOString().split('T')[0] : '';
        
        // Check if this date falls within any approved leave range
        const isOnLeave = approvedLeaves.some(leave => {
          const start = new Date(leave.startDate).toISOString().split('T')[0];
          const end = new Date(leave.endDate).toISOString().split('T')[0];
          return recordDateStr >= start && recordDateStr <= end;
        });

        const formatTime = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return '';
          return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        const formatDate = (isoString) => {
          if (!isoString) return '';
          const date = new Date(isoString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().split('T')[0];
        };

        let calcWorkingHours = 0;
        let calcOvertime = record.overtime || 0;

        if (record.In && record.Out) {
          const inDate = new Date(record.In);
          const outDate = new Date(record.Out);
          if (!isNaN(inDate.getTime()) && !isNaN(outDate.getTime())) {
            let hours = (outDate - inDate) / (1000 * 60 * 60);
            if (hours < 0) hours += 24;
            calcWorkingHours = hours;
            if (!calcOvertime) calcOvertime = Math.max(0, hours - 8);
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

  // Trigger fetch when month or year changes
  useEffect(() => {
    fetchDataSheet();
  }, [selectedMonth, selectedYear]);

  // Filter attendance by selected month from the already fetched data
  const filteredAttendance = attendanceData.filter(record => {
    if (!record.Date) return false;
    
    try {
      const recordDate = new Date(record.Date);
      return recordDate.getMonth() === selectedMonth && recordDate.getFullYear() === selectedYear;
    } catch (error) {
      return false;
    }
  });

  // Calculate statistics
  const totalDays = filteredAttendance.length;
  const presentDays = filteredAttendance.filter(record => 
    record.status === 'Leave' || 
    (record.In && record.In !== '' && record.In !== '-') || 
    (record.inTime && record.inTime !== '' && record.inTime !== '-')
  ).length;
  
  const absentDays = totalDays - presentDays;
  
  // Calculate working hours using pre-calculated values
  const totalWorkingHours = filteredAttendance.reduce((sum, record) => sum + (record.workingHours || 0), 0);
  
  // Calculate overtime using pre-calculated values
  const totalOvertime = filteredAttendance.reduce((sum, record) => sum + (record.overtime || 0), 0);

  // Helper function to parse time strings like "10:00:00 AM"
  const parseTimeString = (timeStr) => {
    if (!timeStr) return null;
    
    let cleanTime = timeStr.toString().trim();
    
    // Handle AM/PM format
    let isPM = false;
    if (cleanTime.toLowerCase().includes('pm')) {
      isPM = true;
      cleanTime = cleanTime.toLowerCase().replace('pm', '').trim();
    } else if (cleanTime.toLowerCase().includes('am')) {
      cleanTime = cleanTime.toLowerCase().replace('am', '').trim();
    }
    
    // Split by colon
    const parts = cleanTime.split(':');
    if (parts.length < 2) return null;
    
    let hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts.length > 2 ? parseInt(parts[2], 10) : 0;
    
    // Adjust for PM
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0; // 12 AM = 0 hours
    
    // Create a date object with fixed date and the parsed time
    return new Date(2000, 0, 1, hours, minutes, seconds);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [new Date().getFullYear()];

  // Determine status based on In time presence
  const getStatus = (record) => {
    if ((record.In && record.In !== '' && record.In !== '-') || 
        (record.inTime && record.inTime !== '' && record.inTime !== '-')) {
      return 'Present';
    }
    return 'Absent';
  };

  return (
    <div className="space-y-6 page-content p-6">

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow border flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6">
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

        <div className="bg-white rounded-xl shadow-lg border p-6">
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

        <div className="bg-white rounded-xl shadow-lg border p-6">
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

        <div className="bg-white rounded-xl shadow-lg border p-6">
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

        <div className="bg-white rounded-xl shadow-lg border p-6">
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
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Attendance Records - {months[selectedMonth]} {selectedYear}
          </h2>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAttendance.map((record, index) => {
                    const status = record.status || getStatus(record);
                    const workingHours = record.workingHours || 0;
                    const overtime = record.overtime || 0;

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDOB(record.Date) ||formatDOB(record.date) || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.In || record.inTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.Out || record.outTime || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            status === 'Present' 
                              ? 'bg-green-100 text-green-800' 
                              : status === 'Leave'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
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
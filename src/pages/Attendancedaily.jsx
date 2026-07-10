import React, { useEffect, useState } from 'react';
import { Search, Download } from 'lucide-react';

const Attendancedaily = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAttendanceData = async () => {
    setLoading(false);
    setTableLoading(false);
    setError("This page has been disabled as Google Script integration has been removed.");
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // Filter data based on search term and date range
  const filteredData = attendanceData.filter(item => {
    const searchLower = searchTerm.toLowerCase();

    let matchesSearch = !searchLower;
    if (searchLower) {
      matchesSearch =
        item.name.toLowerCase().includes(searchLower) ||
        item.empIdCode.toLowerCase().includes(searchLower) ||
        item.year.toString().toLowerCase().includes(searchLower) ||
        item.monthName.toLowerCase().includes(searchLower) ||
        item.day.toLowerCase().includes(searchLower) ||
        item.companyName.toLowerCase().includes(searchLower) ||
        item.designation.toLowerCase().includes(searchLower) ||
        item.status.toLowerCase().includes(searchLower) ||
        item.remarks.toLowerCase().includes(searchLower);
    }

    // Date range filter
    let matchesDateRange = true;
    if (startDate || endDate) {
      // Helper to parse DD/MM/YYYY or other formats
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        if (dateStr instanceof Date) return dateStr;

        // Try DD/MM/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return new Date(parts[2], parts[1] - 1, parts[0]);
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const itemDate = parseDate(item.date);

      if (itemDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) matchesDateRange = false;
        }

        if (endDate && matchesDateRange) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) matchesDateRange = false;
        }
      } else {
        // If we can't parse the date, we can't filter by range
        // You might want to decide if unparseable dates should be shown or hidden
        if (startDate || endDate) matchesDateRange = false;
      }
    }

    return matchesSearch && matchesDateRange;
  });

  // Download CSV function
  const downloadCSV = () => {
    if (filteredData.length === 0) return;

    // Define CSV headers
    const headers = [
      'Year', 'Month Name', 'Date', 'Day', 'Company Name', 'Emp ID Code',
      'Name', 'Designation', 'Holiday (Yes/No)', 'Working Day (Yes/No)',
      'N-Holiday (Holiday Name)', 'Status', 'In Time', 'Out Time',
      'Working Hours', 'Late Minutes', 'Early Out', 'Overtime Hours',
      'Punch Miss', 'Remarks'
    ];

    // Convert data to CSV format
    const csvData = filteredData.map(item => [
      item.year, item.monthName, item.date, item.day, item.companyName,
      item.empIdCode, item.name, item.designation, item.holiday, item.workingDay,
      item.nHoliday, item.status, item.inTime, item.outTime, item.workingHours,
      item.lateMinutes, item.earlyOut, item.overtimeHours, item.punchMiss, item.remarks
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_data_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 page-content p-6">

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">

          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Download Button */}
          <div className="flex items-end">
            <button
              onClick={downloadCSV}
              disabled={filteredData.length === 0}
              className={`flex items-center px-4 py-2 rounded-lg ${filteredData.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              <Download size={18} className="mr-2" />
              Download
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emp ID Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday (Yes/No)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Day (Yes/No)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N-Holiday</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">In Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Out Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Minutes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Early Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Miss</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableLoading ? (
                  <tr>
                    <td colSpan="20" className="px-6 py-12 text-center">
                      <div className="flex justify-center flex-col items-center">
                        <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                        <span className="text-gray-600 text-sm">Loading attendance data...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="20" className="px-6 py-12 text-center">
                      <p className="text-red-500">Error: {error}</p>
                      <button
                        onClick={fetchAttendanceData}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.monthName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.companyName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.empIdCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.holiday}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.workingDay}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.nHoliday}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.inTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.outTime}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.workingHours}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lateMinutes}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.earlyOut}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.overtimeHours}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.punchMiss}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.remarks}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="20" className="px-6 py-12 text-center">
                      <p className="text-gray-500">No attendance records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendancedaily;
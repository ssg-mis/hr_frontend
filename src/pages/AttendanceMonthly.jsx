import React, { useEffect, useState } from 'react';
import { Search, Download, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

const AttendanceMonthly = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [availableDepartments, setAvailableDepartments] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-indexed
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const yearOptions = [new Date().getFullYear()];

  const fetchMonthlyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/attendance/monthly?month=${selectedMonth}&year=${selectedYear}&department=${selectedDepartment}&search=${encodeURIComponent(searchTerm)}`
      );
      if (!response.ok) throw new Error('Failed to fetch monthly attendance');
      const result = await response.json();
      if (result.success) {
        setAttendanceData(result.data);
        if (result.filters && result.filters.departments) {
          setAvailableDepartments(result.filters.departments);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchMonthlyData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedMonth, selectedYear, selectedDepartment, searchTerm]);

  const filteredData = attendanceData;

  const downloadExcel = () => {
    const dataToExport = filteredData.map(item => ({
      'Employee Code': item.emp_code,
      'Name': item.name,
      'Department': item.department,
      'From Date': item.fromDate,
      'To Date': item.toDate,
      'Present Days': item.presentDays,
      'Absent Days': item.absentDays,
      'Work Hrs': item.workHrs,
      'OT Hrs': item.otHrs,
      'Late Count': item.lateCount,
      'Late Hrs': item.lateHrs,
      'Early Count': item.earlyCount,
      'Early Hrs': item.earlyHrs
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");
    XLSX.writeFile(workbook, `Monthly_Attendance_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen ml-50 overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white px-6 py-4 flex items-center justify-end shadow-sm border-b">
        <button
          onClick={downloadExcel}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download size={20} className="mr-2" />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white px-6 py-4 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search Employee</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Month</label>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Year</label>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Department</label>
            <select
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-gray-50"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full">
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dept</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Work Hrs</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">OT Hrs</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Late (C/H)</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Early (C/H)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-gray-500 font-medium">Fetching monthly records...</p>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center">
                      <div className="text-red-500 bg-red-50 inline-block px-4 py-2 rounded-lg">
                        Error: {error}
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="text-sm font-bold text-indigo-600">{item.emp_code}</div>
                        <div className="text-xs font-semibold text-gray-900 truncate max-w-[150px]">{item.name}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-500">{item.department}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs font-medium text-gray-600">
                        {formatDate(item.fromDate)} - {formatDate(item.toDate)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold">{item.presentDays}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.absentDays > 5 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>{item.absentDays}</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-700">{item.workHrs}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs font-bold text-indigo-600">{item.otHrs}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs">
                        <span className="text-red-600 font-bold">{item.lateCount}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600">{item.lateHrs}h</span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-xs">
                        <span className="text-orange-600 font-bold">{item.earlyCount}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600">{item.earlyHrs}h</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No monthly records found for the selected filters.
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

export default AttendanceMonthly;

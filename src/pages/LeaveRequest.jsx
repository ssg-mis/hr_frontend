import React, { useEffect, useState } from 'react';
import { Plus, X, Calendar, Clock, CheckCircle, AlertCircle, Filter, Search } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const LeaveRequest = () => {
  const { user, isHOD } = useAuthStore();
  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const userIsHOD = isHOD || userRoles.some(r => r.toLowerCase() === 'hod');
  const employeeId = user?.employeeId || user?.employee_id || user?.id || localStorage.getItem("employeeId");
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [hods, setHods] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [formData, setFormData] = useState({
    employeeName: user?.name || user?.Name || '',
    employeeId: user?.employeeId || user?.employee_id || user?.id || '',
    department: '',
    departmentId: '',
    hodName: '',
    leaveType: '',
    leaveCode: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const fetchEmployeeData = async () => {
    try {
      const result = await api.get('/employees/active');

      if (result.success && result.data && result.data.length > 0) {
        const currentEmpId = user?.employeeId || user?.employee_id || user?.id;
        const currentEmpCode = user?.employeeCode;

        const emp = result.data.find(e =>
          (currentEmpId && Number(e.employee_id) === Number(currentEmpId)) ||
          (currentEmpCode && e.employee_code === currentEmpCode)
        ) || result.data[0];

        if (emp) {
          setFormData(prev => ({
            ...prev,
            employeeName: emp.name_as_per_aadhar || user?.name || user?.Name || prev.employeeName,
            employeeId: emp.employee_id || prev.employeeId,
            department: emp.department?.department_name || prev.department,
            departmentId: emp.department_id || prev.departmentId,
            hodName: emp.department?.hod_name || prev.hodName || (hods.length > 0 ? hods[0].name : '')
          }));
          fetchLeaveData(emp.employee_id);
          return;
        }
      }
      fetchLeaveData(employeeId);
    } catch (error) {
      if (error?.status !== 403 && error?.status !== 401) {
        console.error('Error fetching employee data:', error);
      }
      fetchLeaveData(employeeId);
    }
  };

  // Call this function in useEffect
  useEffect(() => {
    // Initial fetch handled by the other useEffect
  }, []);

  // Fetch HODs from backend
  const fetchHods = async () => {
    try {
      const result = await api.get('/leaves/hods');
      if (result.success) {
        setHods(result.data);
      }
    } catch (error) {
      console.error('Error fetching HOD data:', error);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const result = await api.get('/leaves/policies');
      if (result.success) {
        setLeaveTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching leave types:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'leaveType') {
      const selectedPolicy = leaveTypes.find(type => type.leaveName === value);
      setFormData(prev => ({
        ...prev,
        leaveType: value,
        leaveCode: selectedPolicy ? selectedPolicy.leaveCode : ''
      }));
    } else if (name === 'fromDate') {
      setFormData(prev => {
        const nextToDate = prev.toDate && prev.toDate < value ? '' : prev.toDate;
        return {
          ...prev,
          fromDate: value,
          toDate: nextToDate
        };
      });
    } else if (name === 'toDate') {
      setFormData(prev => {
        if (prev.fromDate && value < prev.fromDate) {
          toast.error("To Date cannot be before From Date");
          return prev;
        }
        return {
          ...prev,
          toDate: value
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

  const calculateDays = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return 0;

    let startDate, endDate;

    // Handle different date formats
    if (startDateStr.includes('/')) {
      const [startDay, startMonth, startYear] = startDateStr.split('/').map(Number);
      startDate = new Date(startYear, startMonth - 1, startDay);
    } else {
      startDate = new Date(startDateStr);
    }

    if (endDateStr.includes('/')) {
      const [endDay, endMonth, endYear] = endDateStr.split('/').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay);
    } else {
      endDate = new Date(endDateStr);
    }

    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Function to parse date string in DD/MM/YYYY format
  const parseDate = (dateStr) => {
    if (!dateStr) return null;

    // Handle different date formats that might come from the API
    if (dateStr.includes('/')) {
      const [day, month, year] = dateStr.split('/').map(Number);
      return new Date(year, month - 1, day);
    } else if (dateStr.includes('-')) {
      return new Date(dateStr);
    }

    return null;
  };

  // Check if a date falls within a specific month
  const isDateInMonth = (dateStr, monthIndex) => {
    if (!dateStr || monthIndex === 'all') return true;

    const date = parseDate(dateStr);
    if (!date) return false;

    return date.getMonth() === parseInt(monthIndex);
  };

  const fetchLeaveData = async (idToUse = employeeId) => {
    if (!idToUse || idToUse === 'null') {
      console.warn('No employeeId found, skipping fetch');
      return;
    }
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const result = await api.get(`/leaves/employee/${idToUse}`);

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch leave data');
      }

      const processedData = result.data.map((leave) => ({
        id: leave.id,
        timestamp: leave.createdAt,
        employeeId: leave.employeeId,
        employeeName: leave.employeeName,
        startDate: leave.startDate.split('T')[0],
        endDate: leave.endDate.split('T')[0],
        reason: leave.remark,
        days: calculateDays(leave.startDate, leave.endDate),
        status: leave.status,
        leaveType: leave.leaveType,
        appliedDate: new Date(leave.createdAt).toLocaleDateString(),
        hodName: leave.hodName
      }));

      setLeavesData(processedData);

    } catch (error) {
      console.error('Error fetching leave data:', error);
      setError(error.message);
      toast.error(`Failed to load leave data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      // Only call fetchEmployeeData; it will trigger fetchLeaveData
      fetchEmployeeData();
      fetchHods();
      fetchLeaveTypes();
    }
  }, [employeeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employeeName || !formData.leaveType || !formData.fromDate || !formData.toDate || !formData.reason || (!userIsHOD && !formData.hodName)) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);
      const result = await api.post('/leaves', {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        startDate: formData.fromDate,
        endDate: formData.toDate,
        remark: formData.reason,
        leaveCode: formData.leaveCode,
        hodName: userIsHOD ? 'N/A' : (formData.hodName || 'N/A'),
        departmentId: formData.departmentId
      });

      if (result.success) {
        toast.success('Leave Request submitted successfully!');
        setFormData(prev => ({
          ...prev,
          leaveType: '',
          leaveCode: '',
          fromDate: '',
          toDate: '',
          reason: ''
        }));
        setShowModal(false);
        fetchLeaveData(formData.employeeId);
      } else {
        toast.error('Failed to submit: ' + (result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Insert error:', error);
      toast.error(error.message || 'Something went wrong!');
    } finally {
      setSubmitting(false);
    }
  };



  // Calculate leave balances dynamically based on policies and approved leaves
  const getLeaveStats = () => {
    const approvedLeaves = leavesData.filter(leave =>
      leave.status && leave.status.toLowerCase() === 'approved' &&
      leave.employeeId?.toString() === employeeId?.toString() &&
      (selectedMonth === 'all' ||
        isDateInMonth(leave.startDate, selectedMonth) ||
        isDateInMonth(leave.endDate, selectedMonth))
    );

    return leaveTypes.map(policy => {
      const used = approvedLeaves
        .filter(leave => leave.leaveCode === policy.leaveCode || leave.leaveType === policy.leaveName)
        .reduce((sum, leave) => sum + (leave.days || 0), 0);
      
      const total = policy.balance || 0;
      const remaining = Math.max(0, total - used);
      const percentage = total > 0 ? (used / total) * 100 : 0;

      return {
        ...policy,
        used,
        total,
        remaining,
        percentage
      };
    });
  };

  const leaveStats = getLeaveStats();

  const handleCardClick = (policy) => {
    setFormData(prev => ({
      ...prev,
      leaveType: policy.leaveName,
      leaveCode: policy.leaveCode
    }));
    setShowModal(true);
  };

  // Generate month options for the dropdown
  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus size={16} className="mr-2" />
          New Leave Request
        </button>
      </div>

      {/* Month Filter */}
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex items-center">
          <Filter size={18} className="text-gray-500 mr-2" />
          <label htmlFor="monthFilter" className="text-sm font-medium text-gray-700 mr-3">
            Filter by Month:
          </label>
          <select
            id="monthFilter"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {monthOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leave Balance Cards */}
      <div className="flex flex-row gap-4 mb-6">
        {leaveStats.map((stat) => (
          <div
            key={stat.leaveCode}
            className="flex-1 bg-white rounded-lg shadow border p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-indigo-500 min-w-0"
            onClick={() => handleCardClick(stat)}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 overflow-hidden">
                <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-wider">{stat.leaveName}</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-lg font-bold text-gray-800">{stat.used}</h3>
                  <span className="text-[10px] text-gray-400">/ {stat.total} Days</span>
                </div>
                <p className="text-[10px] font-medium truncate text-gray-500 mt-0.5">
                  <span className="text-indigo-600">{stat.remaining} left</span> • Allowed: {stat.total}
                </p>
              </div>
              <div className="p-1.5 rounded-full bg-indigo-50 flex-shrink-0">
                <Calendar size={14} className="text-indigo-600" />
              </div>
            </div>
            <div className="mt-2">
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className="bg-indigo-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${stat.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">My Leave Requests</h2>
          {tableLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leavesData
                    .filter(leave =>
                      selectedMonth === 'all' ||
                      isDateInMonth(leave.startDate, selectedMonth) ||
                      isDateInMonth(leave.endDate, selectedMonth)
                    )
                    .map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.leaveType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.startDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.endDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{request.days}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{request.reason}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                             request.status === 'Approved'
                               ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                               : request.status === 'Rejected'
                               ? 'bg-red-50 text-red-700 border-red-200'
                               : request.status === 'Pending HOD'
                               ? 'bg-amber-50 text-amber-700 border-amber-200'
                               : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                           }`}>
                             {request.status}
                           </span>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.appliedDate}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {leavesData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500">No leave requests found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal for new leave request - Updated to match LeaveManagement */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-medium">New Leave Request</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
                <input
                  type="text"
                  name="employeeName"
                  value={formData.employeeName}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  name="employeeId"
                  value={formData.employeeId}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                  readOnly
                />
              </div>

              {!userIsHOD && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HOD Name</label>
                  <input
                    type="text"
                    name="hodName"
                    value={formData.hodName || '—'}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 focus:outline-none"
                    readOnly
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  name="leaveType"
                  value={formData.leaveType}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type, idx) => (
                    <option key={idx} value={type.leaveName}>{type.leaveName}</option>
                  ))}
                  {leaveTypes.length === 0 && (
                    <>
                      <option value="Normal Leave">Normal Leave</option>
                      <option value="Earned Leave">Earned Leave</option>
                      <option value="Casual Leave">Casual Leave</option>
                      <option value="Sick Leave">Sick Leave</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={formData.fromDate}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    name="toDate"
                    value={formData.toDate}
                    onChange={handleInputChange}
                    min={formData.fromDate}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {formData.fromDate && formData.toDate && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Total Days: <span className="font-semibold">{calculateDays(formData.fromDate, formData.toDate)}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Please provide reason for leave..."
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 min-h-[42px] flex items-center justify-center ${submitting ? 'opacity-75 cursor-not-allowed' : ''
                    }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin h-4 w-4 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequest;
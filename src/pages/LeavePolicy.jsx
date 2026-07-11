import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, FileText, Info, Users, UserCheck, UserX, Clock, Plus, X, Pencil, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const LeavePolicy = () => {
    const [activeTab, setActiveTab] = useState('leaves');
    const [searchTerm, setSearchTerm] = useState('');
    const [showHolidayModal, setShowHolidayModal] = useState(false);
    const [showOvertimeModal, setShowOvertimeModal] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    
    const [holidays, setHolidays] = useState([]);
    const [leaveStats, setLeaveStats] = useState([]);
    const [employeeLeaves, setEmployeeLeaves] = useState([]);
    const [leaveRecordSummary, setLeaveRecordSummary] = useState([]);
    const [leavePolicies, setLeavePolicies] = useState([]);
    const [activeEmployees, setActiveEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPolicyId, setEditingPolicyId] = useState(null);
    const [editingBalance, setEditingBalance] = useState('');

    const [holidayFormData, setHolidayFormData] = useState({ date: '', day: '', name: '' });
    const [overtimeFormData, setOvertimeFormData] = useState({ employeeCode: '', date: '', overtimeHours: '' });

    const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Leave Policies
            const policyRes = await fetch(`${API_URL}/leaves/policies`);
            const policyData = await policyRes.json();
            const realPolicies = policyData.success ? policyData.data : [];
            setLeavePolicies(realPolicies);

            // 2. Fetch Holidays
            const holidayRes = await fetch(`${API_URL}/calendar`);
            const holidayData = await holidayRes.json();
            const realHolidays = holidayData.success ? holidayData.data.filter(ev => ev.type === 'holiday') : [];
            setHolidays(realHolidays.map(h => ({
                date: new Date(h.date).toLocaleDateString('en-GB'),
                day: new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' }),
                name: h.title
            })));

            // 3. Fetch Monthly Attendance for Overtime
            const attendanceRes = await fetch(`${API_URL}/attendance/monthly?month=${selectedMonth}&year=${selectedYear}`);
            const attendanceData = await attendanceRes.json();
            const monthlyAttendance = attendanceData.success ? attendanceData.data : [];
            setEmployeeLeaves(monthlyAttendance.map(emp => ({
                id: emp.emp_code,
                name: emp.name,
                designation: emp.department,
                total: emp.leaveDays || 0,
                overtime: emp.otHrs || 0
            })));

            // 4. Fetch Leave Record Summary (yearly)
            const summaryRes = await fetch(`${API_URL}/leaves/summary?year=${selectedYear}`);
            const summaryData = await summaryRes.json();
            if (summaryData.success) {
                setLeaveRecordSummary(summaryData.data);
            }

            // 5. Fetch Active Employees
            const activeRes = await fetch(`${API_URL}/employees/active`);
            const activeData = await activeRes.json();
            if (activeData.success) {
                setActiveEmployees(activeData.data);
            }

            // Update Stats based on real policies
            const stats = realPolicies.map((p, i) => {
                const colors = [
                    { bg: 'bg-red-100', text: 'text-red-600', icon: UserX },
                    { bg: 'bg-green-100', text: 'text-green-600', icon: UserCheck },
                    { bg: 'bg-amber-100', text: 'text-amber-600', icon: Clock },
                    { bg: 'bg-blue-100', text: 'text-blue-600', icon: Users }
                ];
                const color = colors[i % colors.length];
                return {
                    id: p.id,
                    type: p.leaveName,
                    code: p.leaveCode,
                    balance: p.balance,
                    total: `${p.balance} Days`,
                    ...color
                };
            });
            setLeaveStats(stats);
        } catch (error) {
            console.error('Error fetching leave policy data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    const filteredHolidays = holidays.filter(h =>
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.date.includes(searchTerm)
    );

    const filteredEmployeesSummary = leaveRecordSummary.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOvertime = employeeLeaves.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditPolicy = (policy) => {
        setEditingPolicyId(policy.id);
        setEditingBalance(String(policy.balance));
    };

    const handleCancelEdit = () => {
        setEditingPolicyId(null);
        setEditingBalance('');
    };

    const handleSavePolicy = async (policyId) => {
        try {
            const response = await fetch(`${API_URL}/leaves/policies/${policyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ balance: Number(editingBalance) }),
            });
            const result = await response.json();
            if (result.success) {
                toast.success('Leave balance updated!');
                setEditingPolicyId(null);
                setEditingBalance('');
                fetchData();
            } else {
                toast.error(result.message || 'Failed to update');
            }
        } catch (error) {
            console.error('Error updating policy:', error);
            toast.error('Failed to update leave balance');
        }
    };

    const handleHolidayInputChange = (e) => {
        const { name, value } = e.target;
        setHolidayFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/calendar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: holidayFormData.name,
                    date: holidayFormData.date,
                    time: '',
                    location: '',
                    type: 'holiday',
                    description: `Day: ${holidayFormData.day}`
                }),
            });
            const result = await response.json();
            if (result.success) {
                setShowHolidayModal(false);
                setHolidayFormData({ date: '', day: '', name: '' });
                fetchData();
                toast.success('Holiday added successfully!');
            } else {
                toast.error(result.message || 'Failed to add holiday');
            }
        } catch (error) {
            console.error('Error adding holiday:', error);
            toast.error('Failed to add holiday');
        }
    };

    const handleOvertimeInputChange = (e) => {
        const { name, value } = e.target;
        setOvertimeFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddOvertime = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/attendance/overtime`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeCode: overtimeFormData.employeeCode,
                    date: overtimeFormData.date,
                    overtimeHours: parseFloat(overtimeFormData.overtimeHours)
                }),
            });
            const result = await response.json();
            if (result.success) {
                setShowOvertimeModal(false);
                setOvertimeFormData({ employeeCode: '', date: '', overtimeHours: '' });
                fetchData();
                toast.success('Overtime logged successfully!');
            } else {
                toast.error(result.message || 'Failed to log overtime');
            }
        } catch (error) {
            console.error('Error logging overtime:', error);
            toast.error('Failed to log overtime');
        }
    };

    const renderHolidayTable = () => (
        <table className="min-w-full divide-y divide-white">
            <thead className="bg-gray-100">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holiday Name</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white">
                {filteredHolidays.length > 0 ? (
                    filteredHolidays.map((item, index) => (
                        <tr key={index} className="hover:bg-white text-sm text-gray-500">
                            <td className="px-6 py-4 whitespace-nowrap">{item.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{item.day}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.name}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="3" className="px-6 py-12 text-center text-gray-500">No holidays found.</td>
                    </tr>
                )}
            </tbody>
        </table>
    );

    const renderOvertimeTable = () => (
        <table className="min-w-full divide-y divide-white">
            <thead className="bg-gray-100">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Overtime (Hours)</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white">
                {filteredOvertime.length > 0 ? (
                    filteredOvertime.map((emp, index) => (
                        <tr key={index} className="hover:bg-white text-sm text-gray-500">
                            <td className="px-6 py-4 whitespace-nowrap">{emp.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{emp.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{emp.designation}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-indigo-600 font-bold">
                                {parseFloat(emp.overtime || 0).toFixed(2)} hrs
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No overtime data found.</td>
                    </tr>
                )}
            </tbody>
        </table>
    );

    const renderEmployeeLeaveDisplay = () => (
        <div className="space-y-8">
            <div className="flex flex-wrap lg:flex-nowrap gap-4">
                {leaveStats.map((stat, idx) => {
                    const Icon = stat.icon;
                    const isEditing = editingPolicyId === stat.id;
                    return (
                        <div key={idx} className="flex-1 min-w-[180px] bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center transition-all hover:shadow-lg relative group">
                            <div className={`p-3 rounded-xl ${stat.bg} mr-4 shrink-0`}>
                                <Icon size={22} className={stat.text} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider truncate">{stat.type.split(' (')[0]}</p>
                                {isEditing ? (
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            type="number"
                                            min="0"
                                            value={editingBalance}
                                            onChange={(e) => setEditingBalance(e.target.value)}
                                            className="w-16 text-lg font-bold text-gray-800 border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSavePolicy(stat.id);
                                                if (e.key === 'Escape') handleCancelEdit();
                                            }}
                                        />
                                        <button
                                            onClick={() => handleSavePolicy(stat.id)}
                                            className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                            title="Save"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                            title="Cancel"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-1">
                                        <h3 className="text-xl font-bold text-gray-800">{stat.total.split(' ')[0]}</h3>
                                        <span className="text-[10px] text-gray-400 font-medium">Days</span>
                                    </div>
                                )}
                            </div>
                            {!isEditing && (
                                <button
                                    onClick={() => handleEditPolicy(stat)}
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title={`Edit ${stat.type} balance`}
                                >
                                    <Pencil size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <User size={20} className="text-indigo-600" />
                    Employee Leave Record Summary
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
                    <table className="min-w-full divide-y divide-white">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                                {leavePolicies.map((policy, idx) => (
                                    <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                                        {policy.leaveCode || policy.leaveName}
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center font-bold text-indigo-600">Total Taken</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white">
                            {filteredEmployeesSummary.length > 0 ? (
                                filteredEmployeesSummary.map((emp, index) => (
                                    <tr key={index} className="hover:bg-white text-sm text-gray-500">
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-bold text-indigo-700">{emp.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{emp.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{emp.designation}</td>
                                        {leavePolicies.map((policy, idx) => {
                                            const balance = emp.leaves?.[policy.leaveCode] || { limit: policy.balance || 0, taken: 0 };
                                            return (
                                                <td key={idx} className="px-6 py-4 whitespace-nowrap text-center text-indigo-600 font-medium">
                                                    {balance.limit}({balance.taken})
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-indigo-700 bg-indigo-50/30">{emp.total}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4 + leavePolicies.length} className="px-6 py-12 text-center text-gray-500">No employee leave record found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px]">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                    </div>
                </div>

                {(activeTab === 'leaves' || activeTab === 'overtime') && (
                    <div className="flex items-center gap-2">
                        <select
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                        <select
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {['2025', '2026', '2027'].map(y => (
                                <option key={y} value={Number(y)}>{y}</option>
                            ))}
                        </select>
                    </div>
                )}

                {activeTab === 'holidays' && (
                    <button
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        onClick={() => setShowHolidayModal(true)}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Holiday
                    </button>
                )}

                {activeTab === 'overtime' && (
                    <button
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        onClick={() => setShowOvertimeModal(true)}
                    >
                        <Plus size={16} className="mr-2" />
                        Add Overtime
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        <button
                            onClick={() => { setActiveTab('leaves'); setSearchTerm(''); }}
                            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'leaves'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Employee Leave Record
                        </button>
                        <button
                            onClick={() => { setActiveTab('holidays'); setSearchTerm(''); }}
                            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'holidays'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Company Holiday List
                        </button>
                        <button
                            onClick={() => { setActiveTab('overtime'); setSearchTerm(''); }}
                            className={`py-4 px-6 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'overtime'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Overtime
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            <p className="text-gray-500 font-medium animate-pulse">Fetching records...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-hide">
                            {activeTab === 'holidays' ? renderHolidayTable() : activeTab === 'overtime' ? renderOvertimeTable() : renderEmployeeLeaveDisplay()}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Holiday Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Add New Holiday</h2>
                            <button onClick={() => setShowHolidayModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddHoliday} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={holidayFormData.date}
                                    onChange={handleHolidayInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Day *</label>
                                <select
                                    name="day"
                                    value={holidayFormData.day}
                                    onChange={handleHolidayInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                >
                                    <option value="">Select Day</option>
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter holiday name"
                                    value={holidayFormData.name}
                                    onChange={handleHolidayInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowHolidayModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                                >
                                    Save Holiday
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Overtime Modal */}
            {showOvertimeModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-800">Add Overtime Hours</h2>
                            <button onClick={() => setShowOvertimeModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddOvertime} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                                <select
                                    name="employeeCode"
                                    value={overtimeFormData.employeeCode}
                                    onChange={handleOvertimeInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {activeEmployees.map(emp => (
                                        <option key={emp.employee_id} value={emp.employee_code}>
                                            {emp.employee_code} - {emp.name_as_per_aadhar}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={overtimeFormData.date}
                                    onChange={handleOvertimeInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Hours *</label>
                                <input
                                    type="number"
                                    name="overtimeHours"
                                    step="0.1"
                                    placeholder="Enter hours (e.g. 2.5)"
                                    value={overtimeFormData.overtimeHours}
                                    onChange={handleOvertimeInputChange}
                                    className="w-full border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowOvertimeModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                                >
                                    Save Overtime
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavePolicy;

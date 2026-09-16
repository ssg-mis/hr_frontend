import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, X, User, Shield, Key, UserPlus, Eye, EyeOff,
  Award, Building, ChevronLeft, ChevronRight, Users, CheckCircle, Sliders
} from 'lucide-react';
import api from '../lib/api';
import SearchableEmployeeSelect from '../components/SearchableEmployeeSelect';


const ITEMS_PER_PAGE = 20;

const Settings = () => {
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: null,
    username: '',
    password: '',
    name: '',
    role: 'Employee',
    employee_id: ''
  });
  const [employeeSelectError, setEmployeeSelectError] = useState(false);


  // Top Tab Navigation state ('credentials' | 'hod' | 'roles')
  const [activeTab, setActiveTab] = useState('credentials');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // HOD Assignment state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedHodEmpId, setSelectedHodEmpId] = useState('');
  const [assigningHod, setAssigningHod] = useState(false);

  // Role Management state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empRoles, setEmpRoles] = useState([]);
  const [selectedRoleToAssign, setSelectedRoleToAssign] = useState('Employee');
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const fetchEmployees = async () => {
    try {
      const result = await api.get('/employees/active');
      setEmployees(result.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch active employees');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.get('/users');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setLoadingDepts(true);
      const result = await api.get('/departments');
      setDepartments(result.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast.error('Failed to fetch departments');
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleOpenAddModal = () => {
    setCurrentUser({
      id: null,
      username: '',
      password: '',
      name: '',
      role: 'Employee',
      employee_id: ''
    });
    setIsEditing(false);
    setShowPassword(false);
    setEmployeeSelectError(false);
    setShowModal(true);
  };

  const handleOpenEditModal = (user) => {
    setCurrentUser({
      id: user.id,
      username: user.username,
      password: '', // do not prefill password for security
      name: user.name,
      role: user.role || 'Employee',
      employee_id: user.employee_id || ''
    });
    setIsEditing(true);
    setShowPassword(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEmployeeSelectError(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    if (!isEditing && !currentUser.employee_id) {
      setEmployeeSelectError(true);
      toast.error('Please search and select an active employee');
      return;
    }
    setEmployeeSelectError(false);
    try {
      if (isEditing) {
        await api.put(`/users/${currentUser.id}`, currentUser);
        toast.success('User updated successfully');
      } else {
        await api.post('/users', currentUser);
        toast.success('User created successfully');
      }
      handleCloseModal();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to disable login credentials for this employee?')) {
      try {
        await api.delete(`/users/${id}`);
        toast.success('User login credentials disabled successfully');
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error(error.message || 'Failed to delete user');
      }
    }
  };

  // Assign HOD
  const handleAssignHod = async (e) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedHodEmpId) {
      toast.error('Please select both department and employee');
      return;
    }
    try {
      setAssigningHod(true);
      await api.patch(`/departments/${selectedDeptId}/hod`, { employeeId: selectedHodEmpId });
      toast.success('HOD assigned successfully');
      setSelectedDeptId('');
      setSelectedHodEmpId('');
      fetchDepartments();
      fetchEmployees();
      fetchUsers(); // Refresh roles list
    } catch (error) {
      console.error('Error assigning HOD:', error);
      toast.error(error.message || 'Failed to assign HOD');
    } finally {
      setAssigningHod(false);
    }
  };

  // Remove HOD
  const handleRemoveHod = async (deptId) => {
    if (window.confirm('Are you sure you want to remove the HOD from this department?')) {
      try {
        await api.delete(`/departments/${deptId}/hod`);
        toast.success('HOD removed successfully');
        fetchDepartments();
        fetchUsers(); // Refresh roles list
      } catch (error) {
        console.error('Error removing HOD:', error);
        toast.error(error.message || 'Failed to remove HOD');
      }
    }
  };

  // Role Management helpers
  const fetchEmployeeRoles = async (empId) => {
    if (!empId) {
      setEmpRoles([]);
      setSelectedRoleToAssign('Employee');
      return;
    }
    try {
      setLoadingRoles(true);
      const result = await api.get(`/employees/${empId}/roles`);
      const roles = result.data.map(r => r.role) || [];
      setEmpRoles(roles);
      setSelectedRoleToAssign(roles[0] || 'Employee');
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to fetch roles for employee');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleRoleChange = async (roleName) => {
    try {
      await api.post(`/employees/${selectedEmpId}/roles`, { role: roleName });
      toast.success(`Role updated to '${roleName}' successfully`);
      fetchEmployeeRoles(selectedEmpId);
      fetchUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto p-2 sm:p-4">

      {/* ── Top Header & Tab Navigation ──────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
            <Sliders size={24} className="text-indigo-600" /> System Settings & Roles
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
            Manage employee login credentials, department HOD setups, and system access permissions.
          </p>
        </div>

        {/* Tab Switcher Buttons - Positioned Below Title & Description */}
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-xl border border-gray-200/60 w-fit">
          <button
            onClick={() => setActiveTab('credentials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'credentials'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Shield size={16} className={activeTab === 'credentials' ? 'text-indigo-600' : 'text-gray-400'} />
            User Credentials
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'credentials' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('hod')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'hod'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Building size={16} className={activeTab === 'hod' ? 'text-indigo-600' : 'text-gray-400'} />
            HOD Setup
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'roles'
                ? 'bg-white text-indigo-700 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <Award size={16} className={activeTab === 'roles' ? 'text-indigo-600' : 'text-gray-400'} />
            Employee Roles
          </button>
        </div>
      </div>

      {/* ── TAB 1: User Login Credentials Panel ───────────────────────── */}
      {activeTab === 'credentials' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Shield size={18} className="text-indigo-600" />
                Employee Login Credentials
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">View and manage employee access accounts (20 users per page).</p>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center self-start md:self-auto px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm font-bold text-xs sm:text-sm"
            >
              <UserPlus size={16} className="mr-2" />
              Create Credentials
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Search by employee name or username..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">
              Showing <span className="text-gray-900 font-bold">{filteredUsers.length}</span> total user accounts
            </span>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Name</th>
                  <th className="px-6 py-3.5 text-left">Emp ID</th>
                  <th className="px-6 py-3.5 text-left">Username</th>
                  <th className="px-6 py-3.5 text-left">System Role</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loadingUsers ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading user credentials...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length > 0 ? (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mr-3 text-xs border border-indigo-200">
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono text-xs font-bold text-indigo-700">
                        {user.employee_id ? `EMP-${String(user.employee_id).padStart(3, '0')}` : '-'}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {user.username}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        {user.role === 'Admin' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield size={12} className="mr-1 text-purple-600" /> Administrator
                          </span>
                        ) : user.role === 'HR' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            <Shield size={12} className="mr-1 text-teal-600" /> HR Specialist
                          </span>
                        ) : user.role === 'HOD' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Shield size={12} className="mr-1 text-amber-600" /> Department HOD
                          </span>
                        ) : user.role === 'CanteenManager' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                            <Shield size={12} className="mr-1 text-orange-600" /> Canteen Manager
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <User size={12} className="mr-1 text-blue-600" /> Employee
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-lg transition-colors"
                            title="Edit Credentials"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors"
                            title="Disable Login"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-semibold">
                      No user accounts found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer (20 items per page) ────────────────── */}
          {!loadingUsers && filteredUsers.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <p className="text-gray-500">
                Showing{' '}
                <span className="font-bold text-gray-900">
                  {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)}
                </span>{' '}
                of <span className="font-bold text-gray-900">{filteredUsers.length}</span> accounts
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 text-xs transition-colors"
                >
                  <ChevronLeft size={14} /> Previous
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    // Show first, last, current, and surrounding pages
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - currentPage) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (pageNum === 2 && currentPage > 3) {
                      return <span key="dots1" className="text-gray-400 text-xs px-0.5">...</span>;
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 2) {
                      return <span key="dots2" className="text-gray-400 text-xs px-0.5">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold flex items-center gap-1 text-xs transition-colors"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Department HOD Assignment Setup Panel ─────────────── */}
      {activeTab === 'hod' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building size={20} className="text-indigo-600" />
              Department HOD Setup
            </h2>
            <p className="text-sm text-gray-500 mt-1">Assign Head of Department (HOD) leaders directly to company departments.</p>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleAssignHod} className="space-y-4 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Select Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                    required
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Select HOD Employee</label>
                  <SearchableEmployeeSelect
                    employees={employees}
                    selectedEmployeeId={selectedHodEmpId}
                    onSelect={(emp) => {
                      setSelectedHodEmpId(emp ? emp.employee_id.toString() : '');
                    }}
                    placeholder="Type name or code to search HOD..."
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={assigningHod}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {assigningHod ? 'Assigning HOD...' : 'Assign Department HOD'}
              </button>
            </form>

            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Current Department Leaders</h3>
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {loadingDepts ? (
                  <p className="text-sm text-gray-500 text-center py-6">Loading departments list...</p>
                ) : departments.length > 0 ? (
                  departments.map(dept => (
                    <div key={dept.id} className="py-3 flex items-center justify-between text-sm hover:bg-gray-50 px-2 rounded-lg transition-colors">
                      <div>
                        <span className="font-bold text-gray-900">{dept.name} Department</span>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                          {dept.hodName ? `Current HOD: ${dept.hodName}` : 'No HOD Assigned'}
                        </p>
                      </div>
                      {dept.hodId && (
                        <button
                          onClick={() => handleRemoveHod(dept.id)}
                          className="px-3 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg font-bold transition-colors"
                        >
                          Remove HOD
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-6">No departments found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Employee Role Management Panel ─────────────────────── */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 max-w-4xl mx-auto">
          <div className="p-6 border-b border-gray-200 bg-gray-50/50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Award size={20} className="text-indigo-600" />
              Employee Role Management
            </h2>
            <p className="text-sm text-gray-500 mt-1">Customize and assign system authorization roles for individual employees.</p>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Select Employee to Manage Role
              </label>
              <SearchableEmployeeSelect
                employees={employees}
                selectedEmployeeId={selectedEmpId}
                onSelect={(emp) => {
                  const empId = emp ? emp.employee_id.toString() : '';
                  setSelectedEmpId(empId);
                  fetchEmployeeRoles(empId);
                }}
                placeholder="Type name or code to search employee..."
              />
            </div>

            {selectedEmpId ? (
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">
                  Assign System Role to: <span className="text-indigo-700 font-extrabold">{employees.find(e => e.employee_id.toString() === selectedEmpId)?.name_as_per_aadhar}</span>
                </h3>

                {loadingRoles ? (
                  <p className="text-sm text-gray-500 text-center py-6">Loading assigned role details...</p>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Select Active System Role</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select
                        value={selectedRoleToAssign}
                        onChange={(e) => setSelectedRoleToAssign(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
                      >
                        <option value="Employee">Employee</option>
                        <option value="HOD">HOD (Department Leader)</option>
                        <option value="Admin">Admin (Full System Control)</option>
                        <option value="HR">HR Specialist</option>
                        <option value="CanteenManager">Canteen Manager</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRoleChange(selectedRoleToAssign)}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <CheckCircle size={16} />
                        Done
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                      <span>Select a system role from the dropdown and click <strong>Done</strong> to save changes.</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm gap-2">
                <Award size={32} className="opacity-30" />
                <span className="font-medium">Select an employee from the dropdown above to view or update their system role.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-gray-100 bg-indigo-600 text-white flex items-center justify-between rounded-t-2xl">
              <h3 className="font-bold text-base flex items-center gap-2">
                {isEditing ? <Edit2 size={18} /> : <UserPlus size={18} />}
                {isEditing ? 'Edit User Credentials' : 'Create User Credentials'}
              </h3>
              <button onClick={handleCloseModal} className="text-white/80 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
              {!isEditing && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                    Select Employee
                  </label>
                  <SearchableEmployeeSelect
                    employees={employees}
                    selectedEmployeeId={currentUser.employee_id}
                    onSelect={(emp) => {
                      setCurrentUser(prev => ({
                        ...prev,
                        employee_id: emp ? emp.employee_id.toString() : '',
                        name: emp ? emp.name_as_per_aadhar : prev.name
                      }));
                      if (emp) setEmployeeSelectError(false);
                    }}
                    placeholder="Type name or employee code to search..."
                    error={employeeSelectError}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentUser.name}
                  onChange={handleInputChange}
                  placeholder="Employee Full Name"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={currentUser.username}
                  onChange={handleInputChange}
                  placeholder="System Login Username"
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                  {isEditing ? 'New Password (Leave blank to keep existing)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={currentUser.password}
                    onChange={handleInputChange}
                    placeholder={isEditing ? '••••••••' : 'Enter login password'}
                    className="w-full border border-gray-300 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                    required={!isEditing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">System Access Role</label>
                <select
                  name="role"
                  value={currentUser.role}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold"
                >
                  <option value="Employee">Employee</option>
                  <option value="HOD">HOD (Department Leader)</option>
                  <option value="Admin">Admin (Full Control)</option>
                  <option value="HR">HR Specialist</option>
                  <option value="CanteenManager">Canteen Manager</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-2 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  {isEditing ? 'Save Changes' : 'Create Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

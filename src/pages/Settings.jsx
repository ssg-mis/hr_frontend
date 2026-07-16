import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, User, Shield, Key, UserPlus, Eye, EyeOff, Award, Building } from 'lucide-react';
import api from '../lib/api';

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

  // HOD Assignment state
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedHodEmpId, setSelectedHodEmpId] = useState('');
  const [assigningHod, setAssigningHod] = useState(false);

  // Role Management state
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [empRoles, setEmpRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchDepartments();
  }, []);

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
      return;
    }
    try {
      setLoadingRoles(true);
      const result = await api.get(`/employees/${empId}/roles`);
      setEmpRoles(result.data.map(r => r.role) || []);
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
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      
      {/* 1. User Management Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Shield size={20} className="mr-2 text-indigo-600" />
              Employee Login Credentials
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage system login usernames, passwords, and permissions.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center self-start md:self-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold text-sm"
          >
            <UserPlus size={18} className="mr-2" />
            Create Credentials
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search by name or username..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Emp ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">System Role</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingUsers ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-3 text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {user.employee_id ? `EMP-${String(user.employee_id).padStart(3, '0')}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.role === 'Admin' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Shield size={12} className="mr-1" /> Administrator
                        </span>
                      ) : user.role === 'HR' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          <Shield size={12} className="mr-1" /> HR Specialist
                        </span>
                      ) : user.role === 'HOD' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <Shield size={12} className="mr-1" /> Department HOD
                        </span>
                      ) : user.role === 'CanteenManager' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Shield size={12} className="mr-1" /> Canteen Manager
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <User size={12} className="mr-1" /> Employee
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Credentials"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Disable Login"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Department HOD Assignment Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Building size={20} className="mr-2 text-indigo-600" />
              Department HOD Setup
            </h2>
            <p className="text-sm text-gray-500 mt-1">Assign HODs directly to departments. Updates employee role automatically.</p>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <form onSubmit={handleAssignHod} className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Department</label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select HOD Employee</label>
                  <select
                    value={selectedHodEmpId}
                    onChange={(e) => setSelectedHodEmpId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  >
                    <option value="">-- Select --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.name_as_per_aadhar} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={assigningHod}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow transition-colors disabled:opacity-50"
              >
                {assigningHod ? 'Assigning HOD...' : 'Assign HOD'}
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Current Department Leaders</h3>
              <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto pr-1">
                {loadingDepts ? (
                  <p className="text-sm text-gray-500 text-center py-4">Loading departments...</p>
                ) : departments.length > 0 ? (
                  departments.map(dept => (
                    <div key={dept.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold text-gray-800">{dept.name} Department</span>
                        <p className="text-xs text-gray-500">
                          {dept.hodName ? `HOD: ${dept.hodName}` : 'No HOD Assigned'}
                        </p>
                      </div>
                      {dept.hodId && (
                        <button
                          onClick={() => handleRemoveHod(dept.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No departments found</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Detailed Role Assignment Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Award size={20} className="mr-2 text-indigo-600" />
              Employee Role Management
            </h2>
            <p className="text-sm text-gray-500 mt-1">Directly view and customize system roles for individual employees.</p>
          </div>

          <div className="p-6 space-y-6 flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Select Employee to Manage Role</label>
              <select
                value={selectedEmpId}
                onChange={(e) => {
                  const empId = e.target.value;
                  setSelectedEmpId(empId);
                  fetchEmployeeRoles(empId);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name_as_per_aadhar} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>

            {selectedEmpId ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-700">
                  Assign Role to {employees.find(e => e.employee_id.toString() === selectedEmpId)?.name_as_per_aadhar}
                </h3>
                
                {loadingRoles ? (
                  <p className="text-sm text-gray-500 text-center py-4">Loading assigned role...</p>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Select Active System Role</label>
                    <select
                      value={empRoles[0] || 'Employee'}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="Employee">Employee</option>
                      <option value="HOD">HOD</option>
                      <option value="Admin">Admin</option>
                      <option value="HR">HR</option>
                      <option value="CanteenManager">Canteen Manager</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                Select an employee from the dropdown to see/edit their role.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* User Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                {isEditing ? <Edit2 size={20} className="mr-2 text-indigo-600" /> : <UserPlus size={20} className="mr-2 text-indigo-600" />}
                {isEditing ? 'Edit User Credentials' : 'Create New User Credentials'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
              {!isEditing && (
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <User size={14} className="mr-1" /> Select Employee
                  </label>
                  <select
                    name="employee_id"
                    value={currentUser.employee_id || ''}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const employee = employees.find(emp => emp.employee_id.toString() === empId);
                      setCurrentUser(prev => ({
                        ...prev,
                        employee_id: empId,
                        name: employee ? employee.name_as_per_aadhar : prev.name
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                    required
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.name_as_per_aadhar} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <User size={14} className="mr-1" /> Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={currentUser.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  required
                  disabled={!isEditing && currentUser.employee_id}
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Shield size={14} className="mr-1" /> Username
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={currentUser.username}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Key size={14} className="mr-1" /> Password
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
                    value={currentUser.password}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required={!isEditing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-indigo-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                  <Shield size={14} className="mr-1" /> Assigned Role
                </label>
                <select
                  name="role"
                  value={currentUser.role || 'Employee'}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                >
                  <option value="Employee">Employee</option>
                  <option value="HOD">HOD</option>
                  <option value="Admin">Admin</option>
                  <option value="HR">HR</option>
                  <option value="CanteenManager">Canteen Manager</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 text-sm"
                >
                  {isEditing ? 'Update Credentials' : 'Create Credentials'}
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

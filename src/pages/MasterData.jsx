import React, { useState, useEffect, useMemo } from 'react';
import {
  Database,
  Search,
  Edit2,
  Plus,
  Building,
  Briefcase,
  Users,
  CreditCard,
  CheckCircle,
  AlertCircle,
  X,
  Save,
  Filter,
  RefreshCw,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'departments' | 'designations' | 'branches'

  // Data states
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [missingFilter, setMissingFilter] = useState('all'); // 'all' | 'missingBank' | 'missingSalary' | 'missingDesg' | 'missingPan' | 'missingDob'

  // Edit Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('personal'); // 'personal' | 'job' | 'bank' | 'salary'
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchAllMasterData();
  }, []);

  const fetchAllMasterData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, desgRes, branchRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/designations'),
        api.get('/company-branches'),
      ]);

      setEmployees(empRes.data?.data || empRes.data || []);
      setDepartments(deptRes.data?.data || deptRes.data || []);
      setDesignations(desgRes.data?.data || desgRes.data || []);
      setBranches(branchRes.data?.data || branchRes.data || []);
    } catch (err) {
      console.error('Failed to fetch master data:', err);
      toast.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const searchLower = searchTerm.toLowerCase();
      const code = (emp.biometricEmployeeCode || emp.employeeCode || '').toLowerCase();
      const name = (emp.candidateName || '').toLowerCase();
      const dept = (emp.departmentName || '').toLowerCase();
      const desg = (emp.applyingForPost || emp.designationName || '').toLowerCase();
      const bank = (emp.bankAccountNo || '').toLowerCase();

      const matchesSearch =
        !searchTerm ||
        code.includes(searchLower) ||
        name.includes(searchLower) ||
        dept.includes(searchLower) ||
        desg.includes(searchLower) ||
        bank.includes(searchLower);

      if (!matchesSearch) return false;

      if (missingFilter === 'missingBank') {
        return !emp.bankAccountNo || !emp.ifscCode;
      }
      if (missingFilter === 'missingSalary') {
        return Number(emp.baseSalary || 0) === 0;
      }
      if (missingFilter === 'missingDesg') {
        return !emp.applyingForPost && !emp.designationName;
      }
      if (missingFilter === 'missingPan') {
        return !emp.panNo;
      }
      if (missingFilter === 'missingDob') {
        return !emp.dob;
      }

      return true;
    });
  }, [employees, searchTerm, missingFilter]);

  const handleEditClick = (item) => {
    setSelectedItem(item);
    setFormData({
      ...item,
      baseSalary: item.baseSalary || '0.00',
      allowanceSalary: item.allowanceSalary || '0.00',
      dob: item.dob ? item.dob.split('T')[0] : '',
      joiningDate: item.joiningDate ? item.joiningDate.split('T')[0] : '',
    });
    setModalTab('personal');
    setEditModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!selectedItem?.id) return;
    setSaving(true);

    try {
      const payload = {
        candidateName: formData.candidateName,
        biometricEmployeeCode: formData.biometricEmployeeCode,
        candidatePhone: formData.candidatePhone,
        candidateEmail: formData.candidateEmail,
        presentAddress: formData.presentAddress,
        corrAddress: formData.corrAddress,
        dob: formData.dob || null,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        maritalStatus: formData.maritalStatus,
        qualification: formData.qualification,
        fatherName: formData.fatherName,
        aadharNo: formData.aadharNo,
        panNo: formData.panNo,
        voterIdNo: formData.voterIdNo,
        drivingLicenseNo: formData.drivingLicenseNo,
        bankAccountNo: formData.bankAccountNo,
        ifscCode: formData.ifscCode,
        payMode: formData.payMode,
        pfFlag: formData.pfFlag,
        pfNo: formData.pfNo,
        esicFlag: formData.esicFlag,
        esicNo: formData.esicNo,
        status: formData.status,
        designationId: formData.designationId ? Number(formData.designationId) : null,
        branchId: formData.branchId ? Number(formData.branchId) : null,
        baseSalary: formData.baseSalary,
        allowanceSalary: formData.allowanceSalary,
      };

      await api.patch(`/employees/${selectedItem.id}`, payload);
      toast.success(`Employee ${formData.candidateName} updated successfully!`);
      setEditModalOpen(false);
      fetchAllMasterData();
    } catch (err) {
      console.error('Update failed:', err);
      toast.error(err.response?.data?.message || 'Failed to update employee details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Master Data Management</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Centralized portal to view, edit, and update master records for employees, departments, designations, and branches.
          </p>
        </div>

        <button
          onClick={fetchAllMasterData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 rounded-xl font-medium text-sm transition-all shadow-lg backdrop-blur-sm self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Tabs Selection */}
      <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'employees'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Employees Master ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab('departments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'departments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building className="h-4 w-4" />
          Departments ({departments.length})
        </button>

        <button
          onClick={() => setActiveTab('designations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'designations'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Designations ({designations.length})
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'branches'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <MapPin className="h-4 w-4" />
          Company Branches ({branches.length})
        </button>
      </div>

      {/* EMPLOYEES TAB CONTENT */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {/* Controls & Search bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Code, Name, Department, Bank A/C..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Quick Filter Dropdown */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={missingFilter}
                onChange={(e) => setMissingFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Employees ({employees.length})</option>
                <option value="missingBank">⚠️ Missing Bank / IFSC</option>
                <option value="missingSalary">⚠️ Base Salary = ₹0</option>
                <option value="missingDesg">⚠️ Missing Designation</option>
                <option value="missingPan">⚠️ Missing PAN No.</option>
                <option value="missingDob">⚠️ Missing DOB</option>
              </select>
            </div>
          </div>

          {/* Employee Table */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 font-medium animate-pulse">
              Loading master data...
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <AlertCircle className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              No matching employees found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Employee Name</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4 text-right">Base Salary</th>
                    <th className="py-3.5 px-4 text-right">Allowance</th>
                    <th className="py-3.5 px-4 text-right">Total Gross</th>
                    <th className="py-3.5 px-4">Bank A/C & IFSC</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredEmployees.map((emp) => {
                    const base = Number(emp.baseSalary || 0);
                    const allow = Number(emp.allowanceSalary || 0);
                    const gross = base + allow;

                    return (
                      <tr key={emp.id} className="hover:bg-indigo-50/40 transition-colors group">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                          {emp.biometricEmployeeCode || emp.employeeCode}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {emp.candidateName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {emp.applyingForPost || emp.designationName || (
                            <span className="text-amber-500 font-medium text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {emp.departmentName || 'CIVIL'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-900">
                          ₹{base.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-indigo-600">
                          ₹{allow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                          ₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4">
                          {emp.bankAccountNo ? (
                            <div>
                              <div className="font-mono font-medium text-slate-800">{emp.bankAccountNo}</div>
                              <div className="text-[10px] text-slate-400">{emp.ifscCode || 'No IFSC'}</div>
                            </div>
                          ) : (
                            <span className="text-red-500 font-medium text-[11px]">Missing</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              emp.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleEditClick(emp)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs transition-all border border-indigo-200"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DEPARTMENTS TAB CONTENT */}
      {activeTab === 'departments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Departments Master List</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-base">{dept.name}</div>
                <div className="text-xs text-slate-500 mt-1">ID: #{dept.id} {dept.deptCodeFromCsv && `| Code: ${dept.deptCodeFromCsv}`}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DESIGNATIONS TAB CONTENT */}
      {activeTab === 'designations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Designations Master List</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {designations.map((desg) => (
              <div key={desg.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{desg.name}</div>
                  <div className="text-[11px] text-slate-400">Code: {desg.desgCodeFromCsv || 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRANCHES TAB CONTENT */}
      {activeTab === 'branches' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Company Branches</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map((b) => (
              <div key={b.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-base">{b.name}</div>
                <div className="text-xs text-slate-500 mt-1">{b.address}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 my-8 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
              <div>
                <div className="text-xs text-indigo-300 font-mono font-bold">
                  EMP CODE: #{formData.biometricEmployeeCode || formData.employeeCode}
                </div>
                <h3 className="text-xl font-bold mt-0.5">{formData.candidateName}</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2">
              <button
                onClick={() => setModalTab('personal')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'personal'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                👤 Personal Details
              </button>

              <button
                onClick={() => setModalTab('job')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'job'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                💼 Work & Designation
              </button>

              <button
                onClick={() => setModalTab('bank')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'bank'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                💳 Bank & KYC
              </button>

              <button
                onClick={() => setModalTab('salary')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                  modalTab === 'salary'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                💰 Salary & Allowances
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveEmployee} className="p-6">
              {/* TAB 1: PERSONAL DETAILS */}
              {modalTab === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.candidateName || ''}
                      onChange={(e) => handleFormChange('candidateName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Father's Name</label>
                    <input
                      type="text"
                      value={formData.fatherName || ''}
                      onChange={(e) => handleFormChange('fatherName', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.candidatePhone || ''}
                      onChange={(e) => handleFormChange('candidatePhone', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formData.candidateEmail || ''}
                      onChange={(e) => handleFormChange('candidateEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob || ''}
                      onChange={(e) => handleFormChange('dob', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Blood Group</label>
                    <select
                      value={formData.bloodGroup || 'UK'}
                      onChange={(e) => handleFormChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="UK">UK (Unknown / Dash)</option>
                      <option value="A +">A +</option>
                      <option value="A -">A -</option>
                      <option value="B +">B +</option>
                      <option value="B -">B -</option>
                      <option value="O +">O +</option>
                      <option value="O -">O -</option>
                      <option value="AB +">AB +</option>
                      <option value="AB -">AB -</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
                    <select
                      value={formData.gender || 'M'}
                      onChange={(e) => handleFormChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="M">Male (M)</option>
                      <option value="F">Female (F)</option>
                      <option value="O">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Qualification</label>
                    <input
                      type="text"
                      value={formData.qualification || ''}
                      onChange={(e) => handleFormChange('qualification', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Present Address</label>
                    <textarea
                      rows={2}
                      value={formData.presentAddress || ''}
                      onChange={(e) => handleFormChange('presentAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: WORK & DESIGNATION */}
              {modalTab === 'job' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Designation</label>
                    <select
                      value={formData.designationId || ''}
                      onChange={(e) => handleFormChange('designationId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select Designation...</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} (Code: {d.desgCodeFromCsv || d.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Company Branch</label>
                    <select
                      value={formData.branchId || ''}
                      onChange={(e) => handleFormChange('branchId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">Select Branch...</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={(e) => handleFormChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Left">Left</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joiningDate || ''}
                      onChange={(e) => handleFormChange('joiningDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: BANK & KYC */}
              {modalTab === 'bank' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={formData.bankAccountNo || ''}
                      onChange={(e) => handleFormChange('bankAccountNo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Enter Bank A/C Number..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.ifscCode || ''}
                      onChange={(e) => handleFormChange('ifscCode', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. PUNB0194820"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Pay Mode</label>
                    <select
                      value={formData.payMode || 'BANK'}
                      onChange={(e) => handleFormChange('payMode', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="BANK">BANK</option>
                      <option value="CASH">CASH</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={formData.panNo || ''}
                      onChange={(e) => handleFormChange('panNo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="e.g. ABCDE1234F"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Aadhar Number</label>
                    <input
                      type="text"
                      value={formData.aadharNo || ''}
                      onChange={(e) => handleFormChange('aadharNo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="12-digit Aadhar No."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">PF Number / UAN</label>
                    <input
                      type="text"
                      value={formData.pfNo || ''}
                      onChange={(e) => handleFormChange('pfNo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ESIC Number</label>
                    <input
                      type="text"
                      value={formData.esicNo || ''}
                      onChange={(e) => handleFormChange('esicNo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: SALARY & ALLOWANCE */}
              {modalTab === 'salary' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Base Salary (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.baseSalary || ''}
                      onChange={(e) => handleFormChange('baseSalary', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Allowance Salary (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.allowanceSalary || ''}
                      onChange={(e) => handleFormChange('allowanceSalary', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between mt-2">
                    <span className="font-bold text-slate-700 text-sm">Total Monthly Gross Salary:</span>
                    <span className="font-extrabold text-emerald-700 text-lg">
                      ₹
                      {(
                        Number(formData.baseSalary || 0) + Number(formData.allowanceSalary || 0)
                      ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-indigo-200 transition-all"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Master Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterData;

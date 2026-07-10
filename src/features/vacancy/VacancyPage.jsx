import React, { useEffect, useState } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Search, Trash2, Edit2, Link, Briefcase, Calendar, MapPin, DollarSign, Award, Layers, Users, Info, AlertCircle, Clock, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { vacancyApi } from './vacancy.api';
import { designationApi } from '../designation/designation.api';
import { departmentApi } from '../department/department.api';

const VacancyPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVacancyNumber, setEditingVacancyNumber] = useState(null);
  const [viewingVacancy, setViewingVacancy] = useState(null);

  const [formData, setFormData] = useState({
    vacancyName: '',
    designationId: '',
    departmentId: '',
    salaryCriteria: '',
    preferredQualification: '',
    preferredLocation: '',
    remarks: '',
    jobDescription: '',
    gender: '',
    numberOfPost: '',
    competitionDate: '',
    priority: 'Medium',
    status: 'NeedMore',
    experienceRequired: false,
    postingLinks: {
      LinkedIn: '',
      Naukri: '',
      Indeed: '',
      Facebook: '',
    },
  });

  const [customPlatformName, setCustomPlatformName] = useState('');
  const [customLinkUrl, setCustomLinkUrl] = useState('');

  const [vacancyData, setVacancyData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);

  const standardPlatforms = ['LinkedIn', 'Naukri', 'Indeed', 'Facebook'];
  const platforms = ['LinkedIn', 'Naukri', 'Indeed', 'Facebook', 'Others'];

  const handlePlatformChange = (platform) => {
    setSelectedPlatforms((prev) => {
      const isSelected = prev.includes(platform);
      if (isSelected) {
        if (platform === 'Others') {
          setCustomPlatformName('');
          setCustomLinkUrl('');
        } else {
          setFormData((f) => ({
            ...f,
            postingLinks: { ...f.postingLinks, [platform]: '' },
          }));
        }
        return prev.filter((p) => p !== platform);
      }
      return [...prev, platform];
    });
  };

  // Master data (designations + departments) loads once on mount.
  useEffect(() => {
    loadMasters();
  }, []);

  // Vacancy list reloads whenever the search term changes.
  useEffect(() => {
    fetchVacancyData(1);
  }, [searchTerm]);

  const loadMasters = async () => {
    try {
      const [desigs, depts] = await Promise.all([
        designationApi.list(),
        departmentApi.list(),
      ]);
      setDesignations(desigs || []);
      setDepartments(depts || []);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Could not load designations/departments');
    }
  };

  const fetchVacancyData = async (page = 1) => {
    try {
      setTableLoading(true);
      const result = await vacancyApi.list({
        page,
        limit: pagination.limit,
        search: searchTerm,
      });
      // Backend already returns camelCase — no field remapping needed.
      setVacancyData(result.data || []);
      setPagination(
        result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(error.message || 'Could not connect to the backend server');
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchVacancyData(newPage);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleLinkChange = (platform, value) => {
    setFormData((prev) => ({
      ...prev,
      postingLinks: { ...prev.postingLinks, [platform]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.designationId ||
      !formData.departmentId ||
      !formData.gender ||
      !formData.numberOfPost ||
      !formData.competitionDate
    ) {
      toast.error('Please fill all required fields');
      return;
    }

    if (selectedPlatforms.includes('Others')) {
      if (!customPlatformName.trim() || !customLinkUrl.trim()) {
        toast.error('Please specify the custom platform name and link');
        return;
      }
    }

    try {
      setSubmitting(true);

      const cleanedLinks = {};
      if (formData.postingLinks) {
        standardPlatforms.forEach((key) => {
          if (formData.postingLinks[key]?.trim()) {
            cleanedLinks[key] = formData.postingLinks[key].trim();
          }
        });
      }

      if (
        selectedPlatforms.includes('Others') &&
        customPlatformName.trim() &&
        customLinkUrl.trim()
      ) {
        cleanedLinks[customPlatformName.trim()] = customLinkUrl.trim();
      }

      const finalPlatforms = selectedPlatforms.filter((p) => p !== 'Others');
      if (selectedPlatforms.includes('Others') && customPlatformName.trim()) {
        finalPlatforms.push(customPlatformName.trim());
      }

      const hasSocialPlatforms = finalPlatforms.length > 0;

      const payload = {
        vacancyName: formData.vacancyName || null,
        designationId: Number(formData.designationId),
        departmentId: Number(formData.departmentId),
        gender: formData.gender,
        numberOfPosts: parseInt(formData.numberOfPost, 10),
        completionDate: new Date(formData.competitionDate).toISOString(),
        salaryCriteria: formData.salaryCriteria || null,
        jobDescription: formData.jobDescription || null,
        preferredQualification: formData.preferredQualification || null,
        preferredLocation: formData.preferredLocation || null,
        experienceRequired: formData.experienceRequired,
        socialPlatforms: hasSocialPlatforms ? finalPlatforms.join(', ') : null,
        postingLinks: Object.keys(cleanedLinks).length > 0 ? cleanedLinks : null,
        priority: formData.priority || 'Medium',
        status: formData.status || 'NeedMore',
        remarks: formData.remarks || null,
      };

      if (isEditing) {
        await vacancyApi.update(editingVacancyNumber, payload);
        toast.success('Vacancy updated successfully!');
      } else {
        await vacancyApi.create(payload);
        toast.success('Vacancy submitted successfully!');
      }

      handleCancel();
      fetchVacancyData(pagination.page);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Something went wrong! Is the backend running?');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (item) => {
    setIsEditing(true);
    setEditingVacancyNumber(item.vacancyNumber);

    const activePlatforms = item.socialPlatforms
      ? item.socialPlatforms.split(',').map((s) => s.trim())
      : [];

    const selected = [];
    let hasCustom = false;
    let customName = '';
    let customUrl = '';

    activePlatforms.forEach((p) => {
      if (standardPlatforms.includes(p)) {
        selected.push(p);
      } else if (p) {
        hasCustom = true;
        customName = p;
        customUrl = item.postingLinks?.[p] || '';
      }
    });

    if (item.postingLinks) {
      Object.keys(item.postingLinks).forEach((key) => {
        if (!standardPlatforms.includes(key) && key) {
          hasCustom = true;
          customName = key;
          customUrl = item.postingLinks[key];
        }
      });
    }

    if (hasCustom) {
      selected.push('Others');
      setCustomPlatformName(customName);
      setCustomLinkUrl(customUrl);
    } else {
      setCustomPlatformName('');
      setCustomLinkUrl('');
    }

    setSelectedPlatforms(selected);

    let formattedDate = '';
    if (item.completionDate) {
      formattedDate = new Date(item.completionDate).toISOString().split('T')[0];
    }

    setFormData({
      vacancyName: item.vacancyName || '',
      designationId: item.designationId ? String(item.designationId) : '',
      departmentId: item.departmentId ? String(item.departmentId) : '',
      salaryCriteria: item.salaryCriteria || '',
      preferredQualification: item.preferredQualification || '',
      preferredLocation: item.preferredLocation || '',
      remarks: item.remarks || '',
      jobDescription: item.jobDescription || '',
      gender: item.gender || '',
      numberOfPost: item.numberOfPosts || '',
      competitionDate: formattedDate,
      priority: item.priority || 'Medium',
      status: item.status || 'NeedMore',
      experienceRequired: !!item.experienceRequired,
      postingLinks: {
        LinkedIn: item.postingLinks?.LinkedIn || '',
        Naukri: item.postingLinks?.Naukri || '',
        Indeed: item.postingLinks?.Indeed || '',
        Facebook: item.postingLinks?.Facebook || '',
      },
    });
    setShowModal(true);
  };

  const handleCancel = () => {
    setFormData({
      vacancyName: '',
      designationId: '',
      departmentId: '',
      salaryCriteria: '',
      preferredQualification: '',
      preferredLocation: '',
      remarks: '',
      jobDescription: '',
      gender: '',
      numberOfPost: '',
      competitionDate: '',
      priority: 'Medium',
      status: 'NeedMore',
      experienceRequired: false,
      postingLinks: { LinkedIn: '', Naukri: '', Indeed: '', Facebook: '' },
    });
    setCustomPlatformName('');
    setCustomLinkUrl('');
    setSelectedPlatforms([]);
    setIsEditing(false);
    setEditingVacancyNumber(null);
    setShowModal(false);
  };

  const handleDelete = async (item) => {
    if (item.status !== 'Closed') {
      toast.error('You can only delete vacancies that are in a "Closed" hiring status.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete vacancy ${item.vacancyNumber}?`)) {
      return;
    }

    try {
      await vacancyApi.remove(item.vacancyNumber);
      toast.success('Vacancy deleted successfully!');
      fetchVacancyData(pagination.page);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Something went wrong while deleting');
    }
  };

  const handleCopyLink = (vacancyNumber) => {
    const origin = window.location.origin;
    const publicUrl = `${origin}/apply/${vacancyNumber}`;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast.success(`Public application link for ${vacancyNumber} copied!`))
      .catch((err) => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link to clipboard');
      });
  };

  // Client-side filters on top of the current page for snappy UX.
  const filteredVacancyData = vacancyData.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (priorityFilter && item.priority !== priorityFilter) return false;
    if (deptFilter && String(item.departmentId) !== String(deptFilter)) return false;
    return true;
  });

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Low': return 'bg-blue-400';
      default: return 'bg-amber-500';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Closed': return 'bg-gray-400';
      case 'OnHold': return 'bg-amber-500';
      case 'Interviewing': return 'bg-purple-400';
      case 'NeedMore':
      default: return 'bg-emerald-500';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'NeedMore': return 'Open (Need Candidates)';
      case 'Interviewing': return 'Interviewing';
      case 'OnHold': return 'On Hold';
      case 'Closed': return 'Closed';
      default: return status;
    }
  };

  const stats = {
    total: vacancyData.length,
    open: vacancyData.filter((v) => v.status === 'NeedMore').length,
    inProgress: vacancyData.filter((v) => v.status === 'Interviewing').length,
    totalPositions: vacancyData.reduce((acc, v) => acc + (v.numberOfPosts || 0), 0),
    closingIn7: vacancyData.filter((v) => {
      if (!v.completionDate || v.status === 'Closed') return false;
      const diffDays = Math.ceil((new Date(v.completionDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length,
  };

  const getClosingDateLabel = (dateStr, status) => {
    if (!dateStr) return '—';
    const targetDate = new Date(dateStr);
    const diffTime = targetDate.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (status === 'Closed') {
      return targetDate.toLocaleDateString();
    }

    if (diffDays < 0) {
      return `${Math.abs(diffDays)}d overdue`;
    }
    return targetDate.toLocaleDateString();
  };

  const statCards = [
    { label: 'Total Vacancies', value: stats.total, Icon: Briefcase, tint: 'bg-indigo-50 text-indigo-600 border border-indigo-100', valueColor: 'text-gray-900' },
    { label: 'Open', value: stats.open, Icon: Lock, tint: 'bg-green-50 text-green-700 border border-green-100', valueColor: 'text-green-700' },
    { label: 'In Progress', value: stats.inProgress, Icon: Clock, tint: 'bg-amber-50 text-amber-700 border border-amber-100', valueColor: 'text-amber-700' },
    { label: 'Total Positions', value: stats.totalPositions, Icon: Users, tint: 'bg-blue-50 text-blue-600 border border-blue-100', valueColor: 'text-blue-600' },
    { label: 'Closing in 7 days', value: stats.closingIn7, Icon: AlertCircle, tint: 'bg-red-50 text-red-700 border border-red-100', valueColor: stats.closingIn7 > 0 ? 'text-red-650' : 'text-gray-950' },
  ];

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900">Manpower Indents</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Track and manage recruitment requirements across departments
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsEditing(false);
              setShowModal(true);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-100 transition-all duration-150 inline-flex items-center gap-2"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Vacancy
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.tint}`}>
              <s.Icon className="h-5.5 w-5.5" />
            </div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold leading-none tracking-tight tabular-nums ${s.valueColor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search vacancy #, name or qualification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-10 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-blue-500 md:min-w-40"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-blue-500 md:min-w-32"
          >
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-700 outline-none transition-colors focus:border-blue-500 md:min-w-32"
          >
            <option value="">All Statuses</option>
            <option value="NeedMore">Open</option>
            <option value="Interviewing">Interviewing</option>
            <option value="OnHold">On Hold</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Result count */}
      <div className="px-1 text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-900">{filteredVacancyData.length}</span> of{' '}
        <span className="font-semibold text-gray-900">{vacancyData.length}</span> vacancies
      </div>

      {/* Data Grid Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Vacancy Code</th>
                <th className="px-6 py-3 text-left">Vacancy Details</th>
                <th className="px-6 py-3 text-left">Designation / Dept</th>
                <th className="px-6 py-3 text-center">Openings</th>
                <th className="px-6 py-3 text-left">Priority</th>
                <th className="px-6 py-3 text-left">Target Closing</th>
                <th className="px-6 py-3 text-left">Hiring Status</th>
                <th className="px-6 py-3 text-left">Approval Status</th>
                <th className="px-6 py-3 text-center sticky right-0 bg-gray-50 border-l border-gray-200 z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {tableLoading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading vacancies...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVacancyData.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-16 text-center text-gray-400 text-sm">
                    No vacancies match your filters or search term.
                  </td>
                </tr>
              ) : (
                filteredVacancyData.map((item) => {
                  const closingDate = item.completionDate;
                  const diffTime = closingDate ? new Date(closingDate).getTime() - Date.now() : 0;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const overdue = closingDate && diffDays < 0 && item.status !== 'Closed';

                  return (
                    <tr key={item.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setViewingVacancy(item)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors"
                        >
                          {item.vacancyNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        {item.vacancyName || <span className="text-gray-400 font-normal">Unnamed vacancy</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-800">{item.designationName || '—'}</div>
                        <div className="text-xs text-gray-400 font-medium">{item.departmentName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-1">
                          <Users size={14} className="text-gray-400" />
                          <span className="font-bold text-gray-800">{item.numberOfPosts} Posts</span>
                          <span className="text-xs text-gray-400 uppercase font-medium">({item.gender})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getPriorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className={`flex items-center gap-1.5 ${overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                          <Calendar size={14} className="shrink-0" />
                          {getClosingDateLabel(item.completionDate, item.status)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span
                          title={item.approvalStatus === 'Rejected' ? `Rejection Reason: ${item.rejectionRemark}` : ''}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.approvalStatus === 'Approved' ? 'bg-green-50 text-green-700 border border-green-155' : item.approvalStatus === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-155' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                        >
                          {item.approvalStatus}
                        </span>
                        {item.approvalStatus === 'Rejected' && item.rejectionRemark && (
                          <p className="text-[10px] text-red-500 font-medium mt-0.5 max-w-[120px] truncate" title={item.rejectionRemark}>
                            {item.rejectionRemark}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium sticky right-0 bg-white border-l border-gray-200 z-10">
                        <div className="flex items-center justify-center space-x-2">
                          {item.approvalStatus === 'Approved' && (
                            <button
                              onClick={() => handleCopyLink(item.vacancyNumber)}
                              className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                              title="Copy Public Apply Link"
                            >
                              <Link size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Edit Vacancy"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Delete Vacancy"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium">
              Showing <span className="font-bold text-gray-800">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-bold text-gray-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-bold text-gray-800">{pagination.total}</span> results
            </p>
            <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm border border-gray-200 bg-white" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-bold border-r border-gray-150 last:border-0 transition-colors ${
                    pagination.page === i + 1 ? 'z-10 bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-55'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Modal - Create/Edit Form */}
      {showModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-650" /> {isEditing ? 'Edit Vacancy' : 'Create New Vacancy'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Fill in candidate qualifications, closing details, and platform links.
                </p>
              </div>
              <button onClick={handleCancel} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

                {/* Section 1: General Details */}
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">General Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Vacancy Name</label>
                      <input
                        type="text"
                        name="vacancyName"
                        value={formData.vacancyName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="e.g. Senior Backend Developer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Designation <span className="text-red-500">*</span></label>
                      <select
                        name="designationId"
                        value={formData.designationId}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        required
                      >
                        <option value="">Select Designation</option>
                        {designations.map((desig) => (
                          <option key={desig.id} value={desig.id}>
                            {desig.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Department <span className="text-red-500">*</span></label>
                      <select
                        name="departmentId"
                        value={formData.departmentId}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        required
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        >
                          <option value="NeedMore">Open</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="OnHold">On Hold</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Candidate Specifications */}
                <div className="border-t border-gray-150 pt-6">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Candidate Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Salary Criteria</label>
                      <input
                        type="text"
                        name="salaryCriteria"
                        value={formData.salaryCriteria}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="e.g. 20,000 - 25,000 PM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                          required
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Any">Any</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Posts Count <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          name="numberOfPost"
                          value={formData.numberOfPost}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                          placeholder="No. of openings"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Target Closure Date <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        name="competitionDate"
                        value={formData.competitionDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Location</label>
                      <input
                        type="text"
                        name="preferredLocation"
                        value={formData.preferredLocation}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="e.g. Noida / Gurugram"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Qualification</label>
                      <input
                        type="text"
                        name="preferredQualification"
                        value={formData.preferredQualification}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="e.g. B.Tech / MBA / Graduate"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="experienceRequired"
                        name="experienceRequired"
                        checked={formData.experienceRequired}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="experienceRequired" className="text-sm font-semibold text-gray-700">
                        Professional experience is mandatory for applicants
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section 3: Job Distribution Channels */}
                <div className="border-t border-gray-150 pt-6">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Publish & Job Board Integration</h4>
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                      Select which platforms you are publishing on. Checking a platform will enable a job post link input.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {platforms.map((platform) => {
                        const isSelected = selectedPlatforms.includes(platform);
                        return (
                          <button
                            type="button"
                            key={platform}
                            onClick={() => handlePlatformChange(platform)}
                            className={`flex items-center space-x-2 p-2.5 rounded-xl border text-left transition-all ${
                              isSelected ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'bg-white border-gray-250 text-gray-650 hover:bg-gray-50'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`} />
                            <span className="text-sm">{platform}</span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedPlatforms.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in duration-300">
                        {selectedPlatforms.map((platform) => {
                          if (platform === 'Others') {
                            return (
                              <div key="Others" className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white rounded-lg border border-dashed border-gray-300 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Platform Name <span className="text-red-500">*</span></label>
                                  <input
                                    type="text"
                                    placeholder="e.g. ZipRecruiter, Glassdoor"
                                    value={customPlatformName}
                                    onChange={(e) => setCustomPlatformName(e.target.value)}
                                    className="w-full border border-gray-350 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                                    required={selectedPlatforms.includes('Others')}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Link URL <span className="text-red-500">*</span></label>
                                  <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                      <Link size={14} />
                                    </span>
                                    <input
                                      type="url"
                                      placeholder="https://example.com/jobs/view/..."
                                      value={customLinkUrl}
                                      onChange={(e) => setCustomLinkUrl(e.target.value)}
                                      className="w-full border border-gray-350 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                                      required={selectedPlatforms.includes('Others')}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={platform} className="animate-in slide-in-from-top-2 duration-200">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{platform} Link URL</label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                  <Link size={14} />
                                </span>
                                <input
                                  type="url"
                                  placeholder={`https://${platform.toLowerCase()}.com/jobs/view/...`}
                                  value={formData.postingLinks[platform] || ''}
                                  onChange={(e) => handleLinkChange(platform, e.target.value)}
                                  className="w-full border border-gray-350 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 4: Extra Details */}
                <div className="border-t border-gray-150 pt-6">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Other Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                      <input
                        type="text"
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="Enter Remarks"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Job Description</label>
                      <textarea
                        name="jobDescription"
                        value={formData.jobDescription}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
                        placeholder="Enter detailed job description..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2.5 p-6 border-t border-gray-150 bg-gray-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all duration-150"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-100 transition-all duration-150"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Vacancy' : 'Create Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - View Details */}
      {viewingVacancy && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50/50">
              <div>
                <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-200/60 px-2.5 py-1 rounded-full">
                  {viewingVacancy.vacancyNumber}
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-2">
                  {viewingVacancy.vacancyName || viewingVacancy.designationName}
                </h3>
              </div>
              <button
                onClick={() => setViewingVacancy(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Briefcase size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Designation</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{viewingVacancy.designationName}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Layers size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Department</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{viewingVacancy.departmentName}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <DollarSign size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Salary Range</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{viewingVacancy.salaryCriteria || '—'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Users size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Target Openings</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{viewingVacancy.numberOfPosts} Posts ({viewingVacancy.gender})</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Calendar size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Closure Date</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {viewingVacancy.completionDate ? new Date(viewingVacancy.completionDate).toLocaleDateString() : '—'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <MapPin size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Location</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{viewingVacancy.preferredLocation || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Priority</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getPriorityStyle(viewingVacancy.priority)}`}>
                    {viewingVacancy.priority}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Hiring Status</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusStyle(viewingVacancy.status)}`}>
                    {getStatusLabel(viewingVacancy.status)}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Approval</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${viewingVacancy.approvalStatus === 'Approved' ? 'bg-green-50 text-green-700 border-green-155' : viewingVacancy.approvalStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-155' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                    {viewingVacancy.approvalStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {viewingVacancy.approvalStatus === 'Rejected' && viewingVacancy.rejectionRemark && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1.5 flex items-center">
                      <AlertCircle size={14} className="mr-1.5" /> Rejection Reason
                    </h4>
                    <p className="text-sm text-red-700 font-medium">{viewingVacancy.rejectionRemark}</p>
                  </div>
                )}

                {viewingVacancy.preferredQualification && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5 flex items-center">
                      <Award size={14} className="mr-1.5" /> Preferred Qualification
                    </h4>
                    <p className="text-sm text-gray-700">{viewingVacancy.preferredQualification}</p>
                  </div>
                )}

                {viewingVacancy.jobDescription && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5 flex items-center">
                      <Info size={14} className="mr-1.5" /> Job Description
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingVacancy.jobDescription}</p>
                  </div>
                )}

                {viewingVacancy.remarks && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1.5">Remarks</h4>
                    <p className="text-sm text-gray-600">{viewingVacancy.remarks}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Published Active Channels</h4>
                <div className="grid grid-cols-2 gap-2">
                  {viewingVacancy.postingLinks && Object.keys(viewingVacancy.postingLinks).length > 0 ? (
                    Object.entries(viewingVacancy.postingLinks).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-700">{platform}</span>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center">
                          View Post <Link size={10} className="ml-1" />
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-xs text-gray-400 py-3 bg-gray-55 rounded-xl border border-dashed border-gray-200">
                      No active distribution links registered.
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50/50">
              <div>
                {viewingVacancy.approvalStatus === 'Approved' && (
                  <button
                    type="button"
                    onClick={() => handleCopyLink(viewingVacancy.vacancyNumber)}
                    className="px-4 py-2 border border-green-250 text-green-650 bg-white rounded-xl font-bold hover:bg-green-50 transition-colors flex items-center text-sm shadow-sm"
                  >
                    <Link size={14} className="mr-1.5" />
                    Copy Public Apply Link
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setViewingVacancy(null)}
                  className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all duration-150 text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingVacancy(null);
                    handleEditClick(viewingVacancy);
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-100 transition-all duration-150 text-sm flex items-center"
                >
                  <Edit2 size={14} className="mr-2" />
                  Edit Vacancy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VacancyPage;

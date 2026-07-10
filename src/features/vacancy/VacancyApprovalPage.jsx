import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Check, X, Briefcase, Calendar, MapPin, DollarSign, Users, Award, Layers, Info, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import { vacancyApi } from './vacancy.api';
import { departmentApi } from '../department/department.api';

const VacancyApprovalPage = () => {
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected'
  const [vacancyData, setVacancyData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reviewingVacancy, setReviewingVacancy] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionRemark, setRejectionRemark] = useState('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const [departments, setDepartments] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    fetchVacancyData(1);
  }, [searchTerm, activeTab]);

  const loadDepartments = async () => {
    try {
      setDepartments((await departmentApi.list()) || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
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
      // Backend returns camelCase; filter to the active approval tab client-side.
      const tabFiltered = (result.data || []).filter(
        (v) => v.approvalStatus === activeTab
      );
      setVacancyData(tabFiltered);
      setPagination(
        result.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
      );
    } catch (error) {
      console.error('Error fetching approval vacancies:', error);
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

  const handleApprove = async (vacancyNumber) => {
    try {
      setSubmitting(true);
      await vacancyApi.setApproval(vacancyNumber, { approvalStatus: 'Approved' });
      toast.success(`Vacancy ${vacancyNumber} has been approved successfully!`);
      setReviewingVacancy(null);
      fetchVacancyData(pagination.page);
    } catch (error) {
      console.error('Approval error:', error);
      toast.error(error.message || 'Failed to send approval request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (vacancyNumber) => {
    if (!rejectionRemark.trim()) {
      toast.error('Please enter a rejection remark');
      return;
    }

    try {
      setSubmitting(true);
      await vacancyApi.setApproval(vacancyNumber, {
        approvalStatus: 'Rejected',
        rejectionRemark: rejectionRemark.trim(),
      });
      toast.success(`Vacancy ${vacancyNumber} has been rejected.`);
      setReviewingVacancy(null);
      setShowRejectForm(false);
      setRejectionRemark('');
      fetchVacancyData(pagination.page);
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error(error.message || 'Failed to send rejection request');
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (vacancy) => {
    setReviewingVacancy(vacancy);
    setShowRejectForm(false);
    setRejectionRemark('');
  };

  const filteredData = vacancyData.filter((item) => {
    if (deptFilter && String(item.departmentId) !== String(deptFilter)) return false;
    return true;
  });

  return (
    <>
      {/* Review Details and Action Modal */}
      {reviewingVacancy && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-indigo-50/20">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Reviewing: {reviewingVacancy.vacancyNumber}
                </span>
                <h3 className="text-xl font-extrabold text-gray-900 mt-2">
                  {reviewingVacancy.vacancyName || reviewingVacancy.designationName}
                </h3>
              </div>
              <button
                onClick={() => setReviewingVacancy(null)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content (Scrollable & Read Only) */}
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Briefcase size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Designation</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{reviewingVacancy.designationName}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Layers size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Department</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{reviewingVacancy.departmentName}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <DollarSign size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Salary Range</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{reviewingVacancy.salaryCriteria || '—'}</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Users size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Target Openings</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{reviewingVacancy.numberOfPosts} Posts ({reviewingVacancy.gender})</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <Calendar size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Closure Date</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {reviewingVacancy.completionDate ? new Date(reviewingVacancy.completionDate).toLocaleDateString() : '—'}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-2 text-gray-400 mb-1">
                    <MapPin size={14} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Location</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{reviewingVacancy.preferredLocation || '—'}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 flex items-center space-x-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Priority</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                    {reviewingVacancy.priority}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-1">Approval Stage</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                    {reviewingVacancy.approvalStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {reviewingVacancy.preferredQualification && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center">
                      <Award size={14} className="mr-1.5" /> Preferred Qualification
                    </h4>
                    <p className="text-sm text-gray-700">{reviewingVacancy.preferredQualification}</p>
                  </div>
                )}

                {reviewingVacancy.jobDescription && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5 flex items-center">
                      <Info size={14} className="mr-1.5" /> Job Description
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reviewingVacancy.jobDescription}</p>
                  </div>
                )}

                {reviewingVacancy.remarks && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Remarks</h4>
                    <p className="text-sm text-gray-650">{reviewingVacancy.remarks}</p>
                  </div>
                )}

                {reviewingVacancy.approvalStatus === 'Rejected' && reviewingVacancy.rejectionRemark && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1.5 flex items-center">
                      Previous Rejection Reason
                    </h4>
                    <p className="text-sm text-red-700 font-medium">{reviewingVacancy.rejectionRemark}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Published Active Channels</h4>
                <div className="grid grid-cols-2 gap-2">
                  {reviewingVacancy.postingLinks && Object.keys(reviewingVacancy.postingLinks).length > 0 ? (
                    Object.entries(reviewingVacancy.postingLinks).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-700">{platform}</span>
                        <span className="text-[10px] text-indigo-600 font-semibold flex items-center">
                          View Post <Link size={10} className="ml-1" />
                        </span>
                      </a>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-xs text-gray-400 py-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No active distribution links registered.
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic inline Rejection Input form */}
              {showRejectForm && (
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3 animate-in slide-in-from-bottom duration-250">
                  <div>
                    <label className="block text-sm font-semibold text-red-800 mb-1">
                      Reason for Rejection *
                    </label>
                    <textarea
                      placeholder="Explain why this vacancy is rejected (e.g. Budget constraints, changes in headcounts)..."
                      value={rejectionRemark}
                      onChange={(e) => setRejectionRemark(e.target.value)}
                      className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-700"
                      rows={3}
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionRemark('');
                      }}
                      className="px-4 py-2 border border-gray-250 text-gray-700 font-medium rounded-lg text-xs bg-white hover:bg-gray-50 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(reviewingVacancy.vacancyNumber)}
                      className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg text-xs hover:bg-red-700 transition-colors flex items-center"
                      disabled={submitting || !rejectionRemark.trim()}
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Footer buttons (Only active if Status is Pending) */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              {reviewingVacancy.approvalStatus === 'Pending' && !showRejectForm ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="px-5 py-2.5 border border-red-200 text-red-600 bg-white rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center"
                    disabled={submitting}
                  >
                    <X size={16} className="mr-2" />
                    Reject Request
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove(reviewingVacancy.vacancyNumber)}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100 flex items-center"
                    disabled={submitting}
                  >
                    <Check size={16} className="mr-2" />
                    Approve Vacancy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setReviewingVacancy(null)}
                  className="px-5 py-2.5 border border-gray-250 rounded-xl text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
                  disabled={submitting}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page content */}
      <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">

        {/* Tab Selection Navigation */}
        <div className="flex border-b border-gray-250">
          {['Pending', 'Approved', 'Rejected'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setVacancyData([]);
                }}
                className={`py-2.5 px-6 font-semibold text-sm border-b-2 transition-all ${
                  isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab} Vacancies
              </button>
            );
          })}
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="relative sm:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search by vacancy code, name, or qualification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3.5 py-2.5 border border-gray-250 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
              />
            </div>

            <div>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="block w-full px-3.5 py-2.5 border border-gray-250 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Data */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-320px)]">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vacancy Code</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Vacancy Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Designation / Dept</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Openings</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Target Closing</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                  {activeTab === 'Rejected' && (
                    <th className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rejection Reason</th>
                  )}
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-20 border-l border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tableLoading ? (
                  <tr>
                    <td colSpan={activeTab === 'Rejected' ? '8' : '7'} className="px-6 py-16 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                        <span className="text-sm font-semibold">Loading data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'Rejected' ? '8' : '7'} className="px-6 py-16 text-center text-gray-400 text-sm">
                      No {activeTab.toLowerCase()} vacancies found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="group hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openReviewModal(item)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline text-left transition-colors"
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-gray-800 block">{item.numberOfPosts} Posts</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{item.gender}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                        {item.completionDate ? new Date(item.completionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                        {item.priority}
                      </td>
                      {activeTab === 'Rejected' && (
                        <td className="px-6 py-4 text-sm text-red-600 font-medium max-w-[200px] truncate" title={item.rejectionRemark}>
                          {item.rejectionRemark || '—'}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium sticky right-0 bg-white border-l border-gray-200">
                        <button
                          onClick={() => openReviewModal(item)}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all duration-150 shadow-sm shadow-blue-100"
                        >
                          {activeTab === 'Pending' ? 'Review & Decision' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-750 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative ml-3 inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-755 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Showing <span className="font-bold text-gray-800">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-bold text-gray-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-bold text-gray-800">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm border border-gray-200 bg-white" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center rounded-l-xl px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-50 transition-colors"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-bold border-r border-gray-100 last:border-0 transition-colors ${
                            pagination.page === pageNum ? 'z-10 bg-indigo-600 text-white' : 'text-gray-800 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center rounded-r-xl px-2 py-2 text-gray-400 hover:bg-gray-50 focus:z-20 disabled:opacity-50 transition-colors"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VacancyApprovalPage;

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Upload, Link as LinkIcon, Users, Briefcase, Plus, Eye, User, Phone, Mail, Calendar, MapPin, Heart, CreditCard, Building2, Wallet, FileText, UserCheck, MessageSquare, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { vacancyApi } from '../vacancy/vacancy.api';
import { jobApplicationApi } from './jobApplication.api';
import { uploadFile } from '../upload/upload.api';

const emptyForm = {
  candidateName: '',
  candidateDob: '',
  candidatePhone: '',
  candidateEmail: '',
  previousCompany: '',
  previousCompanyNoticePeriod: '',
  jobExperience: '',
  lastSalary: '',
  previousPosition: '',
  reasonForLeaving: '',
  maritalStatus: '',
  lastEmployerMobile: '',
  presentAddress: '',
  aadharNo: '',
  referenceBy: '',
  candidatePhoto: null,
  candidateResume: null,
  salarySlip: null,
  experienceLetter: null,
  relievingLetter: null,
};

const FILE_FIELDS = [
  ['candidatePhoto', 'Candidate Photo'],
  ['candidateResume', 'Candidate Resume'],
  ['salarySlip', 'Salary Slip'],
  ['experienceLetter', 'Experience Letter'],
  ['relievingLetter', 'Relieving Letter'],
];

const JobApplicationPage = () => {
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // "Add Candidate" (Internal) modal
  const [addingFor, setAddingFor] = useState(null); // the vacancy row
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // "View Applications" modal
  const [viewingFor, setViewingFor] = useState(null); // the vacancy row

  // "Candidate Details" modal
  const [viewingCandidate, setViewingCandidate] = useState(null); // the application row

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vacRes, appRes] = await Promise.all([
        vacancyApi.list({ page: 1, limit: 1000, search: '' }),
        jobApplicationApi.list({ page: 1, limit: 10000 }),
      ]);
      // Only approved vacancies accept applications.
      setVacancies((vacRes.data || []).filter((v) => v.approvalStatus === 'Approved'));
      setApplications(appRes.data || []);
    } catch (error) {
      console.error('Error loading job applications:', error);
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const appsByVacancy = applications.reduce((acc, app) => {
    (acc[app.vacancyNumber] ||= []).push(app);
    return acc;
  }, {});

  const filteredVacancies = vacancies.filter((v) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      v.vacancyNumber?.toLowerCase().includes(q) ||
      v.vacancyName?.toLowerCase().includes(q) ||
      v.designationName?.toLowerCase().includes(q)
    );
  });

  const copyLink = (vacancyNumber) => {
    const url = `${window.location.origin}/apply/${vacancyNumber}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success(`Public apply link for ${vacancyNumber} copied!`))
      .catch(() => toast.error('Failed to copy link'));
  };

  const openAdd = (vacancy) => {
    setFormData(emptyForm);
    setAddingFor(vacancy);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Upload any attached files first.
      const urls = {};
      for (const [field] of FILE_FIELDS) {
        if (formData[field]) urls[field] = await uploadFile(formData[field]);
      }

      const payload = {
        vacancyNumber: addingFor.vacancyNumber,
        source: 'Internal',
        candidateName: formData.candidateName,
        candidateDob: formData.candidateDob || null,
        candidatePhone: formData.candidatePhone,
        candidateEmail: formData.candidateEmail || null,
        previousCompany: formData.previousCompany || null,
        previousCompanyNoticePeriod: formData.previousCompanyNoticePeriod || null,
        jobExperience: formData.jobExperience || null,
        lastSalary: formData.lastSalary || null,
        previousPosition: formData.previousPosition || null,
        reasonForLeaving: formData.reasonForLeaving || null,
        maritalStatus: formData.maritalStatus || null,
        lastEmployerMobile: formData.lastEmployerMobile || null,
        presentAddress: formData.presentAddress || null,
        aadharNo: formData.aadharNo || null,
        referenceBy: formData.referenceBy || null,
        candidatePhoto: urls.candidatePhoto || null,
        candidateResume: urls.candidateResume || null,
        salarySlip: urls.salarySlip || null,
        experienceLetter: urls.experienceLetter || null,
        relievingLetter: urls.relievingLetter || null,
      };

      await jobApplicationApi.create(payload);
      toast.success('Candidate added successfully!');
      setAddingFor(null);
      loadData();
    } catch (error) {
      console.error('Add candidate error:', error);
      toast.error(error.message || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const sourceBadge = (source) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        source === 'External'
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
      }`}
    >
      {source}
    </span>
  );

  const stageBadge = (stage) => (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
      {stage || '—'}
    </span>
  );

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '—');

  const detailFields = [
    {
      title: 'Personal Information',
      icon: User,
      items: [
        { label: 'Date of Birth', icon: Calendar, value: (a) => formatDate(a.candidateDob) },
        { label: 'Phone', icon: Phone, value: (a) => a.candidatePhone || '—' },
        { label: 'Email', icon: Mail, value: (a) => a.candidateEmail || '—' },
        { label: 'Marital Status', icon: Heart, value: (a) => a.maritalStatus || '—' },
        { label: 'Aadhaar No.', icon: CreditCard, value: (a) => a.aadharNo || '—' },
        { label: 'Present Address', icon: MapPin, value: (a) => a.presentAddress || '—', wide: true },
      ],
    },
    {
      title: 'Professional Information',
      icon: Building2,
      items: [
        { label: 'Previous Company', icon: Building2, value: (a) => a.previousCompany || '—' },
        { label: 'Previous Position', icon: UserCheck, value: (a) => a.previousPosition || '—' },
        { label: 'Notice Period', icon: Clock, value: (a) => a.previousCompanyNoticePeriod || '—' },
        { label: 'Experience', icon: Briefcase, value: (a) => a.jobExperience || '—' },
        { label: 'Last Salary', icon: Wallet, value: (a) => a.lastSalary || '—' },
        { label: 'Last Employer Mobile', icon: Phone, value: (a) => a.lastEmployerMobile || '—' },
        { label: 'Reason for Leaving', icon: MessageSquare, value: (a) => a.reasonForLeaving || '—', wide: true },
        { label: 'Reference By', icon: Users, value: (a) => a.referenceBy || '—' },
      ],
    },
    {
      title: 'Recruitment Pipeline',
      icon: Clock,
      items: [
        { label: 'Stage', icon: Clock, value: (a) => a.stage || '—' },
        { label: 'Next Follow-up', icon: Calendar, value: (a) => formatDate(a.nextFollowUpDate) },
        { label: 'Interview Date', icon: Calendar, value: (a) => formatDate(a.interviewDate) },
        { label: 'Interview Mode', icon: UserCheck, value: (a) => a.interviewMode || '—' },
        { label: 'Interview Remark', icon: MessageSquare, value: (a) => a.interviewRemark || '—', wide: true },
      ],
    },
  ];

  const documentFields = [
    ['candidatePhoto', 'Photo'],
    ['candidateResume', 'Resume'],
    ['salarySlip', 'Salary Slip'],
    ['experienceLetter', 'Experience Letter'],
    ['relievingLetter', 'Relieving Letter'],
  ];

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">Job Applications</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Approved openings — share the public link (External) or add candidates manually (Internal)
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search approved vacancy by code, name or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-10 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Vacancies table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Vacancy Code</th>
                <th className="px-6 py-3 text-left">Designation / Dept</th>
                <th className="px-6 py-3 text-center">Openings</th>
                <th className="px-6 py-3 text-center">Applications</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVacancies.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400 text-sm">
                    No approved vacancies yet. Approve a vacancy first to start collecting applications.
                  </td>
                </tr>
              ) : (
                filteredVacancies.map((v) => {
                  const apps = appsByVacancy[v.vacancyNumber] || [];
                  return (
                    <tr key={v.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{v.vacancyNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-800">{v.designationName || '—'}</div>
                        <div className="text-xs text-gray-400 font-medium">{v.departmentName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-800 font-bold">{v.numberOfPosts}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-gray-800">
                          <Users size={14} className="text-gray-400" />
                          {apps.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => copyLink(v.vacancyNumber)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Copy public apply link"
                          >
                            <LinkIcon size={13} /> Link
                          </button>
                          <button
                            onClick={() => setViewingFor(v)}
                            className="px-2.5 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors"
                          >
                            View ({apps.length})
                          </button>
                          <button
                            onClick={() => openAdd(v)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            <Plus size={13} /> Add
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
      </div>

      {/* View Applications modal */}
      {viewingFor && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-gray-100 flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Applications</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Vacancy <span className="font-bold text-indigo-600">{viewingFor.vacancyNumber}</span> · {viewingFor.designationName}
                </p>
              </div>
              <button onClick={() => setViewingFor(null)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">App No.</th>
                      <th className="px-4 py-3 text-left">Source</th>
                      <th className="px-4 py-3 text-left">Candidate</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Exp.</th>
                      <th className="px-4 py-3 text-left">Resume</th>
                      <th className="px-4 py-3 text-left">Photo</th>
                      <th className="px-4 py-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {(appsByVacancy[viewingFor.vacancyNumber] || []).length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-4 py-12 text-center text-gray-400">No applications yet for this vacancy.</td>
                      </tr>
                    ) : (
                      (appsByVacancy[viewingFor.vacancyNumber] || []).map((a) => (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-medium text-gray-700">{a.applicationNumber}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{sourceBadge(a.source)}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900">
                            <button onClick={() => setViewingCandidate(a)} className="hover:text-indigo-600 hover:underline text-left">
                              {a.candidateName}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700">{a.candidatePhone}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700">{a.candidateEmail || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-700">{a.jobExperience || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {a.candidateResume ? <a href={a.candidateResume} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold">View</a> : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {a.candidatePhoto ? <a href={a.candidatePhoto} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-bold">View</a> : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={() => setViewingCandidate(a)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                              title="View candidate details"
                            >
                              <Eye size={13} /> View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setViewingFor(null)} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all duration-150">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Candidate Details modal */}
      {viewingCandidate && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50/50">
              <div>
                <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-200/60 px-2.5 py-1 rounded-full">
                  {viewingCandidate.applicationNumber}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-2">{viewingCandidate.candidateName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Applied for <span className="font-semibold text-indigo-600">{viewingCandidate.applyingForPost || viewingFor?.designationName}</span>
                  {' '}· {viewingCandidate.vacancyNumber} · Applied on {formatDate(viewingCandidate.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {sourceBadge(viewingCandidate.source)}
                {stageBadge(viewingCandidate.stage)}
                <button onClick={() => setViewingCandidate(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100/50 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {detailFields.map((section) => (
                <div key={section.title}>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center mb-3">
                    <section.icon size={14} className="mr-1.5" /> {section.title}
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {section.items.map((item) => (
                      <div key={item.label} className={`bg-gray-50 p-3 rounded-xl border border-gray-200 ${item.wide ? 'col-span-2 md:col-span-3' : ''}`}>
                        <div className="flex items-center space-x-2 text-gray-400 mb-1">
                          <item.icon size={14} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{item.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 break-words">{item.value(viewingCandidate)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center mb-3">
                  <FileText size={14} className="mr-1.5" /> Documents
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {documentFields.map(([field, label]) => (
                    <div key={field} className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white">
                      <span className="text-xs font-bold text-gray-700">{label}</span>
                      {viewingCandidate[field] ? (
                        <a href={viewingCandidate[field]} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 font-semibold hover:text-blue-800 hover:underline">
                          View
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-400">Not uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {viewingCandidate.remarks && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1.5">Remarks</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingCandidate.remarks}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50/50">
              <button onClick={() => setViewingCandidate(null)} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all duration-150 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Candidate (Internal) modal */}
      {addingFor && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Add Candidate (Internal)</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Vacancy <span className="font-bold text-indigo-600">{addingFor.vacancyNumber}</span> · {addingFor.designationName}
                </p>
              </div>
              <button onClick={() => setAddingFor(null)} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Candidate Name *</label>
                    <input type="text" name="candidateName" required value={formData.candidateName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                    <input type="date" name="candidateDob" value={formData.candidateDob} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                    <input type="tel" name="candidatePhone" required value={formData.candidatePhone} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter phone number" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" name="candidateEmail" value={formData.candidateEmail} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter email" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Previous Company</label>
                    <input type="text" name="previousCompany" value={formData.previousCompany} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notice Period</label>
                    <input type="text" name="previousCompanyNoticePeriod" value={formData.previousCompanyNoticePeriod} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 30 days" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Job Experience</label>
                    <input type="text" name="jobExperience" value={formData.jobExperience} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 2 years" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Salary</label>
                    <input type="text" name="lastSalary" value={formData.lastSalary} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Previous Position</label>
                    <input type="text" name="previousPosition" value={formData.previousPosition} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Marital Status</label>
                    <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Aadhaar No.</label>
                    <input type="text" name="aadharNo" value={formData.aadharNo} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12-digit Aadhaar" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Reference By</label>
                    <input type="text" name="referenceBy" value={formData.referenceBy} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Present Address</label>
                  <textarea name="presentAddress" rows={2} value={formData.presentAddress} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {FILE_FIELDS.map(([field, label]) => (
                    <div key={field}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                      <div className="relative border border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                        <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, field)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <Upload size={16} className="text-gray-400 mb-1" />
                        <span className="text-[11px] font-semibold text-gray-600 text-center truncate max-w-full px-1">{formData[field] ? formData[field].name : 'Choose file'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setAddingFor(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-all duration-150">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-100 transition-all duration-150">
                  {submitting ? 'Saving...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default JobApplicationPage;

import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';

const FindEnquiry = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [indentData, setIndentData] = useState([]);
  const [enquiryData, setEnquiryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadingSalarySlip, setUploadingSalarySlip] = useState(false);
  const [uploadingExperienceLetter, setUploadingExperienceLetter] = useState(false);
  const [uploadingRelievingLetter, setUploadingRelievingLetter] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [formData, setFormData] = useState({
    candidateName: '',
    candidateDOB: '',
    candidatePhone: '',
    candidateEmail: '',
    previousCompany: '',
    previousCompanyNoticePeriod: '',
    jobExperience: '',
    lastSalary: '',
    salarySlip: null,
    experienceLetter: null,
    relievingLetter: null,
    previousPosition: '',
    maritalStatus: '',
    candidatePhoto: null,
    candidateResume: null,
    presentAddress: '',
    aadharNo: '',
    status: 'NeedMore'
  });

  // Google Drive folder ID for file uploads
  const GOOGLE_DRIVE_FOLDER_ID = '12sCqWAuyGR3-Wsxt4qj_FMWR0lmNZIKa';

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchIndents(1);
    } else {
      fetchEnquiries(1);
    }
  }, [activeTab]);

  const fetchIndents = async (page = 1) => {
    setTableLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/indents?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      if (result.success) {
        // Fetch BOTH active and left data to calculate accurate counts and notes
        const [activeRes, leftRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/employees/active?limit=1000`),
          fetch(`${import.meta.env.VITE_API_URL}/employees/left?limit=1000`)
        ]);

        let activeData = [];
        let leftData = [];

        if (activeRes.ok) {
          const actResult = await activeRes.json();
          if (actResult.success) activeData = actResult.data;
        }
        if (leftRes.ok) {
          const lftResult = await leftRes.json();
          if (lftResult.success) leftData = lftResult.data;
        }

        const activeCountByIndent = {};
        activeData.forEach(joining => {
          const indentNumber = joining.indent_number;
          if (indentNumber) {
            activeCountByIndent[indentNumber] = (activeCountByIndent[indentNumber] || 0) + 1;
          }
        });

        const leavedByIndent = {};
        leftData.forEach(left => {
          const indentNumber = left.joining?.indent_number;
          if (indentNumber) {
            leavedByIndent[indentNumber] = (leavedByIndent[indentNumber] || 0) + 1;
          }
        });

        const processedIndents = result.data.map(item => ({
            ...item,
            indentNo: item.indent_number,
            prefer: item.priority,
            numberOfPost: item.number_of_posts,
            completionDate: item.completion_date,
            filledPositions: activeCountByIndent[item.indent_number] || 0,
            leavedCount: leavedByIndent[item.indent_number] || 0,
            staffNote: leavedByIndent[item.indent_number] > 0 
              ? `${leavedByIndent[item.indent_number]} staff associated with this indent has left` 
              : ''
          }));

        setIndentData(processedIndents);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: result.data.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching indents:', error);
      setError(error.message);
    } finally {
      setTableLoading(false);
    }
  };

  const fetchEnquiries = async (page = 1) => {
    setTableLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/enquiries?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      if (result.success) {
        // Fetch left staff to identify leaved candidates
        const leftRes = await fetch(`${import.meta.env.VITE_API_URL}/employees/left?limit=1000`);
        let leftCandidateEnquiryNos = new Set();
        if (leftRes.ok) {
          const lftResult = await leftRes.json();
          if (lftResult.success) {
            leftCandidateEnquiryNos = new Set(lftResult.data.map(l => l.candidate_enquiry_no));
          }
        }

        const processedEnquiryData = result.data.map(item => ({
          id: item.id,
          indentNo: item.indent_number,
          candidateEnquiryNo: item.candidate_enquiry_no,
          applyingForPost: item.applying_for_post,
          candidateName: item.candidate_name,
          candidateDOB: item.candidate_dob,
          candidatePhone: item.candidate_phone,
          candidateEmail: item.candidate_email,
          previousCompany: item.previous_company,
          previousCompanyNoticePeriod: item.previous_company_notice_period,
          jobExperience: item.job_experience,
          lastSalary: item.last_salary,
          salarySlip: item.salary_slip,
          experienceLetter: item.experience_letter,
          relievingLetter: item.relieving_letter,
          previousPosition: item.previous_position,
          reasonForLeaving: item.reason_for_leaving,
          maritalStatus: item.marital_status,
          lastEmployerMobile: item.last_employer_mobile,
          candidatePhoto: item.candidate_photo,
          candidateResume: item.candidate_resume,
          referenceBy: item.reference_by,
          presentAddress: item.present_address,
          aadharNo: item.aadhar_no,
          delay: item.delay,
          isLeaved: leftCandidateEnquiryNos.has(item.candidate_enquiry_no),
          socialSite: item.indent?.social_site,
          socialPlatforms: item.indent?.social_platforms,
          indentExperience: item.indent?.experience_details
        }));
        setEnquiryData(processedEnquiryData);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: result.data.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      setError(error.message);
    } finally {
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      if (activeTab === 'pending') {
        fetchIndents(newPage);
      } else {
        fetchEnquiries(newPage);
      }
    }
  };

  const handleEnquiryClick = (item) => {
    setSelectedItem(item);
    setFormData({
      candidateName: '',
      candidateDOB: '',
      candidatePhone: '',
      candidateEmail: '',
      previousCompany: '',
      previousCompanyNoticePeriod: '',
      jobExperience: '',
      lastSalary: '',
      salarySlip: null,
      experienceLetter: null,
      relievingLetter: null,
      previousPosition: '',
      reasonForLeaving: '',
      maritalStatus: '',
      lastEmployerMobile: '',
      candidatePhoto: null,
      candidateResume: null,
      referenceBy: '',
      presentAddress: '',
      aadharNo: '',
      status: 'NeedMore'
    });
    setShowModal(true);
  };

  const uploadFileToGoogleDrive = async (file) => {
    const reader = new FileReader();
    const base64Data = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const params = new URLSearchParams();
    params.append('action', 'uploadFile');
    params.append('base64Data', base64Data);
    params.append('fileName', file.name);
    params.append('mimeType', file.type);
    params.append('folderId', GOOGLE_DRIVE_FOLDER_ID);

    const response = await fetch(
      'https://script.google.com/macros/s/AKfycbzF-ERpUfrb0figpapH5q5-J1KRAnBHt-OaXYrN9Cw4wzwaacKhUPwGgtCIWfxw2Ruz9g/exec',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
      }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'File upload failed');
    return data.fileUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let photoUrl = '';
      let resumeUrl = '';
      let salarySlipUrl = '';
      let experienceLetterUrl = '';
      let relievingLetterUrl = '';

      // Upload photo if exists (Keeping GD logic as requested implicitly)
      if (formData.candidatePhoto) {
        setUploadingPhoto(true);
        photoUrl = await uploadFileToGoogleDrive(formData.candidatePhoto, 'photo');
        setUploadingPhoto(false);
      }

      // Upload resume if exists
      if (formData.candidateResume) {
        setUploadingResume(true);
        resumeUrl = await uploadFileToGoogleDrive(formData.candidateResume);
        setUploadingResume(false);
      }

      if (formData.salarySlip) {
        setUploadingSalarySlip(true);
        salarySlipUrl = await uploadFileToGoogleDrive(formData.salarySlip);
        setUploadingSalarySlip(false);
      }

      if (formData.experienceLetter) {
        setUploadingExperienceLetter(true);
        experienceLetterUrl = await uploadFileToGoogleDrive(formData.experienceLetter);
        setUploadingExperienceLetter(false);
      }

      if (formData.relievingLetter) {
        setUploadingRelievingLetter(true);
        relievingLetterUrl = await uploadFileToGoogleDrive(formData.relievingLetter);
        setUploadingRelievingLetter(false);
      }

      // Prepare backend data
      const enquiryPayload = {
        indent_number: selectedItem.indent_number || selectedItem.indentNo,
        applying_for_post: selectedItem.post,
        candidate_name: formData.candidateName,
        candidate_dob: formData.candidateDOB,
        candidate_phone: formData.candidatePhone,
        candidate_email: formData.candidateEmail,
        previous_company: formData.previousCompany,
        previous_company_notice_period: formData.previousCompanyNoticePeriod,
        job_experience: formData.jobExperience,
        last_salary: formData.lastSalary,
        salary_slip: salarySlipUrl,
        experience_letter: experienceLetterUrl,
        relieving_letter: relievingLetterUrl,
        previous_position: formData.previousPosition,
        reason_for_leaving: formData.reasonForLeaving,
        marital_status: formData.maritalStatus,
        last_employer_mobile: formData.lastEmployerMobile,
        candidate_photo: photoUrl,
        candidate_resume: resumeUrl,
        reference_by: formData.referenceBy,
        present_address: formData.presentAddress,
        aadhar_no: formData.aadharNo,
        status: formData.status
      };

      // Submit to backend
      const enquiryResponse = await fetch(`${import.meta.env.VITE_API_URL}/enquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryPayload),
      });

      const enquiryResult = await enquiryResponse.json();

      if (!enquiryResult.success) {
        throw new Error(enquiryResult.error || 'Enquiry submission failed');
      }

      // Only update INDENT if status is Complete
      if (formData.status === 'Complete') {
        const indentId = selectedItem.indent_number || selectedItem.indentNo;
        const indentUpdateResponse = await fetch(`${import.meta.env.VITE_API_URL}/indents/${indentId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'Complete' }),
        });

        const indentUpdateResult = await indentUpdateResponse.json();
        if (!indentUpdateResult.success) {
          console.error('Failed to update indent status:', indentUpdateResult.error);
          toast.error('Enquiry saved but failed to mark Indent as Complete');
        } else {
          toast.success('Enquiry submitted and Indent marked as Complete!');
        }
      } else {
        toast.success('Enquiry submitted successfully!');
      }

      setShowModal(false);
      if (activeTab === 'pending') {
        fetchIndents(pagination.page);
      } else {
        fetchEnquiries(pagination.page);
      }

    } catch (error) {
      console.error('Submission error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
      setUploadingPhoto(false);
      setUploadingResume(false);
      setUploadingSalarySlip(false);
      setUploadingExperienceLetter(false);
      setUploadingRelievingLetter(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'pending') {
        fetchIndents(1);
      } else {
        fetchEnquiries(1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const filteredPendingData = indentData;

  const filteredHistoryData = enquiryData;


  return (
    <div className="space-y-6">

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2  bg-white bg-opacity-10 focus:ring-indigo-500 text-gray-600  "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300 border-opacity-20">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('history')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'pending' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 ">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Site</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Platforms</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filled/Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading pending enquiries...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPendingData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No pending enquiries found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPendingData.map((item) => (
                      <tr key={item.indent_number || item.indentNo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleEnquiryClick(item)}
                            className="px-3 py-1 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 text-sm"
                          >
                            Enquiry
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.post}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.gender}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.prefer || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.social_site || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.social_platforms || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.experience_details || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.filledPositions}/{item.numberOfPost}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Site</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Social Platforms</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resume</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading enquiry history...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No enquiry history found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateEnquiryNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.applyingForPost}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {item.isLeaved ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Leaved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidatePhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateEmail}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.socialSite || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.socialPlatforms || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.jobExperience}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.delay || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidatePhoto ? (
                            <a
                              href={item.candidatePhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.candidateResume ? (
                            <a
                              href={item.candidateResume}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              View
                            </a>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                  <span className="font-medium">{pagination.total}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pagination.page === pageNum
                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
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

      {showModal && selectedItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Candidate Enquiry Form</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Indent No.</label>
                  <input
                    type="text"
                    value={selectedItem.indentNo}
                    disabled
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-white bg-opacity-5 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Applying For Post</label>
                  <input
                    type="text"
                    value={selectedItem.post}
                    disabled
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 bg-white bg-opacity-5 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate Name *</label>
                  <input
                    type="text"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate DOB</label>
                  <input
                    type="date"
                    name="candidateDOB"
                    value={formData.candidateDOB}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate Phone *</label>
                  <input
                    type="tel"
                    name="candidatePhone"
                    value={formData.candidatePhone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate Email</label>
                  <input
                    type="email"
                    name="candidateEmail"
                    value={formData.candidateEmail}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Previous Company</label>
                  <input
                    type="text"
                    name="previousCompany"
                    value={formData.previousCompany}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Previous Company Notice Period</label>
                  <input
                    type="text"
                    name="previousCompanyNoticePeriod"
                    value={formData.previousCompanyNoticePeriod}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Job Experience</label>
                  <input
                    type="text"
                    name="jobExperience"
                    value={formData.jobExperience}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Salary Drawn</label>
                  <input
                    type="number"
                    name="lastSalary"
                    value={formData.lastSalary}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Previous Position</label>
                  <input
                    type="text"
                    name="previousPosition"
                    value={formData.previousPosition}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Reason for Leaving</label>
                  <input
                    type="text"
                    name="reasonForLeaving"
                    value={formData.reasonForLeaving}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
                {/* <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Last Employer Mobile</label>
                  <input
                    type="tel"
                    name="lastEmployerMobile"
                    value={formData.lastEmployerMobile}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div> */}
                {/* <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Reference By</label>
                  <input
                    type="text"
                    name="referenceBy"
                    value={formData.referenceBy}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                  />
                </div> */}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Aadhar No.*</label>
                  <input
                    type="text"
                    name="aadharNo"
                    value={formData.aadharNo}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Present Address</label>
                <textarea
                  name="presentAddress"
                  value={formData.presentAddress}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500 placeholder-white placeholder-opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate Photo</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => handleFileChange(e, 'candidatePhoto')}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingPhoto ? 'Uploading...' : 'Upload File'}
                    </label>
                    {formData.candidatePhoto && !uploadingPhoto && (
                      <span className="text-sm text-gray-500 opacity-80">{formData.candidatePhoto.name}</span>
                    )}
                    {uploadingPhoto && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Uploading photo...</span>
                      </div>
                    )}
                  </div>
                  {/* <p className="text-xs text-gray-400 mt-1">Max 10MB. Supports: JPG, JPEG, PNG, PDF, DOC, DOCX</p> */}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Candidate Resume</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'candidateResume')}
                      className="hidden"
                      id="resume-upload"
                    />
                    <label
                      htmlFor="resume-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingResume ? 'Uploading...' : 'Upload File'}
                    </label>
                    {formData.candidateResume && !uploadingResume && (
                      <span className="text-sm text-gray-500 opacity-80">{formData.candidateResume.name}</span>
                    )}
                    {uploadingResume && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Uploading resume...</span>
                      </div>
                    )}
                  </div>
                  {/* <p className="text-xs text-gray-400 mt-1">Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG</p> */}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Salary Slip</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'salarySlip')}
                      className="hidden"
                      id="salary-slip-upload"
                    />
                    <label
                      htmlFor="salary-slip-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingSalarySlip ? 'Uploading...' : 'Upload File'}
                    </label>
                    {formData.salarySlip && !uploadingSalarySlip && (
                      <span className="text-sm text-gray-500 opacity-80">{formData.salarySlip.name}</span>
                    )}
                    {uploadingSalarySlip && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Uploading salary slip...</span>
                      </div>
                    )}
                  </div>
                  {/* <p className="text-xs text-gray-400 mt-1">Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG</p> */}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Experience Letter</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'experienceLetter')}
                      className="hidden"
                      id="experience-letter-upload"
                    />
                    <label
                      htmlFor="experience-letter-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingExperienceLetter ? 'Uploading...' : 'Upload File'}
                    </label>
                    {formData.experienceLetter && !uploadingExperienceLetter && (
                      <span className="text-sm text-gray-500 opacity-80">{formData.experienceLetter.name}</span>
                    )}
                    {uploadingExperienceLetter && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Uploading experience letter...</span>
                      </div>
                    )}
                  </div>
                  {/* <p className="text-xs text-gray-400 mt-1">Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG</p> */}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Relieving Letter</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(e, 'relievingLetter')}
                      className="hidden"
                      id="relieving-letter-upload"
                    />
                    <label
                      htmlFor="relieving-letter-upload"
                      className="flex items-center px-4 py-2 border border-gray-300 border-opacity-30 rounded-md cursor-pointer hover:bg-white hover:bg-opacity-10 text-gray-500"
                    >
                      <Upload size={16} className="mr-2" />
                      {uploadingRelievingLetter ? 'Uploading...' : 'Upload File'}
                    </label>
                    {formData.relievingLetter && !uploadingRelievingLetter && (
                      <span className="text-sm text-gray-500 opacity-80">{formData.relievingLetter.name}</span>
                    )}
                    {uploadingRelievingLetter && (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Uploading relieving letter...</span>
                      </div>
                    )}
                  </div>
                  {/* <p className="text-xs text-gray-400 mt-1">Max 10MB. Supports: PDF, DOC, DOCX, JPG, JPEG, PNG</p> */}
                </div>

              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 border-opacity-30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white bg-white bg-opacity-10 text-gray-500"
                    required
                  >
                    <option value="NeedMore">Need More </option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                  disabled={submitting || uploadingPhoto || uploadingResume || uploadingSalarySlip || uploadingExperienceLetter || uploadingRelievingLetter}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-indigo-700 text-white rounded-xl font-medium hover:bg-indigo-800 shadow-lg shadow-indigo-100 flex items-center justify-center"
                  disabled={submitting || uploadingPhoto || uploadingResume || uploadingSalarySlip || uploadingExperienceLetter || uploadingRelievingLetter}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindEnquiry;

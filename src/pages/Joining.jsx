import React, { useState, useEffect } from 'react';
import { Search, Eye, Plus, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Joining = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [departments, setDepartments] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [sites, setSites] = useState([]);
  const [bloodGroups, setBloodGroups] = useState([]);
  
  // Joining Form Modal States
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [readyCandidates, setReadyCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [joiningFormData, setJoiningFormData] = useState({
    fatherName: '',
    dateOfJoining: '',
    joiningPlace: '',
    designation: '',
    salary: '',
    addressAsPerAadhar: '',
    dobAsPerAadhar: '',
    gender: '',
    familyMobileNo: '',
    relationshipWithFamily: '',
    pastPfId: '',
    currentBankAc: '',
    ifscCode: '',
    branchName: '',
    esicNo: '',
    highestQualification: '',
    pfEligible: '',
    esicEligible: '',
    joiningCompanyName: '',
    emailToBeIssue: '',
    issueMobile: '',
    issueLaptop: '',
    modeOfAttendance: '',
    paymentMode: '',
    aadharFrontPhoto: null,
    aadharBackPhoto: null,
    bankPassbookPhoto: null,
    qualificationPhoto: null,
    salarySlip: null,
    resumeCopy: null,
    // Additional fields from your 39-list
    panCard: null,
    candidatePhoto: null,
    currentAddress: '',
    personalEmail: '',
    aadharCardNo: '',
    department_id: '',
    community_id: '',
    site_id: '',
    blood_group_id: '',
  });

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingData(1);
    } else {
      fetchHistoryData(1);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchDepartments();
    fetchCommunities();
    fetchSites();
    fetchBloodGroups();
  }, []);

  const fetchBloodGroups = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/blood-groups`);
      const result = await response.json();
      if (result.success) setBloodGroups(result.data);
    } catch (error) {
      console.error('Error fetching blood groups:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/departments`);
      const result = await response.json();
      if (result.success) setDepartments(result.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/communities`);
      const result = await response.json();
      if (result.success) setCommunities(result.data);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/master/sites`);
      const result = await response.json();
      if (result.success) setSites(result.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchPendingData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/followups?status=Joining&page=${page}&limit=${pagination.limit}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: result.data.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching joining status data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryData = async (page = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/joining?page=${page}&limit=${pagination.limit}`);
      const result = await response.json();
      if (result.success) {
        setHistoryData(result.data);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: result.data.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error fetching joining history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      if (activeTab === "pending") {
        fetchPendingData(newPage);
      } else {
        fetchHistoryData(newPage);
      }
    }
  };

  const fetchReadyCandidates = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/enquiries/ready-to-join`);
      const result = await response.json();
      if (result.success) {
        setReadyCandidates(result.data);
      }
    } catch (error) {
      console.error('Error fetching ready candidates:', error);
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const handleOpenJoiningForm = (candidateData) => {
    if (candidateData) {
      // Create a candidate object compatible with the form from the follow-up record
      const candidate = {
        candidate_enquiry_no: candidateData.candidate_enquiry_no,
        indent_number: candidateData.indent_number,
        candidate_name: candidateData.enquiry?.candidate_name,
        candidate_phone: candidateData.enquiry?.candidate_phone,
        candidate_email: candidateData.enquiry?.candidate_email,
        candidate_dob: candidateData.enquiry?.candidate_dob,
        applying_for_post: candidateData.enquiry?.applying_for_post,
        present_address: candidateData.enquiry?.present_address,
        aadhar_no: candidateData.enquiry?.aadhar_no,
      };
      
      setSelectedCandidate(candidate);
      setJoiningFormData(prev => ({
        ...prev,
        designation: candidate.applying_for_post || '',
        dobAsPerAadhar: formatDateForInput(candidate.candidate_dob),
      }));
    }
    setShowJoiningModal(true);
  };

  const handleCandidateSelect = (e) => {
    const enquiryNo = e.target.value;
    const candidate = readyCandidates.find(c => c.candidate_enquiry_no === enquiryNo);
    setSelectedCandidate(candidate);
    
    // Auto-populate some fields if candidate is selected
    if (candidate) {
      setJoiningFormData(prev => ({
        ...prev,
        designation: candidate.applying_for_post || '',
        dobAsPerAadhar: candidate.candidate_dob || '',
      }));
    }
  };

  const handleJoiningInputChange = (e) => {
    const { name, value } = e.target;
    setJoiningFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e, field) => {
    setJoiningFormData(prev => ({ ...prev, [field]: e.target.files[0] }));
  };

  const uploadFileToDrive = async (file, folderId = '12sCqWAuyGR3-Wsxt4qj_FMWR0lmNZIKa') => {
    try {
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
      params.append('folderId', folderId);

      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbzF-ERpUfrb0figpapH5q5-J1KRAnBHt-OaXYrN9Cw4wzwaacKhUPwGgtCIWfxw2Ruz9g/exec',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params,
        }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      return data.fileUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) {
      toast.error('Please select a candidate');
      return;
    }
    setSubmitting(true);
    
    try {
      const uploadPromises = {};
      const fileFields = ['aadharFrontPhoto', 'aadharBackPhoto', 'bankPassbookPhoto', 'qualificationPhoto', 'salarySlip', 'resumeCopy'];

      for (const field of fileFields) {
        if (joiningFormData[field]) {
          uploadPromises[field] = uploadFileToDrive(joiningFormData[field]);
        } else {
          uploadPromises[field] = Promise.resolve('');
        }
      }

      const uploadedUrls = await Promise.all(Object.values(uploadPromises));
      const fileUrls = {};
      Object.keys(uploadPromises).forEach((field, index) => { fileUrls[field] = uploadedUrls[index]; });

      const payload = {
        indent_number: selectedCandidate.indent_number,
        candidate_enquiry_no: selectedCandidate.candidate_enquiry_no,
        name_as_per_aadhar: selectedCandidate.candidate_name,
        father_name: joiningFormData.fatherName,
        date_of_joining: joiningFormData.dateOfJoining,
        joining_place: joiningFormData.joiningPlace,
        designation: joiningFormData.designation,
        salary: joiningFormData.salary,
        aadhar_frontside_photo: fileUrls.aadharFrontPhoto,
        pan_card: fileUrls.aadharBackPhoto,
        candidate_photo: '',
        current_address: selectedCandidate.present_address,
        address_as_per_aadhar_card: joiningFormData.addressAsPerAadhar,
        date_of_birth: joiningFormData.dobAsPerAadhar,
        gender: joiningFormData.gender,
        mobile_no: selectedCandidate.candidate_phone,
        family_mobile_no: joiningFormData.familyMobileNo,
        relationship_with_family_person: joiningFormData.relationshipWithFamily,
        past_pf_id: joiningFormData.pastPfId,
        current_bank_ac_no: joiningFormData.currentBankAc,
        ifsc_code: joiningFormData.ifscCode,
        branch_name: joiningFormData.branchName,
        photo_of_front_bank_passbook: fileUrls.bankPassbookPhoto,
        personal_email: selectedCandidate.candidate_email,
        esic_no: joiningFormData.esicNo,
        highest_qualification: joiningFormData.highestQualification,
        pf_eligible: joiningFormData.pfEligible,
        esic_eligible: joiningFormData.esicEligible,
        joining_company_name: joiningFormData.joiningCompanyName,
        email_id_to_be_issued: joiningFormData.emailToBeIssue,
        issue_mobile: joiningFormData.issueMobile,
        issue_laptop: joiningFormData.issueLaptop,
        aadhar_card_no: selectedCandidate.aadhar_no,
        mode_of_attendance: joiningFormData.modeOfAttendance,
        qualification_photo: fileUrls.qualificationPhoto,
        payment_mode: joiningFormData.paymentMode,
        salary_slip: fileUrls.salarySlip,
        resume_copy: fileUrls.resumeCopy,
        department_id: joiningFormData.department_id,
        community_id: joiningFormData.community_id,
        site_id: joiningFormData.site_id,
        blood_group_id: joiningFormData.blood_group_id,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/joining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      toast.success('Joining successfully recorded!');
      setShowJoiningModal(false);
      fetchPendingData(pagination.page);
      fetchHistoryData(pagination.page);
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDOB = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const filteredPendingData = data.filter(item => 
    item.enquiry?.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.candidate_enquiry_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.indent_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistoryData = historyData.filter(item =>
    item.name_as_per_aadhar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.candidate_enquiry_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employee_id?.toString().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">

      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, enquiry, or indent..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 opacity-60" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("pending")}
              className={`py-4 px-6 font-medium text-sm transition-colors duration-200 border-b-2 ${
                activeTab === "pending"
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50 bg-opacity-30"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending ({filteredPendingData.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`py-4 px-6 font-medium text-sm transition-colors duration-200 border-b-2 ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-700 bg-indigo-50 bg-opacity-30"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "pending" ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applying For Post</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : filteredPendingData.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-4 text-center">No pending joining status records found</td></tr>
                ) : (
                  filteredPendingData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleOpenJoiningForm(item)}
                          className="bg-indigo-700 text-white px-3 py-1 rounded hover:bg-indigo-800 transition-colors text-xs"
                        >
                          Joining
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.enquiry?.candidate_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.candidate_enquiry_no}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.enquiry?.applying_for_post}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.indent_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Ready to Join</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name (Aadhar)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joining Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="6" className="px-6 py-4 text-center">Loading...</td></tr>
                ) : filteredHistoryData.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-4 text-center">No joining history found</td></tr>
                ) : (
                  filteredHistoryData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => { setSelectedJoining(item); setShowDetailsModal(true); }}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View Details
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono font-bold">{item.employee_id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name_as_per_aadhar}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDOB(item.date_of_joining)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">Joined</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

      {/* Employee Joining Modal */}
      {showJoiningModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Employee Joining Form</h3>
              <button onClick={() => setShowJoiningModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleJoiningSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">

                  {selectedCandidate && (
                    <div className="space-y-6">
                      {/* Section 1: Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                          <input type="text" value={selectedCandidate.candidate_enquiry_no} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Indent No</label>
                          <input type="text" value={selectedCandidate.indent_number} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Name As Per Aadhar *</label>
                          <input type="text" value={selectedCandidate.candidate_name} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                          <input type="text" name="fatherName" value={joiningFormData.fatherName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Birth *</label>
                          <input type="date" name="dobAsPerAadhar" value={joiningFormData.dobAsPerAadhar} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                          <select name="gender" value={joiningFormData.gender} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                          <select name="blood_group_id" value={joiningFormData.blood_group_id} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select Blood Group</option>
                            {bloodGroups.map(bg => (
                              <option key={bg.blood_group_id} value={bg.blood_group_id}>{bg.blood_group_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Section 2: Contact Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No. *</label>
                          <input type="tel" value={selectedCandidate.candidate_phone} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Email *</label>
                          <input type="email" value={selectedCandidate.candidate_email} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Family Mobile Number *</label>
                          <input name="familyMobileNo" value={joiningFormData.familyMobileNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship With Family *</label>
                          <input name="relationshipWithFamily" value={joiningFormData.relationshipWithFamily} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                      </div>

                      {/* Section 3: Address Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Address *</label>
                          <textarea value={selectedCandidate.present_address} disabled rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Address as per Aadhar *</label>
                          <textarea name="addressAsPerAadhar" value={joiningFormData.addressAsPerAadhar} onChange={handleJoiningInputChange} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                      </div>

                      {/* Section 4: Employment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Joining *</label>
                          <input type="date" name="dateOfJoining" value={joiningFormData.dateOfJoining} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Joining Place</label>
                          <input type="text" name="joiningPlace" value={joiningFormData.joiningPlace} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                          <input type="text" name="designation" value={joiningFormData.designation} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                          <input type="number" name="salary" value={joiningFormData.salary} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Joining Company Name *</label>
                          <input name="joiningCompanyName" value={joiningFormData.joiningCompanyName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Attendance *</label>
                          <input name="modeOfAttendance" value={joiningFormData.modeOfAttendance} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                          <select name="department_id" value={joiningFormData.department_id} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Community *</label>
                          <select name="community_id" value={joiningFormData.community_id} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select Community</option>
                            {communities.map(comm => (
                              <option key={comm.community_id} value={comm.community_id}>{comm.community_name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                          <select name="site_id" value={joiningFormData.site_id} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select Site</option>
                            {sites.map(site => (
                              <option key={site.site_id} value={site.site_id}>{site.site_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Section 5: Bank & Financial Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number *</label>
                          <input type="text" value={selectedCandidate.aadhar_no || ''} disabled className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Current Account No*</label>
                          <input name="currentBankAc" value={joiningFormData.currentBankAc} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code*</label>
                          <input name="ifscCode" value={joiningFormData.ifscCode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name*</label>
                          <input name="branchName" value={joiningFormData.branchName} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                          <input name="paymentMode" value={joiningFormData.paymentMode} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                      </div>

                      {/* Section 6: Company Provisions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email ID to be Issued</label>
                          <select name="emailToBeIssue" value={joiningFormData.emailToBeIssue} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Issue</label>
                          <select name="issueMobile" value={joiningFormData.issueMobile} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Laptop Issue</label>
                          <select name="issueLaptop" value={joiningFormData.issueLaptop} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                      </div>

                      {/* Section 7: PF/ESIC Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Past PF No(if any)</label>
                          <input name="pastPfId" value={joiningFormData.pastPfId} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ESIC No (IF Any)</label>
                          <input name="esicNo" value={joiningFormData.esicNo} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">PF Eligible</label>
                          <select name="pfEligible" value={joiningFormData.pfEligible} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ESIC Eligible</label>
                          <select name="esicEligible" value={joiningFormData.esicEligible} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700">
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Highest Qualification</label>
                          <input name="highestQualification" value={joiningFormData.highestQualification} onChange={handleJoiningInputChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700" />
                        </div>
                      </div>

                      {/* Section 8: Document Uploads */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'aadharFrontPhoto')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">PAN Card</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'aadharBackPhoto')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bank Passbook Photo</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'bankPassbookPhoto')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Qualification Photo</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'qualificationPhoto')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Salary Slip</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'salarySlip')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Resume Copy</label>
                          <input type="file" onChange={(e) => handleFileChange(e, 'resumeCopy')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        </div>
                      </div>
                    </div>
                  )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button type="button" onClick={() => setShowJoiningModal(false)} className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200">Cancel</button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="px-8 py-2.5 bg-indigo-700 text-white rounded-xl font-medium hover:bg-indigo-800 disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  {submitting ? 'Saving...' : 'Submit Joining Form'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedJoining && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-white/20 flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Employee: {selectedJoining.name_as_per_aadhar}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><label className="text-xs text-gray-500">Employee ID</label><p className="font-medium">{selectedJoining.employee_id}</p></div>
                <div><label className="text-xs text-gray-500">Designation</label><p className="font-medium">{selectedJoining.designation}</p></div>
                <div><label className="text-xs text-gray-500">DOJ</label><p className="font-medium">{formatDOB(selectedJoining.date_of_joining)}</p></div>
                <div><label className="text-xs text-gray-500">Salary</label><p className="font-medium">{selectedJoining.salary}</p></div>
                <div><label className="text-xs text-gray-500">Blood Group</label><p className="font-medium">{selectedJoining.bloodGroup?.blood_group_name || '-'}</p></div>
                <div><label className="text-xs text-gray-500">Status</label><p className="font-medium text-green-600">Joined</p></div>
              </div>
              <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => setShowDetailsModal(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Joining;

import React, { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, X, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const CallTracker = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showJoiningModal, setShowJoiningModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [followUpData, setFollowUpData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

    const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    candidateSays: '',
    status: '',
    nextDate: ''
  });
  const [joiningFormData, setJoiningFormData] = useState({
    nameAsPerAadhar: '',
    fatherName: '',
    dateOfJoining: '',
    joiningPlace: '',
    designation: '',
    salary: '',
    aadharFrontPhoto: null,
    aadharBackPhoto: null,
    panCard: null,
    candidatePhoto: null,
    currentAddress: '',
    addressAsPerAadhar: '',
    dobAsPerAadhar: '',
    gender: '',
    mobileNo: '',
    familyMobileNo: '',
    relationshipWithFamily: '',
    pastPfId: '',
    currentBankAc: '',
    ifscCode: '',
    branchName: '',
    bankPassbookPhoto: null,
    personalEmail: '',
    esicNo: '',
    highestQualification: '',
    pfEligible: '',
    esicEligible: '',
    joiningCompanyName: '',
    emailToBeIssue: '',
    issueMobile: '',
    issueLaptop: '',
    aadharCardNo: '',
    modeOfAttendance: '',
    qualificationPhoto: null,
    paymentMode: '',
    salarySlip: null,
    resumeCopy: null,
    bloodGroup: '',
    department_id: '',
    community_id: '',
    education: ''
  });
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [enquiryData, setEnquiryData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [error, setError] = useState(null);
  const [latestFollowUp, setLatestFollowUp] = useState(null);
  const [fetchingLatest, setFetchingLatest] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchEnquiryData(1);
    } else {
      fetchFollowUpHistory(1);
    }
  }, [activeTab]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [deptRes, commRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/master/departments`),
          fetch(`${import.meta.env.VITE_API_URL}/master/communities`)
        ]);
        const deptData = await deptRes.json();
        const commData = await commRes.json();
        if (deptData.success) setDepartments(deptData.data);
        if (commData.success) setCommunities(commData.data);
      } catch (err) {
        console.error('Error fetching master data:', err);
      }
    };
    fetchMasterData();
  }, []);

  const fetchEnquiryData = async (page = 1) => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      // First, get ALL followups to filter pending status locally 
      // (This is a bit inefficient if many followups, but matches existing logic)
      // Optimization: In a real app, I'd move this filter to the backend.
      const fuResponse = await fetch(`${import.meta.env.VITE_API_URL}/followups?limit=10000`);
      const fuResult = await fuResponse.json();
      let finalEnquiryNos = [];
      if (fuResult.success) {
        finalEnquiryNos = fuResult.data
          .filter(f => f.status === 'Joining' || f.status === 'Reject')
          .map(f => f.candidate_enquiry_no);
        
        setFollowUpData(fuResult.data.map(item => ({
          enquiryNo: item.candidate_enquiry_no,
          status: item.status
        })));
      }

      // Fetch ENQUIRY data from backend with pagination
      // We pass planned=true as a filter if supported, or filter here.
      // Since I haven't added 'planned' filter to backend yet, I'll fetch and filter.
      // WAIT: To be efficient and follow 'attendance' pattern, I should filter in backend.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/enquiries?page=${page}&limit=${pagination.limit}`);
      const result = await response.json();
      
      if (result.success) {
        const allEnquiries = result.data.map(item => ({
          id: item.id,
          indentNo: item.indent_number,
          candidateEnquiryNo: item.candidate_enquiry_no,
          applyingForPost: item.applying_for_post,
          candidateName: item.candidate_name,
          candidateDOB: item.candidate_dob,
          candidatePhone: item.candidate_phone,
          candidateEmail: item.candidate_email,
          previousCompany: item.previous_company,
          jobExperience: item.job_experience,
          lastSalary: item.last_salary,
          previousPosition: item.previous_position,
          reasonForLeaving: item.reason_for_leaving,
          maritalStatus: item.marital_status,
          lastEmployerMobile: item.last_employer_mobile,
          candidatePhoto: item.candidate_photo,
          candidateResume: item.candidate_resume,
          referenceBy: item.reference_by,
          presentAddress: item.present_address,
          aadharNo: item.aadhar_no,
          status: item.status,
          planned: item.planned 
        }));

        // Filter: planned exists AND not in Joining/Reject
        const processedEnquiryData = allEnquiries.filter(item => 
          item.planned && !finalEnquiryNos.includes(item.candidateEnquiryNo)
        );
        
        setEnquiryData(processedEnquiryData);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: processedEnquiryData.length,
          totalPages: 1
        });
      } else {
        throw new Error(result.error || 'Failed to fetch enquiries');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message);
      toast.error('Failed to fetch enquiries');
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchFollowUpHistory = async (page = 1) => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/followups?page=${page}&limit=${pagination.limit}`);
      const result = await response.json();
      
      if (result.success) {
        const processedData = result.data.map(item => ({
          timestamp: formatDateTime(item.createdAt),
          enquiryNo: item.candidate_enquiry_no,
          status: item.status,
          candidateSays: item.candidate_says,
          nextDate: formatDOB(item.next_date) || '-'
        }));
        setHistoryData(processedData);
        setPagination(result.pagination || {
          page: 1,
          limit: 10,
          total: processedData.length,
          totalPages: 1
        });
      }
    } catch (error) {
      console.error('Error in fetchFollowUpHistory:', error);
      setError(error.message);
      toast.error(`Failed to load follow-ups: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      if (activeTab === 'pending') {
        fetchEnquiryData(newPage);
      } else {
        fetchFollowUpHistory(newPage);
      }
    }
  };

 const pendingData = enquiryData.filter(item => {
    const hasFinalStatus = followUpData.some(followUp => 
      followUp.enquiryNo === item.candidateEnquiryNo && 
      (followUp.status === 'Joining' || followUp.status === 'Reject')
    );
    return !hasFinalStatus;
  });

  const handleCallClick = async (item) => {
    setSelectedItem(item);
    setFormData({
      candidateSays: '',
      status: '',
      nextDate: ''
    });
    setLatestFollowUp(null);
    setShowModal(true);

    setFetchingLatest(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/followups/${item.candidateEnquiryNo}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        setLatestFollowUp(result.data[0]);
      }
    } catch (err) {
      console.error("Error fetching latest follow-up:", err);
    } finally {
      setFetchingLatest(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleJoiningInputChange = (e) => {
    const { name, value } = e.target;
    setJoiningFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      setJoiningFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  const postToJoiningSheet = async (rowData) => {
  const URL = 'https://script.google.com/macros/s/AKfycbzF-ERpUfrb0figpapH5q5-J1KRAnBHt-OaXYrN9Cw4wzwaacKhUPwGgtCIWfxw2Ruz9g/exec';

  try {
    console.log('Attempting to post:', {
      sheetName: 'JOINING',
      rowData: rowData
    });

    const params = new URLSearchParams();
    params.append('sheetName', 'JOINING');
    params.append('action', 'insert');
    params.append('rowData', JSON.stringify(rowData));

    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Server response:', data);

    if (!data.success) {
      throw new Error(data.error || 'Server returned unsuccessful response');
    }

    return data;
  } catch (error) {
    console.error('Full error details:', {
      error: error.message,
      stack: error.stack,
      rowData: rowData,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to update sheet: ${error.message}`);
  }
};


const postToSheet = async (rowData) => {
  const URL = 'https://script.google.com/macros/s/AKfycbzF-ERpUfrb0figpapH5q5-J1KRAnBHt-OaXYrN9Cw4wzwaacKhUPwGgtCIWfxw2Ruz9g/exec';

  try {
    console.log('Attempting to post:', {
      sheetName: 'Follow - Up',
      rowData: rowData
    });

    const params = new URLSearchParams();
    params.append('sheetName', 'Follow - Up');
    params.append('action', 'insert');
    params.append('rowData', JSON.stringify(rowData));

    const response = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Server response:', data);

    if (!data.success) {
      throw new Error(data.error || 'Server returned unsuccessful response');
    }

    return data;
  } catch (error) {
    console.error('Full error details:', {
      error: error.message,
      stack: error.stack,
      rowData: rowData,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to update sheet: ${error.message}`);
  }
};

// utils/dateFormatter.js
 const formatDateTime=(isoString)=>{
  const d = new Date(isoString);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

 const uploadFileToDrive = async (file, folderId = '12sCqWAuyGR3-Wsxt4qj_FMWR0lmNZIKa') => {
    try {
      // Convert file to base64
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
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'File upload failed');
      }

      return data.fileUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload file: ${error.message}`);
      throw error;
    }
  };

 const formatDOB = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }
    
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!formData.candidateSays || !formData.status) {
      toast.error('Please fill all required fields');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        candidate_enquiry_no: selectedItem.candidateEnquiryNo,
        indent_number: selectedItem.indentNo,
        status: formData.status,
        candidate_says: formData.candidateSays,
        next_date: formData.nextDate || null
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Submission failed');
      }

      toast.success('Update successful!');
      setShowModal(false);
      
      if (activeTab === 'pending') {
        fetchEnquiryData(pagination.page);
      } else {
        fetchFollowUpHistory(pagination.page);
      }
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(`Failed to update: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoiningSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Upload files and get URLs
      const uploadPromises = {};
      const fileFields = [
        'aadharFrontPhoto',
        'aadharBackPhoto',
        'bankPassbookPhoto',
        'qualificationPhoto',
        'salarySlip',
        'resumeCopy'
      ];

      for (const field of fileFields) {
        if (joiningFormData[field]) {
          uploadPromises[field] = uploadFileToDrive(joiningFormData[field]);
        } else {
          uploadPromises[field] = Promise.resolve('');
        }
      }

      // Wait for all uploads to complete
      const uploadedUrls = await Promise.all(
        Object.values(uploadPromises).map(promise => 
          promise.catch(error => {
            console.error('Upload failed:', error);
            return ''; // Return empty string if upload fails
          })
        )
      );

      // Map uploaded URLs to their respective fields
      const fileUrls = {};
      Object.keys(uploadPromises).forEach((field, index) => {
        fileUrls[field] = uploadedUrls[index];
      });

      // Prepare payload for backend
      const payload = {
        indent_number: selectedItem.indentNo,
        candidate_enquiry_no: selectedItem.candidateEnquiryNo,
        name_as_per_aadhar: joiningFormData.nameAsPerAadhar || selectedItem.candidateName,
        father_name: joiningFormData.father_name || joiningFormData.fatherName, // Handle both since frontend state might vary
        date_of_joining: joiningFormData.dateOfJoining,
        joining_place: joiningFormData.joiningPlace,
        designation: joiningFormData.designation,
        salary: joiningFormData.salary,
        aadhar_frontside_photo: fileUrls.aadharFrontPhoto,
        pan_card: fileUrls.aadharBackPhoto, // As per original mapping rowData[11]
        candidate_photo: joiningFormData.candidatePhoto || '',
        current_address: selectedItem.presentAddress,
        address_as_per_aadhar_card: joiningFormData.addressAsPerAadhar,
        date_of_birth: joiningFormData.dobAsPerAadhar,
        gender: joiningFormData.gender,
        mobile_no: selectedItem.candidatePhone,
        family_mobile_no: joiningFormData.familyMobileNo,
        relationship_with_family_person: joiningFormData.relationshipWithFamily,
        past_pf_id: joiningFormData.pastPfId,
        current_bank_ac_no: joiningFormData.currentBankAc,
        ifsc_code: joiningFormData.ifscCode,
        branch_name: joiningFormData.branchName,
        photo_of_front_bank_passbook: fileUrls.bankPassbookPhoto,
        personal_email: selectedItem.candidateEmail,
        esic_no: joiningFormData.esicNo,
        highest_qualification: joiningFormData.highestQualification,
        pf_eligible: joiningFormData.pfEligible,
        esic_eligible: joiningFormData.esicEligible,
        joining_company_name: joiningFormData.joiningCompanyName,
        email_id_to_be_issued: joiningFormData.emailToBeIssue,
        issue_mobile: joiningFormData.issueMobile,
        issue_laptop: joiningFormData.issueLaptop,
        aadhar_card_no: selectedItem.aadharNo,
        mode_of_attendance: joiningFormData.modeOfAttendance,
        qualification_photo: fileUrls.qualificationPhoto,
        payment_mode: joiningFormData.paymentMode,
        salary_slip: fileUrls.salarySlip,
        resume_copy: fileUrls.resumeCopy,
        blood_group: joiningFormData.bloodGroup,
        department_id: joiningFormData.department_id,
        community_id: joiningFormData.community_id
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/joining`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Joining form submission failed');
      }

      toast.success('Employee added successfully!');
      setShowJoiningModal(false);
      setSelectedItem(null);
      fetchEnquiryData();
    } catch (error) {
      console.error('Error submitting joining form:', error);
      toast.error(`Failed to submit joining form: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPendingData = pendingData.filter(item => {
    const matchesSearch = item.candidateName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.candidateEnquiryNo?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredHistoryData = historyData.filter(item => {
  const matchesSearch = item.enquiryNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     item.candidateSays?.toLowerCase().includes(searchTerm.toLowerCase());
  return matchesSearch;
});

  return (
    <div className="space-y-6">

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by candidate name or enquiry number..."
              className="w-full pl-10 pr-4 py-2 border border-gray-400 border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
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
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'pending'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === 'history'
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indent No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Enquiry No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applying For Post</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
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
                          <span className="text-gray-600 text-sm">Loading pending calls...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button 
                          onClick={fetchEnquiryData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredPendingData.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No pending calls found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPendingData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleCallClick(item)}
                            className="px-3 py-1 text-white bg-indigo-700 rounded-md hover:bg-opacity-90 text-sm"
                          >
                            Call
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.indentNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateEnquiryNo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.applyingForPost}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidatePhone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateEmail}</td>
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

         {activeTab === 'history' && (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enquiry No</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Says</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Date</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {tableLoading ? (
          <tr>
            <td colSpan="5" className="px-6 py-12 text-center">
              <div className="flex justify-center flex-col items-center">
                <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                <span className="text-gray-600 text-sm">Loading call history...</span>
              </div>
            </td>
          </tr>
        ) : filteredHistoryData.length === 0 ? (
          <tr>
            <td colSpan="5" className="px-6 py-12 text-center">
              <p className="text-gray-500">No call history found.</p>
            </td>
          </tr>
        ) : (
          filteredHistoryData.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.enquiryNo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  item.status === 'Joining' 
                    ? 'bg-green-100 text-green-800' 
                    : item.status === 'Reject'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.candidateSays}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.nextDate || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {item.timestamp || '-'}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
)}

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
    </div>

    {/* Call Modal */}
    {showModal && selectedItem && (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Call Tracker</h3>
            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Enquiry No.</label>
          <input
            type="text"
            value={selectedItem.candidateEnquiryNo}
            disabled
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700"
          />
        </div> 
        {fetchingLatest ? (
          <div className="flex items-center space-x-2 text-sm text-gray-500 py-2">
            <div className="w-4 h-4 border-2 border-indigo-500 border-dashed rounded-full animate-spin"></div>
            <span>Fetching latest history...</span>
          </div>
        ) : latestFollowUp && (
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Last Interaction</span>
              <span className="text-[10px] text-indigo-400">{new Date(latestFollowUp.createdAt).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 text-[11px] block">Last Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  latestFollowUp.status === 'Joining' ? 'bg-green-100 text-green-700' :
                  latestFollowUp.status === 'Reject' ? 'bg-red-100 text-red-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>{latestFollowUp.status}</span>
              </div>
              {latestFollowUp.next_date && (
                <div>
                  <span className="text-gray-500 text-[11px] block">Scheduled For</span>
                  <span className="text-gray-700 font-medium">{new Date(latestFollowUp.next_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            <div>
              <span className="text-gray-500 text-[11px] block font-bold">Last Note</span>
              <p className="text-gray-700 text-sm">{latestFollowUp.candidate_says}</p>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            required
          >
            <option value="">Select Status</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Interview">Interview</option>
            <option value="Negotiation">Negotiation</option>
            <option value="On Hold">On Hold</option>
            <option value="Joining">Joining</option>
            <option value="Reject">Reject</option>
          </select>
        </div>
        
        {/* Dynamic Label for Candidate Says Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.status === 'Negotiation' 
              ? "What's Customer Requirement *" 
              : formData.status === 'On Hold'
              ? "Reason For Holding the Candidate *"
              : formData.status === 'Joining'
              ? "When the candidate will join the company *"
              : formData.status === 'Reject'
              ? "Reason for Rejecting the Candidate *"
              : "What Did The Candidate Says *"}
          </label>
          <textarea
            name="candidateSays"
            value={formData.candidateSays}
            onChange={handleInputChange}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
            required
          />
        </div>
        
        {/* Dynamic Label for Next Date Field */}
        {formData.status && !['Joining', 'Reject'].includes(formData.status) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.status === 'Interview' 
                ? "Schedule Date *" 
                : formData.status === 'On Hold'
                ? "ReCalling Date *"
                : "Next Date *"}
            </label>
            <input
              type="date"
              name="nextDate"
              value={formData.nextDate}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
              required
            />
          </div>
        )}
        
            </div>
            <div className="flex justify-end space-x-2 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-6 py-2.5 text-white bg-indigo-700 rounded-xl font-medium hover:bg-indigo-800 shadow-lg shadow-indigo-100 flex items-center justify-center min-h-[42px] ${
                  submitting ? 'opacity-90 cursor-not-allowed' : ''
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
                ) : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {/* Joining Modal */}
      {showJoiningModal && selectedItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 modal-backdrop">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Employee Joining Form</h3>
              <button onClick={() => setShowJoiningModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleJoiningSubmit} className="flex flex-col overflow-hidden">
              <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
  {/* Section 1: Basic Information */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
      <input
        type="text"
        value={selectedItem.candidateEnquiryNo}
        disabled
        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Indent No</label>
      <input
        type="text"
        value={selectedItem.indentNo}
        disabled
        className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Name As Per Aadhar *</label>
      <input
        type="text"
         disabled
        value={selectedItem.candidateName}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
     
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
      <input
        type="text"
        name="fatherName"
        value={joiningFormData.fatherName}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Birth *</label>
      <input
        type="date"
     name="dobAsPerAadhar"
        value={joiningFormData.dobAsPerAadhar}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
      <select
        name="gender"
        value={joiningFormData.gender}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">Select Gender</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
        <option value="Other">Other</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
      <input
        type="text"
        name="bloodGroup"
        value={joiningFormData.bloodGroup}
        onChange={handleJoiningInputChange}
        placeholder="e.g. O+, A-"
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
      <select
        name="department_id"
        value={joiningFormData.department_id}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        required
      >
        <option value="">Select Department</option>
        {departments.map(dept => (
          <option key={dept.department_id} value={dept.department_id}>
            {dept.department_name}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Community *</label>
      <select
        name="community_id"
        value={joiningFormData.community_id}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        required
      >
        <option value="">Select Community</option>
        {communities.map(comm => (
          <option key={comm.community_id} value={comm.community_id}>
            {comm.community_name}
          </option>
        ))}
      </select>
    </div>
  </div>

  {/* Section 2: Contact Information */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No. *</label>
      <input
        type="tel"
        disabled
        value={selectedItem.candidatePhone}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
       
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Email *</label>
      <input
        type="email"
         disabled
        value={selectedItem.candidateEmail}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Family Mobile Number *</label>
      <input
        name="familyMobileNo"
        value={joiningFormData.familyMobileNo}
        onChange={handleJoiningInputChange}
      
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Relationship With Family *</label>
      <input
        name="relationshipWithFamily"
        value={joiningFormData.relationshipWithFamily}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
       
      />
    </div>
  </div>

  {/* Section 3: Address Information */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Current Address *</label>
      <textarea
         disabled
        value={selectedItem.presentAddress}
        onChange={handleJoiningInputChange}
        rows={3}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Address as per Aadhar *</label>
      <textarea
        name="addressAsPerAadhar"
        value={joiningFormData.addressAsPerAadhar}
        onChange={handleJoiningInputChange}
        rows={3}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
       
      />
    </div>
  </div>

  {/* Section 4: Employment Details */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Date Of Joining *</label>
      <input
        type="date"
        name="dateOfJoining"
        value={joiningFormData.dateOfJoining}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
       
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Joining Place</label>
      <input
        type="text"
        name="joiningPlace"
        value={joiningFormData.joiningPlace}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
      <input
        type="text"
        name="designation"
        value={joiningFormData.designation}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
      <input
        type="number"
        name="salary"
        value={joiningFormData.salary}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Joining Company Name *</label>
      <input
        name="joiningCompanyName"
        value={joiningFormData.joiningCompanyName}
        onChange={handleJoiningInputChange}
        
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Mode of Attendance *</label>
      <input
        name="modeOfAttendance"
        value={joiningFormData.modeOfAttendance}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
     
      />
    </div>
  </div>

  {/* Section 5: Bank & Financial Details */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Number *</label>
      <input
       
     disabled
        value={selectedItem.aadharNo}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Current Account No*</label>
      <input
        
        name="currentBankAc"
        value={joiningFormData.currentBankAc}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code*</label>
      <input
        
        name="ifscCode"
        value={joiningFormData.ifscCode}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name*</label>
      <input
       
        name="branchName"
        value={joiningFormData.branchName}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
      <select
        name="paymentMode"
        value={joiningFormData.paymentMode}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
        required
      >
        <option value="">Select Payment Mode</option>
        <option value="Online">Online</option>
        <option value="Bank">Bank</option>
        <option value="Cash">Cash</option>
        <option value="Cheque">Cheque</option>
      </select>
    </div>
  </div>

  {/* Section 6: Company Provisions */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Email ID to be Issue</label>
      <select
        name="emailToBeIssue"
        value={joiningFormData.emailToBeIssue}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Issue</label>
      <select
        name="issueMobile"
        value={joiningFormData.issueMobile}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Laptop Issue</label>
      <select
        name="issueLaptop"
        value={joiningFormData.issueLaptop}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
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
      <input
        name="pastPfId"
        value={joiningFormData.pastPfId}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">ESIC No (IF Any)</label>
      <input
        name="esicNo"
        value={joiningFormData.esicNo}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">PF Eligible</label>
      <select
        name="pfEligible"
        value={joiningFormData.pfEligible}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">ESIC Eligible</label>
      <select
        name="esicEligible"
        value={joiningFormData.esicEligible}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      >
        <option value="">Select</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Education / Highest Qualification</label>
      <input
        name="highestQualification"
        value={joiningFormData.highestQualification}
        onChange={handleJoiningInputChange}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
      />
    </div>
  </div>

  {/* Section 8: Document Uploads */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar Card</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'aadharFrontPhoto')}
          className="hidden"
          id="aadhar-front-upload"
        />
        <label
          htmlFor="aadhar-front-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Photo
        </label>
        {joiningFormData.aadharFrontPhoto && (
          <span className="text-sm text-gray-700">{joiningFormData.aadharFrontPhoto.name}</span>
        )}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Pan Card</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'aadharBackPhoto')}
          className="hidden"
          id="aadhar-back-upload"
        />
        <label
          htmlFor="aadhar-back-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Photo
        </label>
        {joiningFormData.aadharBackPhoto && (
          <span className="text-sm text-gray-700">{joiningFormData.aadharBackPhoto.name}</span>
        )}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Photo Of Front Bank Passbook</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'bankPassbookPhoto')}
          className="hidden"
          id="bank-passbook-upload"
        />
        <label
          htmlFor="bank-passbook-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Photo
        </label>
        {joiningFormData.bankPassbookPhoto && (
          <span className="text-sm text-gray-700">{joiningFormData.bankPassbookPhoto.name}</span>
        )}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Qualification Photo</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e, 'qualificationPhoto')}
          className="hidden"
          id="qualification-photo-upload"
        />
        <label
          htmlFor="qualification-photo-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Photo
        </label>
        {joiningFormData.qualificationPhoto && (
          <span className="text-sm text-gray-700">{joiningFormData.qualificationPhoto.name}</span>
        )}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Salary Slip</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleFileChange(e, 'salarySlip')}
          className="hidden"
          id="salary-slip-upload"
        />
        <label
          htmlFor="salary-slip-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Document
        </label>
        {joiningFormData.salarySlip && (
          <span className="text-sm text-gray-700">{joiningFormData.salarySlip.name}</span>
        )}
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Upload Resume</label>
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleFileChange(e, 'resumeCopy')}
          className="hidden"
          id="resume-upload"
        />
        <label
          htmlFor="resume-upload"
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-gray-700"
        >
          <Upload size={16} className="mr-2" />
          Upload Resume
        </label>
        {joiningFormData.resumeCopy && (
          <span className="text-sm text-gray-700">{joiningFormData.resumeCopy.name}</span>
        )}
      </div>
    </div>
  </div>

  {/* Form Actions */}
              </div>
              <div className="flex justify-end space-x-2 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowJoiningModal(false)}
                  className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-8 py-2.5 text-white bg-indigo-700 rounded-xl font-medium hover:bg-indigo-800 shadow-lg shadow-indigo-100 flex items-center justify-center min-h-[42px] ${
                    submitting ? 'opacity-90 cursor-not-allowed' : ''
                  }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

export default CallTracker;
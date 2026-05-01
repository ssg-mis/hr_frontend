import React, { useState, useEffect } from 'react';
import { Filter, Search, Clock, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';  

const AfterJoiningWork = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pendingData, setPendingData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedJoining, setSelectedJoining] = useState(null);

  const [formData, setFormData] = useState({
    checkSalarySlipResume: false,
    offerLetterReceived: false,
    welcomeMeeting: false,
    biometricAccess: false,
    officialEmailId: false,
    assignAssets: false,
    pfEsic: false,
    companyDirectory: false,
    assets: [],
  });

  const fetchJoiningData = async (page = 1) => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const isCompleted = activeTab === "history" ? 'true' : 'false';
      const response = await fetch(`${import.meta.env.VITE_API_URL}/after-joining?completed=${isCompleted}&page=${page}&limit=${pagination.limit}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      if (activeTab === "pending") {
        setPendingData(result.data);
      } else {
        setHistoryData(result.data);
      }
      setPagination(result.pagination || {
        page: 1,
        limit: 10,
        total: result.data.length,
        totalPages: 1
      });
    } catch (error) {
      console.error("Error fetching after joining data:", error);
      setError(error.message);
      toast.error(`Failed to load after joining data: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchJoiningData(newPage);
    }
  };

  useEffect(() => {
    fetchJoiningData(1);
  }, [activeTab]);

  const handleAfterJoiningClick = (item) => {
    setSelectedItem(item);
    setFormData({
      checkSalarySlipResume: item.check_salary_slip_resume || false,
      offerLetterReceived: item.offer_letter_received || false,
      welcomeMeeting: item.welcome_meeting || false,
      biometricAccess: item.biometric_access || false,
      officialEmailId: item.official_email_id || false,
      assignAssets: item.assign_assets || false,
      pfEsic: item.pf_esic || false,
      companyDirectory: item.company_directory || false,
    });
    setShowModal(true);
  };

  const handleCheckboxChange = (name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitting(true);

    try {
      const payload = {
        check_salary_slip_resume: formData.checkSalarySlipResume,
        offer_letter_received: formData.offerLetterReceived,
        welcome_meeting: formData.welcomeMeeting,
        biometric_access: formData.biometricAccess,
        official_email_id: formData.officialEmailId,
        assign_assets: formData.assignAssets,
        pf_esic: formData.pfEsic,
        company_directory: formData.companyDirectory,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/after-joining/${selectedItem.id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      toast.success("Progress updated successfully!");
      setShowModal(false);
      fetchJoiningData(pagination.page);
    } catch (error) {
      console.error("Update error:", error);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const formatDOB = (dateString) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear().toString().slice(-2);

    return `${day}/${month}/${year}`;
  };

  const filteredPendingData = pendingData.filter((item) => {
    const matchesSearch =
      (item.joining?.name_as_per_aadhar?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.joining?.employee_id?.toString() || "").includes(searchTerm.toLowerCase()) ||
      (item.joining?.mobile_no || "").includes(searchTerm) ||
      (item.joining?.personal_email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredHistoryData = historyData.filter((item) => {
    const matchesSearch =
      (item.joining?.name_as_per_aadhar?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (item.joining?.employee_id?.toString() || "").includes(searchTerm.toLowerCase()) ||
      (item.joining?.mobile_no || "").includes(searchTerm) ||
      (item.joining?.personal_email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">

      <div className="bg-white  p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300   rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white   text-gray-500    "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={20}
              className="absolute left-3 top-1/2 transform -translate-y-1/2  text-gray-500  "
            />
          </div>
        </div>
      </div>

      <div className="bg-white  rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300  ">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} className="inline mr-2" />
              Pending ({filteredPendingData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${
                activeTab === "history"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("history")}
            >
              <CheckCircle size={16} className="inline mr-2" />
              History ({filteredHistoryData.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Father Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Of Joining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Personal Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joining Place
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading pending calls...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchJoiningData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredPendingData.length > 0 ? (
                    filteredPendingData.map((item, index) => (
                      <tr key={index} className="hover:bg-white">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleAfterJoiningClick(item)}
                            className="px-3 py-1 bg-indigo-700 text-white rounded-md text-sm"
                          >
                            Process
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.employee_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.name_as_per_aadhar}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.father_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDOB(item.joining?.date_of_joining)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.mobile_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.personal_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.joining_place}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.salary}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                          No pending after joining work found.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y   divide-white  ">
                <thead className="bg-gray-100  ">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Date Of Joining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Mobile No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium  text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y   divide-white  ">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="6" className="px-12 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">
                            Loading call history...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredHistoryData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-12 py-12 text-center">
                        <p className="text-gray-500">No call history found.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryData.map((item, index) => (
                      <tr key={index} className="hover:bg-white hover: ">
                        <td className="px-6 py-4 whitespace-nowrap text-sm  text-gray-500">
                          {item.joining?.employee_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm  text-gray-500">
                          {item.joining?.name_as_per_aadhar}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm  text-gray-500">
                          {item.joining?.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDOB(item.joining?.date_of_joining)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.joining?.mobile_no}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm  text-gray-500">
                          <span className="px-2 py-1 text-xs rounded-full bg-green-500 font-semibold  text-white">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredHistoryData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className=" text-gray-500  ">
                    No after joining work history found.
                  </p>
                </div>
              )}
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
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4 ">
          <div className="bg-white  rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b  ">
              <h3 className="text-lg font-medium  text-gray-500">
                After Joining Work Checklist
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedJoining(selectedItem.joining);
                    setShowDetailsModal(true);
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm hover:bg-gray-200 flex items-center"
                >
                  <Search size={14} className="mr-1" />
                  View Full Joining Info
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className=" text-gray-500  "
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Employee Basic Info Summary */}
              <div className="bg-indigo-50 p-4 rounded-lg flex flex-wrap gap-y-2 mb-4">
                <div className="w-1/2 md:w-1/3">
                  <p className="text-xs text-indigo-600 uppercase font-bold">Mobile</p>
                  <p className="text-sm font-medium text-gray-800">{selectedItem.joining?.mobile_no || 'N/A'}</p>
                </div>
                <div className="w-1/2 md:w-1/3">
                  <p className="text-xs text-indigo-600 uppercase font-bold">Email</p>
                  <p className="text-sm font-medium text-gray-800 truncate pr-2">{selectedItem.joining?.personal_email || 'N/A'}</p>
                </div>
                <div className="w-1/2 md:w-1/3">
                  <p className="text-xs text-indigo-600 uppercase font-bold">Joining Place</p>
                  <p className="text-sm font-medium text-gray-800">{selectedItem.joining?.joining_place || 'N/A'}</p>
                </div>
                <div className="w-full mt-2 border-t border-indigo-100 pt-2 flex flex-wrap gap-2">
                  <p className="text-xs text-indigo-600 uppercase font-bold w-full mb-1">Documents to Verify</p>
                  {selectedItem.joining?.aadhar_frontside_photo && (
                    <a href={selectedItem.joining.aadhar_frontside_photo} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 flex items-center">
                      Aadhar
                    </a>
                  )}
                  {selectedItem.joining?.pan_card && (
                    <a href={selectedItem.joining.pan_card} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 flex items-center">
                      PAN Card
                    </a>
                  )}
                  {selectedItem.joining?.salary_slip && (
                    <a href={selectedItem.joining.salary_slip} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50 flex items-center">
                      Salary Slip
                    </a>
                  )}
                  {selectedItem.joining?.resume_copy && (
                    <a href={selectedItem.joining.resume_copy} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-50 flex items-center">
                      Resume
                    </a>
                  )}
                  {selectedItem.joining?.photo_of_front_bank_passbook && (
                    <a href={selectedItem.joining.photo_of_front_bank_passbook} target="_blank" rel="noopener noreferrer" className="text-xs bg-white text-indigo-700 px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 flex items-center">
                      Passbook
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium  text-gray-500 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={selectedItem.joining?.employee_id}
                    disabled
                    className="w-full border border-gray-300   rounded-md px-3 py-2 bg-white    text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium  text-gray-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={selectedItem.joining?.name_as_per_aadhar}
                    disabled
                    className="w-full border border-gray-300   rounded-md px-3 py-2 bg-white    text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-md font-medium  text-gray-500">
                  Checklist Items
                </h4>

                {[
                  {
                    key: "checkSalarySlipResume",
                    label: "Check Salary Slip & Resume Copy",
                  },
                  {
                    key: "offerLetterReceived",
                    label: "Offer Letter Received",
                  },
                  { key: "welcomeMeeting", label: "Welcome Meeting" },
                  { key: "biometricAccess", label: "Biometric Access" },
                  { key: "officialEmailId", label: "Official Email ID" },
                  { key: "assignAssets", label: "Assign Assets" },
                  { key: "pfEsic", label: "PF / ESIC" },
                  { key: "companyDirectory", label: "Company Directory" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      id={item.key}
                      checked={formData[item.key]}
                      onChange={() => handleCheckboxChange(item.key)}
                      className="h-4 w-4  text-gray-500  focus:ring-blue-500 border-gray-300   rounded bg-white"
                    />
                    <label
                      htmlFor={item.key}
                      className="ml-2 text-sm  text-gray-500"
                    >
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300   rounded-md  text-gray-500 hover:bg-white  "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white bg-indigo-700 rounded-md hover:bg-indigo-800 min-h-[42px] flex items-center justify-center ${
                    submitting ? "opacity-90 cursor-not-allowed" : ""
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
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Joining Details Modal */}
      {showDetailsModal && selectedJoining && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-[60] p-4 ">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold text-gray-800">
                Full Joining Information: {selectedJoining.name_as_per_aadhar}
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-8">
              {/* Section 1: Basic & Contact */}
              <div>
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-1">
                  Basic & Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="text-xs text-gray-500">Employee ID</label><p className="font-medium">{selectedJoining.employee_id}</p></div>
                  <div><label className="text-xs text-gray-500">Aadhar Name</label><p className="font-medium">{selectedJoining.name_as_per_aadhar}</p></div>
                  <div><label className="text-xs text-gray-500">Father Name</label><p className="font-medium">{selectedJoining.father_name}</p></div>
                  <div><label className="text-xs text-gray-500">Designation</label><p className="font-medium">{selectedJoining.designation}</p></div>
                  <div><label className="text-xs text-gray-500">Date of Joining</label><p className="font-medium">{formatDOB(selectedJoining.date_of_joining)}</p></div>
                  <div><label className="text-xs text-gray-500">Salary</label><p className="font-medium text-green-600 font-bold">{selectedJoining.salary}</p></div>
                  <div><label className="text-xs text-gray-500">Mobile No</label><p className="font-medium">{selectedJoining.mobile_no}</p></div>
                  <div><label className="text-xs text-gray-500">Personal Email</label><p className="font-medium">{selectedJoining.personal_email}</p></div>
                  <div><label className="text-xs text-gray-500">Date of Birth</label><p className="font-medium">{formatDOB(selectedJoining.date_of_birth)}</p></div>
                  <div><label className="text-xs text-gray-500">Gender</label><p className="font-medium">{selectedJoining.gender}</p></div>
                  <div><label className="text-xs text-gray-500">Aadhar Card No</label><p className="font-medium">{selectedJoining.aadhar_card_no}</p></div>
                  <div><label className="text-xs text-gray-500">PAN Card No</label><p className="font-medium">{selectedJoining.pan_card_no || 'N/A'}</p></div>
                </div>
              </div>

              {/* Section 2: Address & Family */}
              <div>
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-1">
                  Address & Family Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><label className="text-xs text-gray-500">Current Address</label><p className="text-sm">{selectedJoining.current_address}</p></div>
                  <div><label className="text-xs text-gray-500">Address as per Aadhar</label><p className="text-sm">{selectedJoining.address_as_per_aadhar_card}</p></div>
                  <div><label className="text-xs text-gray-500">Family Mobile</label><p className="font-medium">{selectedJoining.family_mobile_no}</p></div>
                  <div><label className="text-xs text-gray-500">Relation</label><p className="font-medium">{selectedJoining.relationship_with_family_person}</p></div>
                </div>
              </div>

              {/* Section 3: Professional & Financial */}
              <div>
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-1">
                  Professional & Financial Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="text-xs text-gray-500">Bank Account No</label><p className="font-medium font-mono">{selectedJoining.current_bank_ac_no}</p></div>
                  <div><label className="text-xs text-gray-500">IFSC Code</label><p className="font-medium">{selectedJoining.ifsc_code}</p></div>
                  <div><label className="text-xs text-gray-500">Branch Name</label><p className="font-medium">{selectedJoining.branch_name}</p></div>
                  <div><label className="text-xs text-gray-500">Joining Company</label><p className="font-medium">{selectedJoining.joining_company_name}</p></div>
                  <div><label className="text-xs text-gray-500">Joining Place</label><p className="font-medium">{selectedJoining.joining_place}</p></div>
                  <div><label className="text-xs text-gray-500">Mode of Attendance</label><p className="font-medium">{selectedJoining.mode_of_attendance}</p></div>
                  <div><label className="text-xs text-gray-500">Payment Mode</label><p className="font-medium">{selectedJoining.payment_mode}</p></div>
                  <div><label className="text-xs text-gray-500">Highest Qualification</label><p className="font-medium">{selectedJoining.highest_qualification}</p></div>
                  <div><label className="text-xs text-gray-500">Past PF ID</label><p className="font-medium">{selectedJoining.past_pf_id || 'N/A'}</p></div>
                  <div><label className="text-xs text-gray-500">ESIC No</label><p className="font-medium">{selectedJoining.esic_no || 'N/A'}</p></div>
                  <div><label className="text-xs text-gray-500">PF Eligible</label><p className="font-medium">{selectedJoining.pf_eligible}</p></div>
                  <div><label className="text-xs text-gray-500">ESIC Eligible</label><p className="font-medium">{selectedJoining.esic_eligible}</p></div>
                </div>
              </div>

              {/* Section 4: Provisions */}
              <div>
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-1">
                  Company Provisions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div><label className="text-xs text-gray-500">Email ID to be Issued</label><p className="font-medium">{selectedJoining.email_id_to_be_issued}</p></div>
                  <div><label className="text-xs text-gray-500">Issue Mobile</label><p className="font-medium">{selectedJoining.issue_mobile}</p></div>
                  <div><label className="text-xs text-gray-500">Issue Laptop</label><p className="font-medium">{selectedJoining.issue_laptop}</p></div>
                </div>
              </div>

              {/* Section 5: Documents */}
              <div>
                <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-4 border-b border-indigo-100 pb-1">
                  Uploaded Documents
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedJoining.aadhar_frontside_photo && (
                    <a href={selectedJoining.aadhar_frontside_photo} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">Aadhar Card</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                  {selectedJoining.pan_card && (
                    <a href={selectedJoining.pan_card} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">PAN Card</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                   {selectedJoining.photo_of_front_bank_passbook && (
                    <a href={selectedJoining.photo_of_front_bank_passbook} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">Bank Passbook</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                   {selectedJoining.qualification_photo && (
                    <a href={selectedJoining.qualification_photo} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">Qualification</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                  {selectedJoining.salary_slip && (
                    <a href={selectedJoining.salary_slip} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">Salary Slip</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                  {selectedJoining.resume_copy && (
                    <a href={selectedJoining.resume_copy} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-medium text-gray-600 mb-1">Resume Copy</span>
                      <span className="text-xs text-indigo-600">View File</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AfterJoiningWork;
import React, { useEffect, useState } from 'react';
import { Filter, Search, Clock, CheckCircle, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import useDataStore from '../store/dataStore';

const Employee = () => {
  //  const { employeeData, leavingData } = useDataStore();
  const [activeTab, setActiveTab] = useState('joining');
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningData, setJoiningData] = useState([]);
  const [leavingData, setLeavingData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const formatDOB = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as-is if not a valid date
    }

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const fetchJoiningData = async (page = 1) => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/active?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      const processedData = result.data.map(item => ({
        ...item,
        employeeId: item.employee_id,
        candidateName: item.name_as_per_aadhar,
        mobileNo: item.mobile_no,
        blood_group_name: item.bloodGroup?.blood_group_name,
        status: 'active'
      }));

      setJoiningData(processedData);
      setPagination(result.pagination || {
        page: 1,
        limit: 10,
        total: result.data.length,
        totalPages: 1
      });
    } catch (error) {
      console.error('Error fetching joining data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchLeavingData = async (page = 1) => {
    setLoading(true);
    setTableLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/left?page=${page}&limit=${pagination.limit}&search=${encodeURIComponent(searchTerm)}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      const processedData = result.data.map(item => ({
        ...item,
        ...item.joining,
        employeeId: item.joining?.employee_id,
        name: item.joining?.name_as_per_aadhar,
        mobileNo: item.mobile_no || item.joining?.mobile_no,
        blood_group_name: item.joining?.bloodGroup?.blood_group_name,
      }));

      setLeavingData(processedData);
      setPagination(result.pagination || {
        page: 1,
        limit: 10,
        total: result.data.length,
        totalPages: 1
      });
    } catch (error) {
      console.error('Error fetching leaving data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      if (activeTab === 'joining') {
        fetchJoiningData(newPage);
      } else {
        fetchLeavingData(newPage);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'joining') {
      fetchJoiningData(1);
    } else {
      fetchLeavingData(1);
    }
  }, [activeTab]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (activeTab === 'joining') {
        fetchJoiningData(1);
      } else {
        fetchLeavingData(1);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const filteredJoiningData = joiningData;

  const filteredLeavingData = leavingData;

  return (
    <div className="space-y-6">

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex flex-1 max-w-md">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search by name, employee ID, or designation..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300   rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white  text-gray-500 "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 " />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-300 ">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'joining'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('joining')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Joining ({filteredJoiningData.length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'leaving'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('leaving')}
            >
              <Clock size={16} className="inline mr-2" />
              Leaving ({filteredLeavingData.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'joining' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white ">
                <thead className="bg-gray-100 ">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">Emp ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Joining</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Addr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar Addr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank A/C</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IFSC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Mob</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PF Eligible</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ESIC Eligible</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ESIC No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Past PF ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Off. Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mob Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lap Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Att. Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white ">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading pending calls...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchLeavingData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredJoiningData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 group">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono font-bold bg-white group-hover:bg-gray-50">{item.employeeId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium bg-white group-hover:bg-gray-50">{item.candidateName}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.father_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.date_of_joining ? formatDOB(item.date_of_joining) : '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.joining_company_name || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobileNo}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.personal_email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.blood_group_name || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDOB(item.date_of_birth)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.gender}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={item.current_address}>{item.current_address}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={item.address_as_per_aadhar_card}>{item.address_as_per_aadhar_card}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.aadhar_card_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.current_bank_ac_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.ifsc_code}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.branch_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.family_mobile_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.relationship_with_family_person}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.highest_qualification}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.pf_eligible}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.esic_eligible}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.esic_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.past_pf_id}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.email_id_to_be_issued}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.issue_mobile}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.issue_laptop}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.mode_of_attendance}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tableLoading && filteredJoiningData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">No joining employees found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaving' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white ">
                <thead className="bg-gray-100 ">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">Emp ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOL</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Father Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Addr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar Addr</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aadhar No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank A/C</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IFSC</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Mob</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PF Eligible</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ESIC Eligible</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ESIC No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Past PF ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Off. Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mob Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lap Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Att. Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white ">
                  {tableLoading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex justify-center flex-col items-center">
                          <div className="w-6 h-6 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-2"></div>
                          <span className="text-gray-600 text-sm">Loading pending calls...</span>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-red-500">Error: {error}</p>
                        <button
                          onClick={fetchLeavingData}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : filteredLeavingData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 group">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono font-bold bg-white group-hover:bg-gray-50">{item.employeeId}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium bg-white group-hover:bg-gray-50">{item.name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDOB(item.date_of_leaving)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.reason_for_leaving}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.father_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.date_of_joining ? formatDOB(item.date_of_joining) : '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.designation}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.joining_company_name || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.salary}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.mobileNo}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.personal_email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.blood_group_name || '-'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatDOB(item.date_of_birth)}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.gender}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={item.current_address}>{item.current_address}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={item.address_as_per_aadhar_card}>{item.address_as_per_aadhar_card}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.aadhar_card_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.current_bank_ac_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.ifsc_code}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.branch_name}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.family_mobile_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.relationship_with_family_person}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.highest_qualification}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.pf_eligible}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.esic_eligible}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.esic_no}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.past_pf_id}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.email_id_to_be_issued}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.issue_mobile}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.issue_laptop}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.mode_of_attendance}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.payment_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!tableLoading && filteredLeavingData.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-500 ">No leaving employees found.</p>
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
    </div>
  );
};

export default Employee;

import React, { useEffect, useState } from 'react';
import { IndianRupee, Download, Eye, Calendar, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';
import useDataStore from '../store/dataStore';
import toast from 'react-hot-toast';

const MySalary = () => {
  // const { user } = useAuthStore();
  // const { getFilteredData } = useDataStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [salaryData, setSalaryData] = useState([]);
  const [pfData, setPfData] = useState(null);
  const [pfLoading, setPfLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  //  const salaryData = getFilteredData('salaryData', user);

  //  Filter salary by selected year
  const filteredSalary = salaryData.filter(record => {
    return record.year.includes(selectedYear.toString());
  });

  const fetchSalaryData = async () => {
    setLoading(true);
    setTableLoading(true);
    setError(null);
    try {
      const userData = localStorage.getItem("user");
      if (!userData) throw new Error("User details not found");
      const currentUser = JSON.parse(userData);
      const userEmpCode = currentUser.employeeCode || currentUser.username || '';
      if (!userEmpCode) throw new Error("Employee code not found");

      const result = await api.get(`/salaries/personal?employeeCode=${encodeURIComponent(userEmpCode)}`);
      setSalaryData(result.data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load salary data");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const fetchPfData = async () => {
    setPfLoading(true);
    try {
      const res = await api.get("/pf/my-pf");
      const data = res?.data || res;
      if (data?.employeeId || data?.pfId || res?.success) {
        setPfData(data);
      }
    } catch (err) {
      console.error("Failed to fetch my PF record:", err);
    } finally {
      setPfLoading(false);
    }
  };

  const handleToggleOptIn = async (newVal) => {
    if (!pfData) return;
    try {
      const res = await api.put(`/pf/${pfData.employeeId}`, {
        isOptedIn: newVal,
      });
      if (res?.success || res?.data) {
        toast.success(newVal ? "Enrolled in Provident Fund (PF)" : "Opted out of Provident Fund (PF)");
        setPfData((prev) => (prev ? { ...prev, isOptedIn: newVal, calculatedDeduction: newVal ? 1800 : 0 } : prev));
        fetchPfData();
        fetchSalaryData();
      } else {
        toast.error(res?.message || "Failed to update PF preference");
      }
    } catch (err) {
      console.error("PF toggle error:", err);
      toast.error(err.message || "Failed to update PF preference");
    }
  };

  useEffect(() => {
    fetchSalaryData();
    fetchPfData();
  }, []);

  // Calculate yearly statistics
  // Calculate yearly statistics with type safety
  const totalEarnings = filteredSalary.reduce((sum, record) => {
    const netSalary = typeof record.netSalary === 'string'
      ? parseFloat(record.netSalary.replace(/[^\d.]/g, '')) || 0
      : record.netSalary || 0;
    return sum + netSalary;
  }, 0);

  const averageSalary = filteredSalary.length > 0 ? totalEarnings / filteredSalary.length : 0;

  const totalDeductions = filteredSalary.reduce((sum, record) => {
    const deductions = typeof record.deductions === 'string'
      ? parseFloat(record.deductions.replace(/[^\d.]/g, '')) || 0
      : record.deductions || 0;
    return sum + deductions;
  }, 0);

  const totalOvertime = filteredSalary.reduce((sum, record) => {
    const overtime = typeof record.overtime === 'string'
      ? parseFloat(record.overtime.replace(/[^\d.]/g, '')) || 0
      : record.overtime || 0;
    return sum + overtime;
  }, 0);

  const currentYr = new Date().getFullYear();
  const years = [currentYr, currentYr - 1, currentYr - 2, currentYr - 3];

  return (
    <div className="space-y-6 page-content p-6">
      <div className="flex items-center justify-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Provident Fund (PF) Information & Opt-In Card */}
      {pfData && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Provident Fund (PF) Statutory Details</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Base Salary: <strong>₹{pfData.baseSalary?.toLocaleString()}</strong> • Monthly PF Deduction:{" "}
                <strong className="text-indigo-600">₹{pfData.calculatedDeduction?.toLocaleString()}</strong>
              </p>
            </div>

            {pfData.isMandatory ? (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                Mandatory Statutory PF (12% of Base)
              </span>
            ) : pfData.isOptedIn === true ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
                <CheckCircle size={14} />
                <span>Opted In (₹1,800/mo)</span>
              </span>
            ) : pfData.isOptedIn === false ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 self-start sm:self-auto">
                <XCircle size={14} />
                <span>Opted Out (₹0/mo)</span>
              </span>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 bg-amber-50/80 border border-amber-200 p-3 rounded-2xl self-start sm:self-auto">
                <div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                    Pending Selection
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleOptIn(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle size={14} />
                    <span>Yes (Opt In)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleOptIn(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle size={14} />
                    <span>No (Opt Out)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-gray-400 font-semibold uppercase">UAN Number</span>
              <p className="font-mono text-sm font-bold text-gray-800 mt-0.5">
                {pfData.uanNumber ? pfData.uanNumber : <span className="text-gray-400 italic">Not set by HR</span>}
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-150">
              <span className="text-gray-400 font-semibold uppercase">PF Member Number</span>
              <p className="font-mono text-sm font-bold text-gray-800 mt-0.5">
                {pfData.pfNumber ? pfData.pfNumber : <span className="text-gray-400 italic">Not set by HR</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <IndianRupee size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Earnings</p>
              <h3 className="text-2xl font-bold text-gray-800">₹{totalEarnings.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Average Salary</p>
              <h3 className="text-2xl font-bold text-gray-800">₹{Math.round(averageSalary).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100 mr-4">
              <IndianRupee size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Deductions</p>
              <h3 className="text-2xl font-bold text-gray-800">₹{totalDeductions.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-100 mr-4">
              <IndianRupee size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Overtime</p>
              <h3 className="text-2xl font-bold text-gray-800">₹{totalOvertime.toLocaleString()}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Salary Records Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Salary Records - {selectedYear}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allowances</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overtime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay Date</th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                        onClick={fetchSalaryData}
                        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : filteredSalary.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{record.basicSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{record.allowances.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{record.overtime.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{record.deductions.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ₹{record.netSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.payDate).toLocaleDateString()}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewPayslip(record)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Payslip"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPayslip(record)}
                          className="text-green-600 hover:text-green-900"
                          title="Download Payslip"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
            {!tableLoading && filteredSalary.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No salary records found for the selected year.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Salary Breakdown Chart (Latest Month) */}
      {filteredSalary.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Latest Salary Breakdown - {filteredSalary[0].month}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Basic Salary</p>
              <p className="text-xl font-bold text-green-600">₹{filteredSalary[0].basicSalary.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Allowances</p>
              <p className="text-xl font-bold text-blue-600">₹{filteredSalary[0].allowances.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-gray-600">Overtime</p>
              <p className="text-xl font-bold text-amber-600">₹{filteredSalary[0].overtime.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Deductions</p>
              <p className="text-xl font-bold text-red-600">₹{filteredSalary[0].deductions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySalary;
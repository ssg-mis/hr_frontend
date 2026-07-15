import React, { useEffect, useState } from 'react';
import { Search, Plus, Calendar, Clock, Download, Trash2, Edit2, Check, X, Filter, BarChart3, CreditCard, Receipt, Settings, Utensils, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import useAuthStore from '../store/authStore';

const CanteenDashboard = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState((user?.role === "employee" || user?.role === "canteen_manager") ? "logs" : "analytics");
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState([]);
  const [logs, setLogs] = useState([]);
  const [deductions, setDeductions] = useState([]);
  
  // Date filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [logFilters, setLogFilters] = useState({
    employeeSearch: "",
    mealId: "",
    startDate: "",
    endDate: ""
  });
  
  // Modal states for meal crud
  const [showMealModal, setShowMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null); // null means adding new
  const [mealForm, setMealForm] = useState({ name: "", price: "" });
  const [submittingMeal, setSubmittingMeal] = useState(false);

  // Pagination for logs
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  // Load meals
  const loadMeals = async () => {
    try {
      const res = await api.get("/canteen/meals");
      setMeals(res.data || []);
    } catch (err) {
      toast.error("Failed to load meals");
    }
  };

  // Load history logs
  const loadLogs = async () => {
    try {
      const queryParams = [];
      if (logFilters.startDate) queryParams.push(`startDate=${logFilters.startDate}`);
      if (logFilters.endDate) queryParams.push(`endDate=${logFilters.endDate}`);
      if (logFilters.mealId) queryParams.push(`mealId=${logFilters.mealId}`);
      
      const queryStr = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const res = await api.get(`/canteen/logs${queryStr}`);
      setLogs(res.data || []);
      setLogPage(1);
    } catch (err) {
      toast.error("Failed to load logs");
    }
  };

  // Load monthly deductions
  const loadDeductions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/canteen/deductions?month=${selectedMonth}`);
      setDeductions(res.data || []);
    } catch (err) {
      toast.error("Failed to load monthly deductions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      loadLogs();
    } else if ((activeTab === "deductions" || activeTab === "analytics") && user?.role !== "employee" && user?.role !== "canteen_manager") {
      loadDeductions();
    }
  }, [activeTab, selectedMonth, user]);

  // Filter logs locally by search
  const filteredLogs = logs.filter(log => {
    const search = logFilters.employeeSearch.toLowerCase().trim();
    if (!search) return true;
    return (
      log.employeeName.toLowerCase().includes(search) ||
      log.employeeCode.toLowerCase().includes(search) ||
      log.mealName.toLowerCase().includes(search)
    );
  });

  // Pagination calculation
  const indexOfLastLog = logPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Meal CRUD Handlers
  const openMealModal = (meal = null) => {
    if (meal) {
      setEditingMeal(meal);
      setMealForm({ name: meal.name, price: Number(meal.price).toString() });
    } else {
      setEditingMeal(null);
      setMealForm({ name: "", price: "" });
    }
    setShowMealModal(true);
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    if (!mealForm.name || !mealForm.price || isNaN(Number(mealForm.price))) {
      toast.error("Please enter a valid name and price");
      return;
    }

    setSubmittingMeal(true);
    try {
      if (editingMeal) {
        // Edit
        await api.put(`/canteen/meals/${editingMeal.id}`, {
          name: mealForm.name,
          price: Number(mealForm.price)
        });
        toast.success("Meal updated successfully!");
      } else {
        // Create
        await api.post("/canteen/meals", {
          name: mealForm.name,
          price: Number(mealForm.price)
        });
        toast.success("Meal added successfully!");
      }
      setShowMealModal(false);
      loadMeals();
    } catch (err) {
      toast.error(err.message || "Failed to save meal configuration");
    } finally {
      setSubmittingMeal(false);
    }
  };

  const handleDeleteMeal = async (id) => {
    if (!window.confirm("Are you sure you want to delete this meal type?")) return;
    try {
      await api.delete(`/canteen/meals/${id}`);
      toast.success("Meal deleted successfully!");
      loadMeals();
    } catch (err) {
      toast.error(err.message || "Failed to delete meal");
    }
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No logs to export");
      return;
    }

    const headers = ["ID", "Employee Code", "Employee Name", "Meal Type", "Price (INR)", "Served At"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.employeeCode,
      log.employeeName,
      log.mealName,
      Number(log.price).toFixed(2),
      new Date(log.servedAt).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `canteen_logs_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded!");
  };

  // Aggregated Analytics calculations
  const totalMealsCount = deductions.reduce((sum, d) => sum + d.totalMeals, 0);
  const totalDeductionsSum = deductions.reduce((sum, d) => sum + Number(d.totalDeduction), 0);
  const uniqueUsersCount = deductions.length;

  // Chart data: Meal counts
  const mealBreakdown = { Breakfast: 0, Lunch: 0, Snack: 0, Dinner: 0, Others: 0 };
  deductions.forEach(d => {
    mealBreakdown.Breakfast += d.breakdown.Breakfast || 0;
    mealBreakdown.Lunch += d.breakdown.Lunch || 0;
    mealBreakdown.Snack += d.breakdown.Snack || 0;
    mealBreakdown.Dinner += d.breakdown.Dinner || 0;
    mealBreakdown.Others += d.breakdown.Others || 0;
  });

  const pieChartData = [
    { name: "Breakfast", value: mealBreakdown.Breakfast, color: "#6366f1" },
    { name: "Lunch", value: mealBreakdown.Lunch, color: "#f59e0b" },
    { name: "Snack", value: mealBreakdown.Snack, color: "#ec4899" },
    { name: "Dinner", value: mealBreakdown.Dinner, color: "#10b981" }
  ].filter(item => item.value > 0);

  // Chart data: Cost by department
  const deptCostMap = {};
  deductions.forEach(d => {
    const dept = d.departmentName || "Other";
    deptCostMap[dept] = (deptCostMap[dept] || 0) + Number(d.totalDeduction);
  });

  const barChartData = Object.keys(deptCostMap).map(dept => ({
    department: dept,
    deduction: Number(deptCostMap[dept].toFixed(2))
  })).sort((a, b) => b.deduction - a.deduction);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Canteen Management</h2>
            <p className="text-sm text-gray-500 mt-0.5">Manage meal rates, review consumption logs, and track monthly salary deductions.</p>
          </div>
        </div>
        
        {/* Period Picker & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <div className="relative">
            <Calendar size={15} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {user?.role !== 'employee' && (
            <a
              href="/canteen/scan"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center shadow-md shadow-indigo-600/10"
            >
              Open Scanner Screen
            </a>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Summary cards */}
      {user?.role !== 'employee' && user?.role !== 'canteen_manager' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Deductions</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">₹{totalDeductionsSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Month: {new Date(selectedMonth).toLocaleDateString([], { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Utensils size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Meals Served</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalMealsCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Across all categories</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Clock size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Unique Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{uniqueUsersCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Active users this month</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="border-b border-gray-200 shrink-0">
        <nav className="flex space-x-6">
          {[
            { id: "analytics", label: "Analytics Dashboard", icon: BarChart3 },
            { id: "deductions", label: "Monthly Deductions", icon: CreditCard },
            { id: "logs", label: "Scanned Logs History", icon: Clock },
            { id: "meals", label: "Meal Rates Config", icon: Settings }
          ].filter(tab => {
            if (user?.role === 'employee' || user?.role === 'canteen_manager') {
              return tab.id === 'logs';
            }
            return true;
          }).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 4. Tab Content */}
      <div className="mt-4">
        
        {/* Tab 1: Analytics */}
        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart: Meal Type Distribution */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[380px]">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Meal Category Distribution</h3>
              {pieChartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                  No consumption data found for {selectedMonth}
                </div>
              ) : (
                <div className="flex-1 flex flex-row items-center justify-center">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} meals`, "Volume"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-6 space-y-3">
                    {pieChartData.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-2.5 text-xs text-gray-600">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="font-medium text-gray-850 flex-1">{item.name}</span>
                        <span className="font-bold text-gray-900">{item.value} ({Math.round(item.value / totalMealsCount * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chart: Cost by Department */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[380px]">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Total Deductions by Department</h3>
              {barChartData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                  No department deduction details for {selectedMonth}
                </div>
              ) : (
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="department" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value) => [`₹${value}`, "Total Cost"]} />
                      <Bar dataKey="deduction" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 2: Monthly Deductions */}
        {activeTab === "deductions" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-sm font-bold text-gray-800">Monthly Meal Accruals</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={loadDeductions}
                  className="p-1.5 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center flex-col items-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-dashed rounded-full animate-spin mb-3"></div>
                <span className="text-gray-400 text-sm">Calculating monthly aggregates...</span>
              </div>
            ) : deductions.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400">
                No canteen logs recorded for the selected month ({selectedMonth}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="text-xs uppercase bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3">Employee Code</th>
                      <th className="px-6 py-3">Employee Name</th>
                      <th className="px-6 py-3">Department</th>
                      <th className="px-6 py-3 text-center">Meals Count</th>
                      <th className="px-6 py-3 text-center">Breakfast</th>
                      <th className="px-6 py-3 text-center">Lunch</th>
                      <th className="px-6 py-3 text-center">Snack</th>
                      <th className="px-6 py-3 text-center">Dinner</th>
                      <th className="px-6 py-3 text-right">Deduction (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {deductions.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900">{emp.employeeCode}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{emp.employeeName}</td>
                        <td className="px-6 py-4 text-gray-650">{emp.departmentName}</td>
                        <td className="px-6 py-4 text-center font-bold text-indigo-650">{emp.totalMeals}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{emp.breakdown.Breakfast || 0}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{emp.breakdown.Lunch || 0}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{emp.breakdown.Snack || 0}</td>
                        <td className="px-6 py-4 text-center text-gray-500">{emp.breakdown.Dinner || 0}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">₹{Number(emp.totalDeduction).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Logs History */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            
            {/* Filter Logs Panel */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Search name, code, meal..."
                  value={logFilters.employeeSearch}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, employeeSearch: e.target.value }))}
                  className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">Meal Category</label>
                <select
                  value={logFilters.mealId}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, mealId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Meals</option>
                  {meals.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">From Date</label>
                <input
                  type="date"
                  value={logFilters.startDate}
                  onChange={(e) => setLogFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1.5">To Date</label>
                  <input
                    type="date"
                    value={logFilters.endDate}
                    onChange={(e) => setLogFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <button
                  onClick={loadLogs}
                  className="px-3 h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 border border-slate-700"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-800">Canteen Scanner Audit Trail</h3>
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No scan logs match filters.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                      <thead className="text-xs uppercase bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3">Log ID</th>
                          <th className="px-6 py-3">Employee Code</th>
                          <th className="px-6 py-3">Employee Name</th>
                          <th className="px-6 py-3">Meal Served</th>
                          <th className="px-6 py-3 text-center">Timestamp</th>
                          <th className="px-6 py-3 text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {currentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-gray-400">#{log.id}</td>
                            <td className="px-6 py-4 font-semibold text-gray-900">{log.employeeCode}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{log.employeeName}</td>
                            <td className="px-6 py-4 text-gray-650">{log.mealName}</td>
                            <td className="px-6 py-4 text-center text-xs text-gray-500">
                              {new Date(log.servedAt).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">₹{Number(log.price).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalLogPages > 1 && (
                    <div className="p-4 border-t border-gray-150 flex items-center justify-between">
                      <span className="text-xs text-gray-450">
                        Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} logs
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={logPage === 1}
                          onClick={() => setLogPage(prev => Math.max(prev - 1, 1))}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          disabled={logPage === totalLogPages}
                          onClick={() => setLogPage(prev => Math.min(prev + 1, totalLogPages))}
                          className="p-1 border border-gray-300 rounded hover:bg-gray-150 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Meal Rates Config */}
        {activeTab === "meals" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800">Predefined Meal Options</h3>
              <button
                onClick={() => openMealModal(null)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                Add Meal
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs uppercase bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Meal ID</th>
                    <th className="px-6 py-3">Meal Name</th>
                    <th className="px-6 py-3 text-right">Price (INR)</th>
                    <th className="px-6 py-3 text-center">Last Updated</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {meals.map((meal) => (
                    <tr key={meal.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-gray-400">#{meal.id}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{meal.name}</td>
                      <td className="px-6 py-4 text-right font-bold text-indigo-650">₹{Number(meal.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">
                        {new Date(meal.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => openMealModal(meal)}
                          className="p-1 hover:text-indigo-600 transition-colors cursor-pointer inline-block"
                        >
                          <Edit2 size={14} />
                        </button>
                        
                        {/* Protect core pre-defined meals from deleting easily */}
                        {!["Breakfast", "Lunch", "Snack", "Dinner"].includes(meal.name) && (
                          <button
                            onClick={() => handleDeleteMeal(meal.id)}
                            className="p-1 hover:text-red-650 transition-colors cursor-pointer inline-block"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Meal Modal Form */}
      {showMealModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-base leading-tight">
                {editingMeal ? "Update Meal Option" : "Create New Meal Option"}
              </h3>
              <button onClick={() => setShowMealModal(false)} className="text-white/80 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleMealSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Meal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. High Protein Lunch"
                  value={mealForm.name}
                  onChange={(e) => setMealForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={mealForm.price}
                  onChange={(e) => setMealForm(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMealModal(false)}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingMeal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 disabled:bg-slate-405 text-white font-bold rounded-lg text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center justify-center"
                >
                  {submittingMeal ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    editingMeal ? "Update Meal" : "Add Meal"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CanteenDashboard;

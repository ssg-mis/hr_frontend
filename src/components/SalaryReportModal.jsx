import React, { useState, useEffect, useMemo } from "react";
import { X, Download, Search, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import api from "../lib/api";
import { generateSalaryReportExcel, formatMonthLabel } from "../lib/generateSalaryReportExcel";

const DEFAULT_COMPANY_NAME = "SHRI SHYAM WAREHOUSING & POWER PVT. LTD.";

// api.get returns the JSON body itself: either an array or { success, data: [...] }
const toArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

// "2026-09" -> "2026-04" (n months earlier)
const shiftMonth = (period, delta) => {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const SalaryReportModal = ({
  isOpen,
  onClose,
  companies = [],
  departments = [],
  defaultMonth,
  defaultCompany = "All",
  defaultDepartment = "All",
  defaultPayMode = "All",
  author,
}) => {
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [company, setCompany] = useState("All");
  const [departmentName, setDepartmentName] = useState("All");
  const [payMode, setPayMode] = useState("All");
  const [includeDraft, setIncludeDraft] = useState(true);
  const [employeeMode, setEmployeeMode] = useState("All"); // "All" | "Select"
  const [selectedIds, setSelectedIds] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [allEmployees, setAllEmployees] = useState([]);
  const [generating, setGenerating] = useState(false);

  // Reset to the page's current filters every time the modal opens
  useEffect(() => {
    if (!isOpen) return;
    const base = defaultMonth || new Date().toISOString().slice(0, 7);
    setFromMonth(shiftMonth(base, -5));
    setToMonth(base);
    setCompany(defaultCompany || "All");
    setDepartmentName(defaultDepartment || "All");
    setPayMode(defaultPayMode || "All");
    setEmployeeMode("All");
    setSelectedIds([]);
    setEmployeeSearch("");

    // Include left employees too: they can still have payroll history in the range
    api.get("/employees")
      .then((res) => setAllEmployees(toArray(res)))
      .catch(() => setAllEmployees([]));
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return allEmployees
      .filter((e) => !q ||
        (e.candidateName || "").toLowerCase().includes(q) ||
        String(e.biometricEmployeeCode || "").toLowerCase().includes(q))
      .slice(0, 200);
  }, [allEmployees, employeeSearch]);

  const employeeById = useMemo(() => new Map(allEmployees.map((e) => [e.id, e])), [allEmployees]);

  const toggleEmployee = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDownload = async () => {
    if (!fromMonth || !toMonth) {
      toast.error("Please select both From and To months.");
      return;
    }
    if (fromMonth > toMonth) {
      toast.error("From month must be before To month.");
      return;
    }
    if (employeeMode === "Select" && selectedIds.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }

    setGenerating(true);
    const toastId = toast.loading("Generating Salary Report...");
    try {
      const params = new URLSearchParams({ from: fromMonth, to: toMonth });
      if (employeeMode === "Select") params.append("employeeIds", selectedIds.join(","));
      if (company !== "All") params.append("branchId", company);
      if (departmentName !== "All") params.append("department", departmentName);
      if (payMode !== "All") params.append("payMode", payMode);
      if (includeDraft) params.append("includeDraft", "true");

      const res = await api.get(`/salaries/payroll/report?${params.toString()}`);
      const data = toArray(res);
      const rateHistory = Array.isArray(res?.rateHistory) ? res.rateHistory : [];
      toast.dismiss(toastId);

      if (data.length === 0 && rateHistory.length === 0) {
        toast.error(includeDraft
          ? "No saved payroll found for this range. Save the payroll run for these months first (Save Payroll Run)."
          : "No Processed/Paid payroll found. Tick 'Include Draft payrolls' to include saved drafts.");
        return;
      }

      const companyObj = companies.find((c) => String(c.id) === String(company));
      const uniqueBranches = Array.from(new Set(data.map((r) => r.branchName).filter(Boolean)));
      if (data.length === 0) {
        toast("No saved payroll in this range - exporting the Salary Rate sheet only.", { icon: "ℹ️" });
      }
      const companyName = companyObj?.name || (uniqueBranches.length === 1 ? uniqueBranches[0] : DEFAULT_COMPANY_NAME);

      const filterParts = [
        `Company: ${companyObj?.name || "All"}`,
        `Department: ${departmentName}`,
        `Pay Mode: ${payMode}`,
        `Employees: ${employeeMode === "Select" ? selectedIds.length + " selected" : "All"}`,
        includeDraft ? "Includes Draft" : "Processed/Paid only",
      ];

      const result = await generateSalaryReportExcel({
        data,
        rateHistory,
        from: fromMonth,
        to: toMonth,
        companyName,
        filterLine: filterParts.join("  |  "),
        author,
      });
      toast.success(`Salary Report exported: ${result.employees} employees with payroll, ${result.rateEmployees} in Salary Rate sheet.`);
      onClose();
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Salary report error:", err);
      toast.error("Failed to generate Salary Report: " + (err?.body?.message || err?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Salary Report
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Month range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From Month</label>
              <input type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} className={selectClass} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To Month</label>
              <input type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} className={selectClass} />
            </div>
          </div>
          {fromMonth && toMonth && fromMonth <= toMonth && (
            <p className="text-xs text-gray-500 -mt-2">
              Range: {formatMonthLabel(fromMonth)} to {formatMonthLabel(toMonth)}
            </p>
          )}

          {/* Filters */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
              <select value={company} onChange={(e) => setCompany(e.target.value)} className={selectClass}>
                <option value="All">All Companies</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Department</label>
              <select value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} className={selectClass}>
                <option value="All">All Departments</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Pay Mode</label>
              <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={selectClass}>
                <option value="All">All Pay Modes</option>
                <option value="BANK">Bank</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>

          {/* Employees */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Employees</label>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={employeeMode === "All"} onChange={() => setEmployeeMode("All")} />
                All employees
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" checked={employeeMode === "Select"} onChange={() => setEmployeeMode("Select")} />
                Select employees
              </label>
            </div>

            {employeeMode === "Select" && (
              <div className="mt-2 border border-gray-200 rounded-xl p-3 space-y-2">
                {selectedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIds.map((id) => {
                      const emp = employeeById.get(id);
                      return (
                        <span key={id} className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium px-2 py-0.5 rounded-full">
                          {emp?.biometricEmployeeCode ? `${emp.biometricEmployeeCode} - ` : ""}{emp?.candidateName || id}
                          <button onClick={() => toggleEmployee(id)} className="hover:text-blue-900"><X size={12} /></button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by name or emp code..."
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {filteredEmployees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 px-1 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleEmployee(e.id)} />
                      <span className="text-gray-500 w-16 shrink-0">{e.biometricEmployeeCode || "—"}</span>
                      <span className="text-gray-800 truncate">{e.candidateName}</span>
                      {(e.status !== "Active" || e.leftDate) && (
                        <span className="ml-auto text-[10px] font-semibold text-gray-400">LEFT</span>
                      )}
                    </label>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">No employees found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />
            Include Draft payrolls
          </label>

          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            Excel contains 4 sheets: <b>Summary</b> (range totals per employee), <b>Month-wise</b> (net pay per month), <b>Detail</b> (every payroll row) and <b>Salary Rate</b> (basic &amp; allowance rate for each month, changes highlighted). The first three use saved Monthly payroll runs only.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={generating}
            className={`px-4 py-2 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 ${generating ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            <Download size={16} />
            {generating ? "Generating..." : "Download Excel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryReportModal;

import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Calendar, Clock, Download, Plus, Check, X, FileText,
  BarChart3, CreditCard, Calculator, Filter, Eye, Trash2, Save,
  AlertCircle, ChevronLeft, ChevronRight, User, Settings, ShieldAlert, BadgeInfo, Printer
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../lib/api";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";
import { generatePayslipPDF, generateBulkPayslipsPDF } from "../lib/generatePayslipPDF";
import PayslipPreviewModal from "../components/PayslipPreviewModal";

// Helper to safely invoke autoTable regardless of build bundle structure
const applyAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, options);
  }
};


const Payroll = () => {
  const { user, isAdmin, isHR, isHOD } = useAuthStore();
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const [activeMode, setActiveMode] = useState("Monthly"); // "Monthly" | "Daily"
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr); // "YYYY-MM"

  // Daily date range
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10)); // 1st of current month
  const [endDate, setEndDate] = useState(todayStr); // Today

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalServerPages, setTotalServerPages] = useState(1);

  // Debounced search term for server API calls
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, departmentFilter, selectedMonth, activeMode, startDate, endDate]);

  // Raw data from APIs
  const [employees, setEmployees] = useState([]);
  const [salariesList, setSalariesList] = useState([]);
  const [pfDetailsList, setPfDetailsList] = useState([]);
  const [esicDetailsList, setEsicDetailsList] = useState([]);
  const [emisList, setEmisList] = useState([]);
  const [compensationList, setCompensationList] = useState([]);
  const [canteenData, setCanteenData] = useState([]); // Monthly array or Daily logs
  const [leavesList, setLeavesList] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);

  // Calculated & Edited payroll records
  const [payrollRows, setPayrollRows] = useState([]);
  const [savedPayrollRuns, setSavedPayrollRuns] = useState([]);

  // Modals / Details
  const [selectedRowForPayslip, setSelectedRowForPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  // Helper to safely extract arrays from backend responses
  const getArrayData = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    return [];
  };

  const salaryByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of salariesList) {
      map.set(Number(record.employeeId), record);
    }
    return map;
  }, [salariesList]);

  const employeeById = useMemo(() => {
    const map = new Map();
    for (const emp of employees) {
      map.set(Number(emp.id), emp);
    }
    return map;
  }, [employees]);

  const pfByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of pfDetailsList) {
      map.set(Number(record.employeeId), record);
    }
    return map;
  }, [pfDetailsList]);

  const esicByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of esicDetailsList) {
      map.set(Number(record.employeeId), record);
    }
    return map;
  }, [esicDetailsList]);

  const activeEmiByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of emisList) {
      const employeeId = Number(record.employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, []);
      }
      map.get(employeeId).push(record);
    }
    return map;
  }, [emisList]);

  const leavesByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of leavesList) {
      const employeeId = Number(record.employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, []);
      }
      map.get(employeeId).push(record);
    }
    return map;
  }, [leavesList]);

  const attendanceByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of attendanceData) {
      const employeeId = Number(record.employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, []);
      }
      map.get(employeeId).push(record);
    }
    return map;
  }, [attendanceData]);

  const compensationByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of compensationList) {
      const employeeId = Number(record.employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, []);
      }
      map.get(employeeId).push(record);
    }
    return map;
  }, [compensationList]);

  const canteenByEmployeeId = useMemo(() => {
    const map = new Map();
    for (const record of canteenData) {
      const employeeId = Number(record.employeeId);
      if (!map.has(employeeId)) {
        map.set(employeeId, []);
      }
      map.get(employeeId).push(record);
    }
    return map;
  }, [canteenData]);

  // Load basic configurations
  const loadBaseData = async () => {
    setLoading(true);
    try {
      const [empRes, salRes, pfRes, esicRes, emiRes, compRes, leavesRes] = await Promise.all([
        api.get("/employees"),
        api.get("/salaries?limit=1000"),
        api.get("/pf/payroll"),
        api.get("/esic/payroll"),
        api.get("/emis"),
        api.get("/compensation"),
        api.get("/leaves?limit=10000"),
      ]);

      const activeEmps = getArrayData(empRes).filter(e => e.status === "Active");
      setEmployees(activeEmps);
      setSalariesList(getArrayData(salRes));
      setPfDetailsList(getArrayData(pfRes));
      setEsicDetailsList(getArrayData(esicRes));
      setEmisList(getArrayData(emiRes).filter(e => e.status === "Active"));

      const allComps = getArrayData(compRes);
      const approvedComps = allComps.filter(c => {
        const statusLower = (c.status || "").toLowerCase();
        const hrStatusLower = (c.hrStatus || "").toLowerCase();
        const hodStatusLower = (c.hodStatus || "").toLowerCase();
        return (
          statusLower === "approved" ||
          hrStatusLower === "approved" ||
          (hodStatusLower === "approved" && hrStatusLower === "approved")
        );
      });
      setCompensationList(approvedComps);
      setLeavesList(getArrayData(leavesRes).filter(l => l.status === "Approved"));

    } catch (err) {
      console.error("Error fetching base payroll configurations:", err);
      toast.error("Failed to load employee configuration details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
  }, []);

  // Fetch canteen deductions and attendance logs when month or date range changes
  const loadMonthLogsData = async () => {
    try {
      let startD = startDate;
      let endD = endDate;
      if (activeMode === "Monthly") {
        const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
        const lastDay = new Date(yearStr, monthStr, 0).getDate();
        startD = `${selectedMonth}-01`;
        endD = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        if (endD > todayStr) endD = todayStr;
      }

      const canteenPromise = activeMode === "Monthly"
        ? api.get(`/canteen/deductions?month=${selectedMonth}`)
        : api.get(`/canteen/logs?startDate=${startDate}&endDate=${endDate}`);

      const attendancePromise = api.get(`/attendance/sessions?startDate=${startD}&endDate=${endD}`).catch(attErr => {
        console.error("Attendance API query error:", attErr);
        return { data: [] };
      });

      const [cantRes, attRes] = await Promise.all([
        canteenPromise,
        attendancePromise,
      ]);

      setCanteenData(cantRes.data || []);
      setAttendanceData(attRes.data || []);
    } catch (err) {
      console.error("Error loading month logs data:", err);
    }
  };

  useEffect(() => {
    loadMonthLogsData();
  }, [activeMode, selectedMonth, startDate, endDate]);

  // Fetch paginated saved payroll runs when period, page, search, or filter changes
  const loadPayrollPageData = async () => {
    setLoading(true);
    try {
      const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`;

      const params = new URLSearchParams({
        period: periodStr,
        type: activeMode,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (departmentFilter) params.append("department", departmentFilter);

      const savedRes = await api.get(`/salaries/payroll?${params.toString()}`);
      const savedData = savedRes.data;

      if (savedData && typeof savedData === "object" && !Array.isArray(savedData)) {
        const savedList = savedData.data || [];
        setSavedPayrollRuns(savedList);
        setTotalRecords(savedData.total ?? savedList.length);
        setTotalServerPages(savedData.totalPages ?? 1);
      } else {
        const savedList = Array.isArray(savedData) ? savedData : [];
        setSavedPayrollRuns(savedList);
        setTotalRecords(savedList.length);
        setTotalServerPages(Math.max(1, Math.ceil(savedList.length / pageSize)));
      }
    } catch (err) {
      console.error("Error loading payroll page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollPageData();
  }, [activeMode, selectedMonth, startDate, endDate, currentPage, pageSize, debouncedSearch, departmentFilter]);

  // Helper to compute approved live compensation for an employee in current period
  const getApprovedCompensationAmount = (empId, monthlyBase) => {
    let compSum = 0;
    const empComps = compensationByEmployeeId.get(Number(empId)) || [];
    if (activeMode === "Monthly") {
      const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
      empComps.forEach(c => {
        const rawDate = c.workDate || c.startDate || c.createdAt || c.hrApprovedAt || c.hodApprovedAt;
        let dateMatch = true;
        if (rawDate) {
          const wDate = new Date(rawDate);
          if (!isNaN(wDate.getTime())) {
            const rawStr = String(rawDate);
            dateMatch =
              rawStr.includes(selectedMonth) ||
              (wDate.getFullYear() === yearStr && (wDate.getMonth() + 1) === monthStr) ||
              (wDate.getUTCFullYear() === yearStr && (wDate.getUTCMonth() + 1) === monthStr);
          }
        }
        if (dateMatch) {
          let compAmt = 0;
          if (c.amount !== undefined && c.amount !== null && parseFloat(c.amount) > 0) {
            compAmt = parseFloat(c.amount);
          } else if (c.hours !== undefined && c.hours !== null && parseFloat(c.hours) > 0) {
            const hours = parseFloat(c.hours);
            const hourlyRate = monthlyBase > 0 ? (monthlyBase / 240) * 1.5 : 0;
            compAmt = parseFloat((hours * hourlyRate).toFixed(2));
          }
          compSum += compAmt;
        }
      });
    } else {
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate + "T23:59:59");
      empComps.forEach(c => {
        const rawDate = c.workDate || c.startDate || c.createdAt || c.hrApprovedAt || c.hodApprovedAt;
        let dateMatch = true;
        if (rawDate) {
          const wDate = new Date(rawDate);
          if (!isNaN(wDate.getTime())) {
            dateMatch = wDate >= rangeStart && wDate <= rangeEnd;
          }
        }
        if (dateMatch) {
          let compAmt = 0;
          if (c.amount !== undefined && c.amount !== null && parseFloat(c.amount) > 0) {
            compAmt = parseFloat(c.amount);
          } else if (c.hours !== undefined && c.hours !== null && parseFloat(c.hours) > 0) {
            const hours = parseFloat(c.hours);
            const hourlyRate = monthlyBase > 0 ? (monthlyBase / 240) * 1.5 : 0;
            compAmt = parseFloat((hours * hourlyRate).toFixed(2));
          }
          compSum += compAmt;
        }
      });
    }
    return parseFloat(compSum.toFixed(2));
  };

  // Helper to compute live canteen deduction for an employee in current period
  const getLiveCanteenDeductionForEmployee = (empId) => {
    if (!canteenData || !Array.isArray(canteenData) || canteenData.length === 0) return 0;

    if (activeMode === "Monthly") {
      // canteenData comes from GET /canteen/deductions?month=YYYY-MM
      const canteenItems = canteenByEmployeeId.get(Number(empId)) || [];
      const total = canteenItems.reduce((sum, item) => {
        const val = item.totalDeduction !== undefined && item.totalDeduction !== null
          ? item.totalDeduction
          : (item.amount !== undefined && item.amount !== null ? item.amount : item.price || 0);
        return sum + (parseFloat(val) || 0);
      }, 0);
      return parseFloat(total.toFixed(2));
    } else {
      // canteenData comes from GET /canteen/logs?startDate=...&endDate=...
      const empLogs = canteenByEmployeeId.get(Number(empId)) || [];
      const total = empLogs.reduce((sum, item) => {
        const val = item.price !== undefined && item.price !== null
          ? item.price
          : (item.amount || item.totalDeduction || 0);
        return sum + (parseFloat(val) || 0);
      }, 0);
      return parseFloat(total.toFixed(2));
    }
  };

  // Trigger recalculations when base data or period data updates
  useEffect(() => {
    if (employees.length === 0) return;

    // If we have saved payroll records in the DB for this period, load them directly.
    if (savedPayrollRuns.length > 0) {
      const rows = savedPayrollRuns.map(run => {
        const empRecord = employeeById.get(Number(run.employeeId));
        const salRecord = salaryByEmployeeId.get(Number(run.employeeId));
        const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : parseFloat(run.basicPay || 0);
        const liveComp = getApprovedCompensationAmount(run.employeeId, monthlyBase);

        // Merge live compensation if saved compensation is less than live approved compensation, or if status is Draft
        const finalComp = (run.status === "Draft" || parseFloat(run.compensation || 0) < liveComp)
          ? liveComp
          : parseFloat(run.compensation || 0);

        // Merge live canteen deduction if saved canteen is less than live canteen, or if status is Draft
        const liveCanteen = getLiveCanteenDeductionForEmployee(run.employeeId);
        const finalCanteen = (run.status === "Draft" || parseFloat(run.canteenDeduction || 0) < liveCanteen)
          ? liveCanteen
          : parseFloat(run.canteenDeduction || 0);

        const basicPay = parseFloat(run.basicPay || 0);
        const allowance = parseFloat(run.allowance || 0);
        const grossSalary = parseFloat((basicPay + allowance + finalComp).toFixed(2));

        const pfDeduction = parseFloat(run.pfDeduction || 0);
        const esicDeduction = parseFloat(run.esicDeduction || 0);
        const emiDeduction = parseFloat(run.emiDeduction || 0);
        const leaveAdjustment = parseFloat(run.leaveAdjustment || 0);
        const otherDeductions = parseFloat(run.otherDeductions || 0);

        const totalDeductions = parseFloat(
          (pfDeduction + esicDeduction + emiDeduction + finalCanteen + leaveAdjustment + otherDeductions).toFixed(2)
        );
        const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));

        return {
          ...run,
          branchName: run.branchName || empRecord?.branchName || "—",
          branchAddress: run.branchAddress || empRecord?.branchAddress || "",
          paymentMode: run.paymentMode || "Cash",
          daysWorked: parseFloat(run.daysWorked),
          paidLeaves: 0,
          unpaidLeaves: parseFloat(run.leaveAdjustment ? (parseFloat(run.leaveAdjustment) / (parseFloat(run.basicPay || 1) / 30)).toFixed(0) : 0),
          basicPay,
          allowance,
          compensation: finalComp,
          leaveAdjustment,
          grossSalary,
          pfDeduction,
          esicDeduction,
          emiDeduction,
          canteenDeduction: finalCanteen,
          otherDeductions,
          totalDeductions,
          netSalary,
          isSaved: true
        };
      });
      setPayrollRows(rows);
      return;
    }

    // Otherwise, dynamically generate/calculate the payroll rows
    const generated = employees.map(emp => {
      // Find salary details
      const salRecord = salaryByEmployeeId.get(Number(emp.id));
      const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
      const monthlyAllowance = salRecord ? parseFloat(salRecord.allowanceSalary) : 0;

      // Find PF Settings
      const pfRecord = pfByEmployeeId.get(Number(emp.id));
      const isPfOptedIn = pfRecord ? pfRecord.isOptedIn : (monthlyBase <= 15000);

      // Find ESIC Settings
      const esicRecord = esicByEmployeeId.get(Number(emp.id));
      const isEsicOptedIn = esicRecord ? esicRecord.isOptedIn : ((monthlyBase + monthlyAllowance) <= 21000);

      // Find active EMIs
      const employeeEmis = activeEmiByEmployeeId.get(Number(emp.id)) || [];
      const activeEmis = employeeEmis.filter(e => e.status === "Active");
      const monthlyEmi = activeEmis.reduce((sum, item) => sum + parseFloat(item.emiAmount), 0);

      // Calculate days in period
      let daysInPeriod = 30;
      let workedDays = 30;

      if (activeMode === "Daily") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        workedDays = daysInPeriod;
      }

      // Calculate leaves (Paid vs LWP Unpaid)
      const empLeaves = leavesByEmployeeId.get(Number(emp.id)) || [];
      let lwpDays = 0;
      let paidLeaveDays = 0;

      if (activeMode === "Monthly") {
        const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
        const firstOfMonth = new Date(yearStr, monthStr - 1, 1);
        const lastOfMonth = new Date(yearStr, monthStr, 0);

        empLeaves.forEach(l => {
          const lStart = new Date(l.startDate);
          const lEnd = new Date(l.endDate);
          const overlapStart = lStart > firstOfMonth ? lStart : firstOfMonth;
          const overlapEnd = lEnd < lastOfMonth ? lEnd : lastOfMonth;

          if (overlapStart <= overlapEnd) {
            const diff = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            const daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
            const code = (l.leaveCode || '').toUpperCase();
            const typeStr = (l.leaveType || '').toLowerCase();
            if (code === "LWP" || typeStr.includes("without pay") || code.includes("UNPAID")) {
              lwpDays += daysCount;
            } else {
              paidLeaveDays += daysCount;
            }
          }
        });
      } else {
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);

        empLeaves.forEach(l => {
          const lStart = new Date(l.startDate);
          const lEnd = new Date(l.endDate);
          const overlapStart = lStart > rangeStart ? lStart : rangeStart;
          const overlapEnd = lEnd < rangeEnd ? lEnd : rangeEnd;

          if (overlapStart <= overlapEnd) {
            const diff = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            const daysCount = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
            const code = (l.leaveCode || '').toUpperCase();
            const typeStr = (l.leaveType || '').toLowerCase();
            if (code === "LWP" || typeStr.includes("without pay") || code.includes("UNPAID")) {
              lwpDays += daysCount;
            } else {
              paidLeaveDays += daysCount;
            }
          }
        });
      }

      // Attendance integration: Present Days & Unexcused Absences from actual DB records
      const empAttRecords = attendanceByEmployeeId.get(Number(emp.id)) || [];
      const presentLogs = empAttRecords.filter(a => a.status === "Present" || a.punchIn || a.firstCheckIn);
      let presentDaysCount = presentLogs.length;

      // Count unexcused absent days from attendance logs (status === "Absent")
      const unexcusedAbsents = empAttRecords.filter(a => a.status === "Absent").length;

      // Total Unpaid Leaves = Approved LWP + Unexcused Absents
      let totalUnpaidLeaves = lwpDays + unexcusedAbsents;

      // Fallback for present days if attendance logs haven't been recorded for this period:
      if (empAttRecords.length === 0) {
        presentDaysCount = Math.max(0, workedDays - lwpDays - paidLeaveDays);
        totalUnpaidLeaves = lwpDays;
      }

      // Payable Days = Total Period Days - Total Unpaid Leaves
      let payableDays = Math.max(0, workedDays - totalUnpaidLeaves);

      // Calculate base and allowance for period
      let basicPay = monthlyBase;
      let allowance = monthlyAllowance;
      let leaveAdjustment = 0;

      if (activeMode === "Monthly") {
        leaveAdjustment = totalUnpaidLeaves > 0 ? parseFloat(((monthlyBase / 30) * totalUnpaidLeaves).toFixed(2)) : 0;
      } else {
        basicPay = parseFloat(((monthlyBase / 30) * payableDays).toFixed(2));
        allowance = parseFloat(((monthlyAllowance / 30) * payableDays).toFixed(2));
        leaveAdjustment = 0;
      }

      // Fetch canteen deductions
      const canteenDeduction = getLiveCanteenDeductionForEmployee(emp.id);

      // Fetch approved overtime and special compensation
      const compensation = getApprovedCompensationAmount(emp.id, monthlyBase);

      // PF Calculation
      let pfDeduction = 0;
      if (isPfOptedIn) {
        if (activeMode === "Monthly") {
          // Cap at 15000 base -> max 1800
          const capSalary = Math.min(monthlyBase, 15000);
          pfDeduction = parseFloat((capSalary * 0.12).toFixed(2));
        } else {
          // Daily: pro-rated capped basic (15000/30 = 500 per day limit)
          const dailyBasic = basicPay;
          const capDaily = Math.min(dailyBasic, 500 * workedDays);
          pfDeduction = parseFloat((capDaily * 0.12).toFixed(2));
        }
      }

      // ESIC Calculation
      let esicDeduction = 0;
      const grossForEsic = basicPay + allowance;
      if (isEsicOptedIn) {
        // statutory limit <= 21k (checked on overall monthly gross salary)
        if ((monthlyBase + monthlyAllowance) <= 21000) {
          esicDeduction = parseFloat((grossForEsic * 0.0075).toFixed(2));
        }
      }

      // EMI Deduction
      let emiDeduction = monthlyEmi;
      if (activeMode === "Daily") {
        // Daily Mode: pro-rate EMI
        emiDeduction = parseFloat(((monthlyEmi / 30) * workedDays).toFixed(2));
      }

      const grossSalary = parseFloat((basicPay + allowance + compensation).toFixed(2));
      const totalDeductions = parseFloat((pfDeduction + esicDeduction + emiDeduction + canteenDeduction + leaveAdjustment).toFixed(2));
      const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));

      return {
        id: null, // DB id, null means unsaved
        employeeId: emp.id,
        employeeCode: emp.biometricEmployeeCode,
        employeeName: emp.candidateName,
        department: emp.departmentName || "—",
        branchName: emp.branchName || "—",
        branchAddress: emp.branchAddress || "",
        period: activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`,
        type: activeMode,
        daysWorked: payableDays,
        presentDays: presentDaysCount,
        paidLeaves: paidLeaveDays,
        unpaidLeaves: totalUnpaidLeaves,
        basicPay,
        allowance,
        compensation,
        leaveAdjustment,
        grossSalary,
        pfDeduction,
        esicDeduction,
        emiDeduction,
        canteenDeduction,
        otherDeductions: 0,
        totalDeductions,
        netSalary,
        status: "Draft",
        paymentMode: "Cash",
        payDate: todayStr,
        remarks: "",
        isSaved: false
      };
    });

    setPayrollRows(generated);
  }, [employees, salariesList, pfDetailsList, esicDetailsList, emisList, compensationList, canteenData, leavesList, attendanceData, savedPayrollRuns, activeMode, selectedMonth, startDate, endDate]);

  // Recalculates calculated columns on input overrides
  const handleCellChange = (empId, field, val) => {
    setPayrollRows(prevRows =>
      prevRows.map(row => {
        if (row.employeeId !== empId) return row;

        const updatedRow = { ...row, [field]: parseFloat(val) || 0 };

        // If days worked changed, re-calculate basic, allowance, etc.
        if (field === "daysWorked" && activeMode === "Daily") {
          const salRecord = salaryByEmployeeId.get(Number(empId));
          const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
          const monthlyAllowance = salRecord ? parseFloat(salRecord.allowanceSalary) : 0;

          updatedRow.basicPay = parseFloat(((monthlyBase / 30) * updatedRow.daysWorked).toFixed(2));
          updatedRow.allowance = parseFloat(((monthlyAllowance / 30) * updatedRow.daysWorked).toFixed(2));

          // Re-calculate PF daily
          const pfRecord = pfByEmployeeId.get(Number(empId));
          const isPfOptedIn = pfRecord ? pfRecord.isOptedIn : (monthlyBase <= 15000);
          if (isPfOptedIn) {
            const capDaily = Math.min(updatedRow.basicPay, 500 * updatedRow.daysWorked);
            updatedRow.pfDeduction = parseFloat((capDaily * 0.12).toFixed(2));
          }

          // Re-calculate ESIC daily
          const esicRecord = esicByEmployeeId.get(Number(empId));
          const isEsicOptedIn = esicRecord ? esicRecord.isOptedIn : ((monthlyBase + monthlyAllowance) <= 21000);
          if (isEsicOptedIn && (monthlyBase + monthlyAllowance) <= 21000) {
            updatedRow.esicDeduction = parseFloat(((updatedRow.basicPay + updatedRow.allowance) * 0.0075).toFixed(2));
          }

          // Re-calculate EMI daily
          const employeeEmis = activeEmiByEmployeeId.get(Number(empId)) || [];
          const activeEmis = employeeEmis.filter(e => e.status === "Active");
          const monthlyEmi = activeEmis.reduce((sum, item) => sum + parseFloat(item.emiAmount), 0);
          updatedRow.emiDeduction = parseFloat(((monthlyEmi / 30) * updatedRow.daysWorked).toFixed(2));
        }

        // Recalculate Leave adjustment if unpaid leaves override is made
        if (field === "unpaidLeaves" && activeMode === "Monthly") {
          const salRecord = salaryByEmployeeId.get(Number(empId));
          const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
          updatedRow.leaveAdjustment = parseFloat(((monthlyBase / 30) * updatedRow.unpaidLeaves).toFixed(2));
          updatedRow.daysWorked = Math.max(0, 30 - updatedRow.unpaidLeaves);
        }

        // Totals recalculations
        updatedRow.grossSalary = parseFloat(
          (updatedRow.basicPay + updatedRow.allowance + updatedRow.compensation).toFixed(2)
        );
        updatedRow.totalDeductions = parseFloat(
          (
            updatedRow.pfDeduction +
            updatedRow.esicDeduction +
            updatedRow.emiDeduction +
            updatedRow.canteenDeduction +
            updatedRow.leaveAdjustment +
            updatedRow.otherDeductions
          ).toFixed(2)
        );
        updatedRow.netSalary = parseFloat(
          Math.max(0, updatedRow.grossSalary - updatedRow.totalDeductions).toFixed(2)
        );

        return updatedRow;
      })
    );
  };

  const handleStatusChange = (empId, statusVal) => {
    setPayrollRows(prev => prev.map(row => row.employeeId === empId ? { ...row, status: statusVal } : row));
  };

  const handlePaymentModeChange = (empId, modeVal) => {
    setPayrollRows(prev => prev.map(row => row.employeeId === empId ? { ...row, paymentMode: modeVal } : row));
  };

  const handleRemarksChange = (empId, val) => {
    setPayrollRows(prev => prev.map(row => row.employeeId === empId ? { ...row, remarks: val } : row));
  };

  // Submit/Save payroll run to DB
  const handleSavePayroll = async () => {
    setSaving(true);
    try {
      const recordsToSubmit = payrollRows.map(row => ({
        employeeId: row.employeeId,
        period: row.period,
        type: row.type,
        daysWorked: row.daysWorked.toString(),
        basicPay: row.basicPay.toString(),
        allowance: row.allowance.toString(),
        compensation: row.compensation.toString(),
        leaveAdjustment: row.leaveAdjustment.toString(),
        grossSalary: row.grossSalary.toString(),
        pfDeduction: row.pfDeduction.toString(),
        esicDeduction: row.esicDeduction.toString(),
        emiDeduction: row.emiDeduction.toString(),
        canteenDeduction: row.canteenDeduction.toString(),
        otherDeductions: row.otherDeductions.toString(),
        totalDeductions: row.totalDeductions.toString(),
        netSalary: row.netSalary.toString(),
        status: row.status,
        paymentMode: row.paymentMode || "Cash",
        payDate: row.payDate,
        remarks: row.remarks
      }));

      const res = await api.post("/salaries/payroll", recordsToSubmit);
      if (res.success) {
        toast.success("Payroll records saved successfully to database!");
        loadPayrollPageData(); // Reload from DB
      }
    } catch (err) {
      console.error("Failed to save payroll batch:", err);
      toast.error(err.message || "Failed to save payroll run.");
    } finally {
      setSaving(false);
    }
  };

  // Helper to fetch full unpaginated period dataset for exports if currently on paginated view
  const getExportRows = async () => {
    if (isSavedRun && totalRecords > payrollRows.length) {
      const toastId = toast.loading("Fetching complete dataset for export...");
      try {
        const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`;
        const params = new URLSearchParams({
          period: periodStr,
          type: activeMode,
          limit: "10000",
        });
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (departmentFilter) params.append("department", departmentFilter);

        const res = await api.get(`/salaries/payroll?${params.toString()}`);
        const exportList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        toast.dismiss(toastId);
        return exportList;
      } catch (err) {
        toast.dismiss(toastId);
        console.error("Export fetch error:", err);
        toast.error("Failed to fetch full dataset for export, using current page.");
      }
    }
    return filteredRows;
  };

  // Export to CSV
  const handleExportCSV = async () => {
    const rowsToExport = await getExportRows();
    const headers = [
      "Employee Code", "Employee Name", "Department", "Payable Days", "Paid Leaves", "Unpaid Leaves",
      "Basic Pay", "Allowance", "Compensation", "Leave Adjustment", "Gross Salary",
      "PF Deduction", "ESIC Deduction", "EMI Deduction", "Canteen Deduction",
      "Other Deductions", "Total Deductions", "Net Salary", "Status", "Payment Mode", "Remarks"
    ];

    const csvRows = [headers.join(",")];
    rowsToExport.forEach(row => {
      csvRows.push([
        `"${row.employeeCode}"`,
        `"${row.employeeName}"`,
        `"${row.department}"`,
        row.daysWorked,
        row.paidLeaves || 0,
        row.unpaidLeaves,
        row.basicPay,
        row.allowance,
        row.compensation,
        row.leaveAdjustment,
        row.grossSalary,
        row.pfDeduction,
        row.esicDeduction,
        row.emiDeduction,
        row.canteenDeduction,
        row.otherDeductions,
        row.totalDeductions,
        row.netSalary,
        `"${row.status}"`,
        `"${row.paymentMode || 'Cash'}"`,
        `"${row.remarks || ''}"`
      ].join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate}_to_${endDate}`;
    link.setAttribute("download", `payroll_${activeMode}_${periodStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Summary PDF with statutory compliance columns
  const handleExportPDF = async () => {
    try {
      const rowsToExport = await getExportRows();
      if (!rowsToExport || rowsToExport.length === 0) {
        toast.error("No payroll data available to export.");
        return;
      }

      // Use landscape A3 for 32 compliance columns
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("SHRI SHYAM WAREHOUSING AND POWER PVT. LTD.", 14, 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate} to ${endDate}`;
      doc.text(`Village - BANARI  |  ${activeMode} Statutory Payroll Summary Sheet  |  Period: ${periodStr}  |  Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 18);

      const tableHeaders = [
        [
          "Sr. No.", "EMPCODE", "NAME", "UAN NO.", "IP No.", "TOTAL_DAYS",
          "PAID_DAYS", "ABSENT_DAYS", "OT HRS", "BASIC+DA", "EARN BASIC+DA",
          "ALLOW_RATE(TA,MOB,HRA,CON.)", "EARN ALLOW (TA,MOB,HRA,CON.)", "TOTAL",
          "WASHING ALL.", "OT", "GROSS", "EPF WAGES", "PF", "LABOUR WELFARE FUND",
          "ESIC", "ADV", "Penalty", "Canteen", "TOTAL DEDUCTION.", "NET SALARY",
          "Diwali Bonus", "NET PAY AMOUNT", "PAY-MODE", "BANK A/C NO.", "IFSC", "REMARK"
        ]
      ];

      const fmt = (val) => {
        if (val === "" || val === null || val === undefined) return "";
        const num = Number(val);
        if (isNaN(num)) return val;
        return num.toFixed(2);
      };

      const tableData = rowsToExport.map((row, index) => {
        const pfRec = pfByEmployeeId.get(Number(row.employeeId));
        const esicRec = esicByEmployeeId.get(Number(row.employeeId));
        const salRec = salaryByEmployeeId.get(Number(row.employeeId));

        const monthlyBase = salRec ? parseFloat(salRec.baseSalary) : 0;
        const monthlyAllowance = salRec ? parseFloat(salRec.allowanceSalary) : 0;
        const earnedTotal = (row.basicPay || 0) + (row.allowance || 0);
        const epfWages = Math.min(row.basicPay || 0, 15000);

        let totalDays = 30;
        if (activeMode === "Daily" && startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else if (activeMode === "Monthly" && selectedMonth) {
          const [yr, mo] = selectedMonth.split("-").map(Number);
          totalDays = new Date(yr, mo, 0).getDate();
        }

        return [
          index + 1,
          row.employeeCode || "-",
          row.employeeName || "-",
          pfRec?.uanNumber || "",
          esicRec?.esicNumber || "",
          totalDays,
          row.daysWorked || 0,
          row.unpaidLeaves || 0,
          row.compensation > 0 ? ((row.compensation / ((monthlyBase || 1) / 240 * 1.5)).toFixed(1)) : "0",
          fmt(monthlyBase),
          fmt(row.basicPay),
          fmt(monthlyAllowance),
          fmt(row.allowance),
          fmt(earnedTotal),
          "", // WASHING ALL.
          fmt(row.compensation),
          fmt(row.grossSalary),
          fmt(epfWages),
          fmt(row.pfDeduction),
          "", // LABOUR WELFARE FUND
          fmt(row.esicDeduction),
          fmt(row.emiDeduction),
          fmt(row.otherDeductions),
          fmt(row.canteenDeduction),
          fmt(row.totalDeductions),
          fmt(row.netSalary),
          "", // Diwali Bonus
          fmt(row.netSalary), // NET PAY AMOUNT
          "", // PAY-MODE
          "", // BANK A/C NO.
          "", // IFSC
          row.remarks || ""
        ];
      });

      applyAutoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 22,
        theme: "grid",
        styles: { fontSize: 6, cellPadding: 1, font: "helvetica" },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 5.5 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 14, halign: "center" },
          2: { cellWidth: 22 },
          3: { cellWidth: 16, halign: "center" },
          4: { cellWidth: 16, halign: "center" },
        }
      });

      doc.save(`Payroll_Summary_${activeMode}_${periodStr}.pdf`);
      toast.success("Payroll Summary PDF exported with statutory compliance columns!");
    } catch (err) {
      console.error("Export PDF error:", err);
      toast.error("Failed to export summary PDF: " + (err.message || err));
    }
  };

  // Generate individual printable PDF payslip using shared utility
  const handleDownloadPayslipPDF = (row) => {
    generatePayslipPDF(row, { action: 'download' });
  };

  // Print individual payslip
  const handlePrintPayslip = (row) => {
    generatePayslipPDF(row, { action: 'print' });
  };

  // Bulk download all visible payslips as a single PDF
  const handleBulkDownload = async () => {
    const rowsToExport = await getExportRows();
    if (rowsToExport.length === 0) {
      toast.error("No payroll data to download");
      return;
    }
    const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate}_to_${endDate}`;
    generateBulkPayslipsPDF(rowsToExport, periodStr);
    toast.success(`Downloading ${rowsToExport.length} payslips...`);
  };

  const isSavedRun = savedPayrollRuns && savedPayrollRuns.length > 0;

  // Filter rows based on search term and department
  const filteredRows = useMemo(() => {
    if (isSavedRun) {
      return payrollRows; // Already filtered & paginated by server
    }
    return payrollRows.filter(row => {
      const matchesSearch =
        !searchTerm ||
        row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        !departmentFilter || row.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [isSavedRun, payrollRows, searchTerm, departmentFilter]);

  const displayTotalRecords = isSavedRun ? totalRecords : filteredRows.length;
  const totalPages = isSavedRun
    ? totalServerPages
    : Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = isSavedRun
    ? Math.min(startIndex + payrollRows.length, displayTotalRecords)
    : Math.min(startIndex + pageSize, filteredRows.length);

  const paginatedRows = isSavedRun
    ? payrollRows
    : filteredRows.slice(startIndex, endIndex);

  const uniqueDepartments = Array.from(new Set(employees.map(e => e.departmentName).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="text-blue-600 w-7 h-7" />
            Payroll Creation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Compute, adjust, and process monthly and daily payrolls with Attendance, PF, ESIC, EMI, Canteen, and Overtime.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
          >
            <FileText size={16} />
            Export Summary PDF
          </button>
          <button
            onClick={handleBulkDownload}
            disabled={payrollRows.length === 0}
            className={`px-4 py-2 border text-sm rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm ${payrollRows.length === 0
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
          >
            <Download size={16} />
            Bulk Payslips PDF
          </button>
          <button
            onClick={handleSavePayroll}
            disabled={saving || payrollRows.length === 0}
            className={`px-5 py-2 text-white rounded-xl font-medium transition-all flex items-center gap-1.5 shadow-sm text-sm ${saving || payrollRows.length === 0
                ? "bg-blue-300 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            <Save size={16} />
            {saving ? "Saving run..." : "Save Payroll Run"}
          </button>
        </div>
      </div>

      {/* Mode & Filters Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-gray-100 pb-4">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveMode("Monthly")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeMode === "Monthly"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                }`}
            >
              Monthly Form
            </button>
            <button
              onClick={() => setActiveMode("Daily")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${activeMode === "Daily"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
                }`}
            >
              Daily Form
            </button>
          </div>

          {/* Period Selector with Future Date Guards */}
          <div className="flex items-center gap-2">
            {activeMode === "Monthly" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  max={currentMonthStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > currentMonthStr) {
                      toast.error("Future months cannot be selected for payroll!");
                      setSelectedMonth(currentMonthStr);
                    } else {
                      setSelectedMonth(val);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  max={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > todayStr) {
                      toast.error("Future dates cannot be selected for payroll!");
                      setStartDate(todayStr);
                    } else {
                      setStartDate(val);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  max={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > todayStr) {
                      toast.error("Future dates cannot be selected for payroll!");
                      setEndDate(todayStr);
                    } else {
                      setEndDate(val);
                    }
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Search & Dept Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-2">
            <BadgeInfo className="w-5 h-5 flex-shrink-0 text-blue-500" />
            <span>
              {savedPayrollRuns.length > 0
                ? "Showing SAVED payroll run from database."
                : "Showing DRAFT calculation. Click 'Save Payroll Run' to save."}
            </span>
          </div>
        </div>
      </div>

      {/* Payroll Grid Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500">Loading payroll computations...</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16">
            <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">No active employees found</h3>
            <p className="text-sm text-gray-500 mt-1">Ensure employees are active and salaries are configured.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-50 shadow-sm">
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-4 px-4 sticky top-0 left-0 bg-gray-50 z-30 shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.1)]">Emp Details</th>
                  <th className="py-4 px-3 text-center sticky top-0 bg-gray-50 z-20">Payable Days</th>
                  <th className="py-4 px-3 text-center sticky top-0 bg-gray-50 z-20">Paid Leaves</th>
                  <th className="py-4 px-3 text-center sticky top-0 bg-gray-50 z-20">Unpaid Leaves (LWP)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">Basic Pay (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">Allowance (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">OT & Comp (₹)</th>
                  {activeMode === "Monthly" && <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">LWP Adjust (₹)</th>}
                  <th className="py-4 px-3 text-right font-semibold text-green-600 bg-green-50/80 sticky top-0 z-20">Gross Salary (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">PF (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">ESIC (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">EMI (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">Canteen (₹)</th>
                  <th className="py-4 px-3 text-right sticky top-0 bg-gray-50 z-20">Other Deduct (₹)</th>
                  <th className="py-4 px-3 text-right font-semibold text-red-600 bg-red-50/80 sticky top-0 z-20">Total Deduct (₹)</th>
                  <th className="py-4 px-3 text-right font-bold text-blue-600 bg-blue-50/80 sticky top-0 z-20">Net Salary (₹)</th>
                  <th className="py-4 px-3 text-center sticky top-0 bg-gray-50 z-20">Paid Via</th>
                  <th className="py-4 px-3 text-center sticky top-0 bg-gray-50 z-20">Status</th>
                  <th className="py-4 px-3 sticky top-0 bg-gray-50 z-20">Remarks</th>
                  <th className="py-4 px-4 text-center sticky top-0 bg-gray-50 z-20">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {paginatedRows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50/60 transition-colors">
                    {/* Sticky Emp Info */}
                    <td className="py-3.5 px-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="font-semibold text-gray-900">{row.employeeName}</div>
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{row.employeeCode}</span>
                        <span>•</span>
                        <span>{row.department}</span>
                        {row.branchName && row.branchName !== "—" && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-semibold">{row.branchName}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Payable Days */}
                    <td className="py-3.5 px-3 text-center font-medium">
                      <input
                        type="text"
                        inputMode="decimal"
                        disabled={activeMode === "Monthly"}
                        value={row.daysWorked ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          handleCellChange(row.employeeId, "daysWorked", val);
                        }}
                        onWheel={(e) => e.target.blur()}
                        className={`w-16 border rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${activeMode === "Monthly" ? "bg-gray-100/60 text-gray-500 border-gray-100" : "border-gray-200"
                          }`}
                      />
                    </td>

                    {/* Paid Leaves */}
                    <td className="py-3.5 px-3 text-center font-mono text-blue-600">
                      {row.paidLeaves || 0}
                    </td>

                    {/* Unpaid Leaves (LWP) */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row.unpaidLeaves ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          handleCellChange(row.employeeId, "unpaidLeaves", val);
                        }}
                        onWheel={(e) => e.target.blur()}
                        className="w-16 border border-gray-200 rounded px-2 py-1 text-center text-sm font-mono text-rose-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Basic Pay */}
                    <td className="py-3.5 px-3 text-right">
                      {row.basicPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Allowance */}
                    <td className="py-3.5 px-3 text-right">
                      {row.allowance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Compensation */}
                    <td className="py-3.5 px-3 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.compensation ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          handleCellChange(row.employeeId, "compensation", val);
                        }}
                        onWheel={(e) => e.target.blur()}
                        className="w-24 border border-gray-200 rounded px-2 py-1 text-right text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </td>

                    {/* LWP Leave Adjustment */}
                    {activeMode === "Monthly" && (
                      <td className="py-3.5 px-3 text-right text-red-500 font-mono">
                        -{row.leaveAdjustment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}

                    {/* Gross Salary */}
                    <td className="py-3.5 px-3 text-right font-semibold text-green-600 bg-green-50/10 font-mono">
                      {row.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* PF */}
                    <td className="py-3.5 px-3 text-right font-mono text-gray-700">
                      {row.pfDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* ESIC */}
                    <td className="py-3.5 px-3 text-right font-mono text-gray-700">
                      {row.esicDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* EMI */}
                    <td className="py-3.5 px-3 text-right font-mono text-gray-700">
                      {row.emiDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Canteen */}
                    <td className="py-3.5 px-3 text-right font-mono text-gray-700">
                      {row.canteenDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Other Deductions */}
                    <td className="py-3.5 px-3 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.otherDeductions ?? ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, "");
                          handleCellChange(row.employeeId, "otherDeductions", val);
                        }}
                        onWheel={(e) => e.target.blur()}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                    </td>

                    {/* Total Deductions */}
                    <td className="py-3.5 px-3 text-right font-semibold text-red-500 bg-red-50/10 font-mono">
                      {row.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Net Salary */}
                    <td className="py-3.5 px-3 text-right font-bold text-blue-600 bg-blue-50/10 font-mono">
                      {row.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Paid Via (Payment Mode) */}
                    <td className="py-3.5 px-3 text-center">
                      <select
                        value={row.paymentMode || "Cash"}
                        onChange={(e) => handlePaymentModeChange(row.employeeId, e.target.value)}
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <select
                        value={row.status}
                        onChange={(e) => handleStatusChange(row.employeeId, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border focus:outline-none focus:ring-1 focus:ring-blue-500 ${row.status === "Paid"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : row.status === "Processed"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Processed">Processed</option>
                        <option value="Paid">Paid</option>
                      </select>
                    </td>

                    {/* Remarks */}
                    <td className="py-3.5 px-3">
                      <input
                        type="text"
                        placeholder="Add remarks..."
                        value={row.remarks || ""}
                        onChange={(e) => handleRemarksChange(row.employeeId, e.target.value)}
                        className="w-32 border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedRowForPayslip(row);
                            setShowPayslipModal(true);
                          }}
                          title="View Payslip"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPayslipPDF(row)}
                          title="Download Payslip PDF"
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintPayslip(row)}
                          title="Print Payslip"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {(isSavedRun ? displayTotalRecords > 0 : filteredRows.length > 0) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <span>
              Showing <span className="font-semibold text-gray-900">{displayTotalRecords === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-semibold text-gray-900">{endIndex}</span> of{" "}
              <span className="font-semibold text-gray-900">{displayTotalRecords}</span> entries
            </span>
            <div className="flex items-center gap-1.5 ml-4">
              <span className="text-xs text-gray-500">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition-colors ${currentPage === 1
                  ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 px-3 text-xs font-semibold text-gray-700">
              <span>Page</span>
              <span className="text-blue-600 font-bold">{currentPage}</span>
              <span>of</span>
              <span>{totalPages}</span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 transition-colors ${currentPage === totalPages
                  ? "bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Payslip Preview Modal */}
      <PayslipPreviewModal
        isOpen={showPayslipModal}
        onClose={() => setShowPayslipModal(false)}
        payslipData={selectedRowForPayslip}
      />
    </div>
  );
};

export default Payroll;

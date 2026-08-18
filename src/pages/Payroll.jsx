import React, { useState, useEffect, useMemo } from "react";
import {
  Search, Calendar, Clock, Download, Plus, Check, X, FileText,
  BarChart3, CreditCard, Calculator, Filter, Eye, Trash2, Save,
  AlertCircle, ChevronLeft, ChevronRight, User, Settings, ShieldAlert, BadgeInfo, Printer,
  Building2, Info
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../lib/api";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";
import { generatePayslipPDF, generateBulkPayslipsPDF } from "../lib/generatePayslipPDF";
import PayslipPreviewModal from "../components/PayslipPreviewModal";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

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
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [payModeFilter, setPayModeFilter] = useState("All");
  const [companies, setCompanies] = useState([]);

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
  }, [debouncedSearch, departmentFilter, companyFilter, payModeFilter, selectedMonth, activeMode, startDate, endDate]);

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
      const [empRes, salRes, pfRes, esicRes, emiRes, compRes, leavesRes, branchRes] = await Promise.all([
        api.get("/employees"),
        api.get("/salaries?limit=1000"),
        api.get("/pf/payroll"),
        api.get("/esic/payroll"),
        api.get("/emis"),
        api.get("/compensation"),
        api.get("/leaves?limit=10000"),
        api.get("/company-branches").catch(() => ({ data: [] })),
      ]);

      const activeEmps = getArrayData(empRes).filter(e => e.status === "Active");
      setEmployees(activeEmps);
      setSalariesList(getArrayData(salRes));
      setPfDetailsList(getArrayData(pfRes));
      setEsicDetailsList(getArrayData(esicRes));
      setEmisList(getArrayData(emiRes).filter(e => e.status === "Active"));
      setCompanies(getArrayData(branchRes));

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
      if (departmentFilter && departmentFilter !== "All") params.append("department", departmentFilter);
      if (companyFilter && companyFilter !== "All") params.append("branchId", companyFilter);
      if (payModeFilter && payModeFilter !== "All") params.append("payMode", payModeFilter);

      const savedRes = await api.get(`/salaries/payroll?${params.toString()}`);
      const savedList = Array.isArray(savedRes?.data) ? savedRes.data : (Array.isArray(savedRes) ? savedRes : []);
      const totalCount = Number(savedRes?.total ?? (savedRes?.data?.total ?? savedList.length));
      const totalPagesCount = Number(savedRes?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize)));

      setSavedPayrollRuns(savedList);
      setTotalRecords(totalCount);
      setTotalServerPages(totalPagesCount);
    } catch (err) {
      console.error("Error loading payroll page data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollPageData();
  }, [activeMode, selectedMonth, startDate, endDate, currentPage, pageSize, debouncedSearch, departmentFilter, companyFilter, payModeFilter]);

  // Helper to compute approved live compensation & OT hours for an employee in current period
  const getApprovedCompensationDetails = (empId, monthlyBase) => {
    let compSum = 0;
    let otHoursSum = 0;
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
          const hours = (c.hours !== undefined && c.hours !== null) ? parseFloat(c.hours) : 0;
          otHoursSum += hours;
          if (c.amount !== undefined && c.amount !== null && parseFloat(c.amount) > 0) {
            compAmt = parseFloat(c.amount);
          } else if (hours > 0) {
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
          const hours = (c.hours !== undefined && c.hours !== null) ? parseFloat(c.hours) : 0;
          otHoursSum += hours;
          if (c.amount !== undefined && c.amount !== null && parseFloat(c.amount) > 0) {
            compAmt = parseFloat(c.amount);
          } else if (hours > 0) {
            const hourlyRate = monthlyBase > 0 ? (monthlyBase / 240) * 1.5 : 0;
            compAmt = parseFloat((hours * hourlyRate).toFixed(2));
          }
          compSum += compAmt;
        }
      });
    }
    return {
      compSum: parseFloat(compSum.toFixed(2)),
      otHours: parseFloat(otHoursSum.toFixed(1))
    };
  };

  const getApprovedCompensationAmount = (empId, monthlyBase) => {
    return getApprovedCompensationDetails(empId, monthlyBase).compSum;
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

  // Helper to compute current period days
  const currentPeriodDays = useMemo(() => {
    let days = 30;
    if (activeMode === "Monthly" && selectedMonth) {
      const [yStr, mStr] = selectedMonth.split("-");
      if (yStr && mStr) days = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
    } else if (activeMode === "Daily" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    return days;
  }, [activeMode, selectedMonth, startDate, endDate]);

  // Trigger recalculations when base data or period data updates
  useEffect(() => {
    if (employees.length === 0) return;

    // If we have saved payroll records in the DB for this period, load them directly.
    if (savedPayrollRuns.length > 0) {
      const rows = savedPayrollRuns.map(run => {
        const empRecord = employeeById.get(Number(run.employeeId)) || {};
        const salRecord = salaryByEmployeeId.get(Number(run.employeeId)) || {};
        const pfRecord = pfByEmployeeId.get(Number(run.employeeId)) || {};
        const esicRecord = esicByEmployeeId.get(Number(run.employeeId)) || {};

        const monthlyBase = Number(salRecord.baseSalary || run.basicPay || 0);
        const { compSum: liveComp, otHours: liveOtHrs } = getApprovedCompensationDetails(run.employeeId, monthlyBase);

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
        const earnBasic = basicPay;
        const earnAllowance = allowance;
        const totalEarn = parseFloat((earnBasic + earnAllowance).toFixed(2));
        const otAmount = (run.status === "Draft" || parseFloat(run.otAmount || 0) < finalComp)
          ? finalComp
          : parseFloat(run.otAmount || 0);
        const finalOtHrs = (run.status === "Draft" || parseFloat(run.otHrs || 0) < liveOtHrs)
          ? liveOtHrs
          : parseFloat(run.otHrs || 0);
        const grossSalary = parseFloat((totalEarn + otAmount).toFixed(2));
        const epfWages = Math.min(15000, earnBasic);

        const pfDeduction = parseFloat(run.pfDeduction || 0);
        const lwfDeduction = parseFloat(run.lwfDeduction || 0);
        const esicDeduction = parseFloat(run.esicDeduction || 0);
        const emiDeduction = parseFloat(run.emiDeduction || 0);
        const leaveAdjustment = parseFloat(run.leaveAdjustment || 0);
        const otherDeductions = parseFloat(run.otherDeductions || 0);

        const totalDeductions = parseFloat(
          (pfDeduction + lwfDeduction + esicDeduction + emiDeduction + finalCanteen + leaveAdjustment + otherDeductions).toFixed(2)
        );
        const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));
        const diwaliBonus = parseFloat(run.diwaliBonus || 0);
        const netPayAmount = parseFloat((netSalary + diwaliBonus).toFixed(2));

        const paidDays = parseFloat(run.daysWorked != null ? run.daysWorked : 30);
        
        // Compute absentDays from attendance records or fallback
        const empAtt = attendanceByEmployeeId.get(Number(run.employeeId)) || [];
        let absentDays = 0;
        if (empAtt.length > 0) {
          const presentLogs = empAtt.filter(a => a.status === "Present" || a.punchIn || a.firstCheckIn);
          const presentDates = new Set(
            presentLogs.map(a => {
              const d = a.workDate || a.date || a.attendanceDate || '';
              return typeof d === 'string' ? d.slice(0, 10) : (d ? new Date(d).toISOString().slice(0, 10) : '');
            })
          );
          presentDates.delete('');
          const absentLogs = empAtt.filter(a => a.status === "Absent");
          const absentDates = new Set(
            absentLogs.map(a => {
              const d = a.workDate || a.date || a.attendanceDate || '';
              return typeof d === 'string' ? d.slice(0, 10) : (d ? new Date(d).toISOString().slice(0, 10) : '');
            })
          );
          absentDates.delete('');
          for (const p of presentDates) absentDates.delete(p);
          absentDays = absentDates.size;
        } else {
          absentDays = Math.max(0, currentPeriodDays - paidDays);
        }

        return {
          ...run,
          branchName: run.branchName || empRecord?.branchName || "—",
          branchAddress: run.branchAddress || empRecord?.branchAddress || "",
          paymentMode: (run.paymentMode || empRecord?.payMode || "CASH").toUpperCase().includes("BANK") ? "BANK" : "CASH",
          bankAccountNo: empRecord?.bankAccountNo || "—",
          ifscCode: empRecord?.ifscCode || "—",
          uanNo: pfRecord.uanNo || empRecord.pfNo || empRecord.uanNo || "—",
          ipNo: esicRecord.esicNumber || esicRecord.ipNo || empRecord.esicNo || empRecord.ipNo || "—",
          periodDays: currentPeriodDays,
          daysWorked: paidDays,
          paidLeaves: 0,
          unpaidLeaves: absentDays,
          basicRate: monthlyBase,
          earnBasic,
          allowanceRate: monthlyAllowance,
          earnAllowance,
          totalEarn,
          basicPay,
          allowance,
          compensation: finalComp,
          otAmount,
          otHrs: finalOtHrs,
          leaveAdjustment,
          grossSalary,
          epfWages,
          pfDeduction,
          lwfDeduction,
          esicDeduction,
          emiDeduction,
          canteenDeduction: finalCanteen,
          otherDeductions,
          totalDeductions,
          netSalary,
          diwaliBonus,
          netPayAmount,
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
      const daysInPeriod = currentPeriodDays;
      let workedDays = daysInPeriod;

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

      // Attendance integration: Present Days & Unexcused Absences from actual DB records (distinct dates)
      const empAttRecords = attendanceByEmployeeId.get(Number(emp.id)) || [];
      const presentLogs = empAttRecords.filter(a => a.status === "Present" || a.punchIn || a.firstCheckIn);
      const presentDates = new Set(
        presentLogs.map(a => {
          const d = a.workDate || a.date || a.attendanceDate || '';
          return typeof d === 'string' ? d.slice(0, 10) : (d ? new Date(d).toISOString().slice(0, 10) : '');
        })
      );
      presentDates.delete('');
      const presentDaysCount = presentDates.size;

      // Count unexcused absent days from attendance logs (status === "Absent", excluding any date marked present)
      const absentLogs = empAttRecords.filter(a => a.status === "Absent");
      const absentDates = new Set(
        absentLogs.map(a => {
          const d = a.workDate || a.date || a.attendanceDate || '';
          return typeof d === 'string' ? d.slice(0, 10) : (d ? new Date(d).toISOString().slice(0, 10) : '');
        })
      );
      absentDates.delete('');
      for (const pDate of presentDates) {
        absentDates.delete(pDate);
      }
      const unexcusedAbsents = absentDates.size;

      // Total Unpaid Leaves = Approved LWP + Unexcused Absents
      let totalUnpaidLeaves = lwpDays + unexcusedAbsents;

      // If attendance logs exist, payableDays is the actual present days + paid leaves:
      let payableDays = 0;
      let absentDays = 0;

      if (empAttRecords.length > 0) {
        payableDays = presentDaysCount + paidLeaveDays;
        absentDays = totalUnpaidLeaves;
      } else {
        // Fallback if attendance logs haven't been recorded for this period:
        totalUnpaidLeaves = lwpDays;
        payableDays = Math.max(0, workedDays - totalUnpaidLeaves);
        absentDays = totalUnpaidLeaves;
      }

      // Calculate base and allowance for period
      let earnBasic = monthlyBase;
      let earnAllowance = monthlyAllowance;

      if (activeMode === "Daily") {
        earnBasic = parseFloat(((monthlyBase / 30) * payableDays).toFixed(2));
        earnAllowance = parseFloat(((monthlyAllowance / 30) * payableDays).toFixed(2));
      } else if (daysInPeriod > 0 && payableDays < daysInPeriod) {
        earnBasic = parseFloat(((monthlyBase / daysInPeriod) * payableDays).toFixed(2));
        earnAllowance = parseFloat(((monthlyAllowance / daysInPeriod) * payableDays).toFixed(2));
      }

      const totalEarn = parseFloat((earnBasic + earnAllowance).toFixed(2));
      let leaveAdjustment = 0;
      if (activeMode === "Monthly" && totalUnpaidLeaves > 0) {
        leaveAdjustment = parseFloat(((monthlyBase / 30) * totalUnpaidLeaves).toFixed(2));
      }

      // Fetch canteen deductions
      const canteenDeduction = getLiveCanteenDeductionForEmployee(emp.id);

      // Fetch approved overtime and special compensation
      const { compSum: compensation, otHours: otHrs } = getApprovedCompensationDetails(emp.id, monthlyBase);
      const otAmount = compensation;

      const grossSalary = parseFloat((totalEarn + compensation + otAmount).toFixed(2));
      const epfWages = Math.min(15000, earnBasic);

      // PF Calculation
      let pfDeduction = 0;
      if (isPfOptedIn) {
        pfDeduction = parseFloat((epfWages * 0.12).toFixed(2));
      }

      // ESIC Calculation
      let esicDeduction = 0;
      if (isEsicOptedIn && (monthlyBase + monthlyAllowance) <= 21000) {
        esicDeduction = parseFloat((grossSalary * 0.0075).toFixed(2));
      }

      // EMI Deduction
      let emiDeduction = monthlyEmi;
      if (activeMode === "Daily") {
        emiDeduction = parseFloat(((monthlyEmi / 30) * workedDays).toFixed(2));
      }

      const lwfDeduction = 0;
      const otherDeductions = 0;
      const totalDeductions = parseFloat(
        (pfDeduction + lwfDeduction + esicDeduction + emiDeduction + canteenDeduction + otherDeductions).toFixed(2)
      );
      const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));
      const diwaliBonus = 0;
      const netPayAmount = parseFloat((netSalary + diwaliBonus).toFixed(2));

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
        periodDays: daysInPeriod,
        daysWorked: payableDays,
        presentDays: presentDaysCount,
        paidLeaves: paidLeaveDays,
        unpaidLeaves: absentDays,
        basicRate: monthlyBase,
        earnBasic,
        allowanceRate: monthlyAllowance,
        earnAllowance,
        totalEarn,
        basicPay: earnBasic,
        allowance: earnAllowance,
        compensation,
        otAmount,
        otHrs,
        leaveAdjustment,
        grossSalary,
        epfWages,
        pfDeduction,
        lwfDeduction,
        esicDeduction,
        emiDeduction,
        canteenDeduction,
        otherDeductions,
        totalDeductions,
        netSalary,
        diwaliBonus,
        netPayAmount,
        status: "Draft",
        paymentMode: (emp.payMode || "CASH").toUpperCase().includes("BANK") ? "BANK" : "CASH",
        bankAccountNo: emp.bankAccountNo || "—",
        ifscCode: emp.ifscCode || "—",
        uanNo: pfRecord ? (pfRecord.uanNo || emp.pfNo || "—") : (emp.pfNo || "—"),
        ipNo: esicRecord ? (esicRecord.esicNumber || esicRecord.ipNo || emp.esicNo || "—") : (emp.esicNo || "—"),
        payDate: todayStr,
        remarks: "",
        isSaved: false
      };
    });

    setPayrollRows(generated);
  }, [employees, salariesList, pfDetailsList, esicDetailsList, emisList, compensationList, canteenData, leavesList, attendanceData, savedPayrollRuns, activeMode, selectedMonth, startDate, endDate, currentPeriodDays]);

  // Recalculates calculated columns on input overrides
  const handleCellChange = (empId, field, val) => {
    setPayrollRows(prevRows =>
      prevRows.map(row => {
        if (row.employeeId !== empId) return row;

        const numVal = parseFloat(val) || 0;
        const updatedRow = { ...row, [field]: numVal };

        const periodDays = row.periodDays || currentPeriodDays || 30;
        const basicRate = Number(row.basicRate || row.basicPay || 0);
        const allowanceRate = Number(row.allowanceRate || row.allowance || 0);

        if (field === "daysWorked") {
          updatedRow.daysWorked = numVal;
          updatedRow.unpaidLeaves = Math.max(0, periodDays - numVal);
        } else if (field === "unpaidLeaves") {
          updatedRow.unpaidLeaves = numVal;
          updatedRow.daysWorked = Math.max(0, periodDays - numVal);
        }

        const pDays = updatedRow.daysWorked != null ? updatedRow.daysWorked : (periodDays - (updatedRow.unpaidLeaves || 0));
        let earnBasic = basicRate;
        let earnAllowance = allowanceRate;
        if (activeMode === "Daily") {
          earnBasic = parseFloat(((basicRate / 30) * pDays).toFixed(2));
          earnAllowance = parseFloat(((allowanceRate / 30) * pDays).toFixed(2));
        } else if (periodDays > 0 && pDays < periodDays) {
          earnBasic = parseFloat(((basicRate / periodDays) * pDays).toFixed(2));
          earnAllowance = parseFloat(((allowanceRate / periodDays) * pDays).toFixed(2));
        }

        updatedRow.earnBasic = earnBasic;
        updatedRow.basicPay = earnBasic;
        updatedRow.earnAllowance = earnAllowance;
        updatedRow.allowance = earnAllowance;
        updatedRow.totalEarn = parseFloat((earnBasic + earnAllowance).toFixed(2));

        const washingAll = updatedRow.compensation !== undefined ? updatedRow.compensation : (row.compensation || 0);
        const otAmount = updatedRow.otAmount !== undefined ? updatedRow.otAmount : (row.otAmount || 0);
        const grossSalary = parseFloat((updatedRow.totalEarn + washingAll + otAmount).toFixed(2));
        updatedRow.grossSalary = grossSalary;

        const epfWages = Math.min(15000, earnBasic);
        updatedRow.epfWages = epfWages;

        // PF Deduction
        const pfRecord = pfByEmployeeId.get(Number(empId));
        const isPfOptedIn = pfRecord ? pfRecord.isOptedIn : (basicRate <= 15000);
        if (isPfOptedIn) {
          updatedRow.pfDeduction = parseFloat((epfWages * 0.12).toFixed(2));
        }

        // ESIC Deduction
        const esicRecord = esicByEmployeeId.get(Number(empId));
        const isEsicOptedIn = esicRecord ? esicRecord.isOptedIn : ((basicRate + allowanceRate) <= 21000);
        if (isEsicOptedIn && (basicRate + allowanceRate) <= 21000) {
          updatedRow.esicDeduction = parseFloat((grossSalary * 0.0075).toFixed(2));
        }

        // Daily EMI Pro-rate
        if (activeMode === "Daily") {
          const employeeEmis = activeEmiByEmployeeId.get(Number(empId)) || [];
          const activeEmis = employeeEmis.filter(e => e.status === "Active");
          const monthlyEmi = activeEmis.reduce((sum, item) => sum + parseFloat(item.emiAmount), 0);
          updatedRow.emiDeduction = parseFloat(((monthlyEmi / 30) * pDays).toFixed(2));
        }

        const pfDeduction = updatedRow.pfDeduction || 0;
        const lwfDeduction = updatedRow.lwfDeduction || 0;
        const esicDeduction = updatedRow.esicDeduction || 0;
        const emiDeduction = updatedRow.emiDeduction || 0;
        const penalty = updatedRow.otherDeductions !== undefined ? updatedRow.otherDeductions : (row.otherDeductions || 0);
        const canteen = updatedRow.canteenDeduction || 0;

        const totalDeductions = parseFloat(
          (pfDeduction + lwfDeduction + esicDeduction + emiDeduction + penalty + canteen).toFixed(2)
        );
        updatedRow.totalDeductions = totalDeductions;

        const netSalary = parseFloat(Math.max(0, grossSalary - totalDeductions).toFixed(2));
        updatedRow.netSalary = netSalary;

        const diwaliBonus = updatedRow.diwaliBonus !== undefined ? updatedRow.diwaliBonus : (row.diwaliBonus || 0);
        updatedRow.netPayAmount = parseFloat((netSalary + diwaliBonus).toFixed(2));

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
        if (departmentFilter && departmentFilter !== "All") params.append("department", departmentFilter);
        if (companyFilter && companyFilter !== "All") params.append("branchId", companyFilter);
        if (payModeFilter && payModeFilter !== "All") params.append("payMode", payModeFilter);

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

  // Helper to format dynamic month/period label
  const getDynamicPeriodLabel = () => {
    if (activeMode === "Monthly" && selectedMonth) {
      const [y, m] = selectedMonth.split("-");
      if (y && m) {
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const mName = monthNames[parseInt(m, 10) - 1] || m;
        return `${mName}. -${y}`;
      }
      return selectedMonth;
    }
    return `${startDate} to ${endDate}`;
  };

  // Export: Directly loads and fills data into the provided Payroll Formate.xlsx template using ExcelJS
  const handleExportCSV = async () => {
    const toastId = toast.loading("Generating Excel export from Payroll Formate template...");
    try {
      const period = activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`;

      // 1. Get payroll rows — includes both saved AND draft calculations shown on screen
      const rows = await getExportRows();
      if (!rows || !rows.length) {
        toast.dismiss(toastId);
        toast.error("No payroll data to export for the selected period.");
        return;
      }

      // 2. Fetch the exact provided template file (first from static public, then API fallback)
      let templateBuf = null;
      try {
        const staticRes = await fetch("/payroll_template.xlsx");
        if (staticRes.ok) {
          const ab = await staticRes.arrayBuffer();
          const u8 = new Uint8Array(ab);
          if (u8.length > 4 && u8[0] === 0x50 && u8[1] === 0x4b) {
            templateBuf = ab;
          }
        }
      } catch (e) {
        console.warn("Public template fetch error:", e);
      }

      if (!templateBuf) {
        try {
          const templateRes = await api.get("/salaries/template", { responseType: "arraybuffer" });
          if (templateRes.data) {
            templateBuf = templateRes.data;
          }
        } catch (e) {
          console.warn("API template fetch error:", e);
        }
      }

      if (!templateBuf) {
        toast.dismiss(toastId);
        toast.error("Failed to load Payroll Formate template.");
        return;
      }

      // 3. Load the workbook with ExcelJS (preserves all cell styles, borders, fonts, and full merges)
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(templateBuf);
      const ws = wb.getWorksheet("POWER") || wb.worksheets[0];

      // 4. Center top 2 title lines across the table width
      const periodSubtitle = activeMode === "Monthly"
        ? `Salary Register For Month : ${getDynamicPeriodLabel()}`
        : `Salary Register For Period : ${getDynamicPeriodLabel()}`;

      const cellA1 = ws.getCell("A1");
      cellA1.alignment = { horizontal: "center", vertical: "middle" };

      const cellA2 = ws.getCell("A2");
      cellA2.value = periodSubtitle;
      cellA2.alignment = { horizontal: "center", vertical: "middle" };

      // Ensure merges exist for A1:AF1, A2:AF2, and S3:Y3
      try { ws.mergeCells("A1:AF1"); } catch (e) {}
      try { ws.mergeCells("A2:AF2"); } catch (e) {}
      try { ws.mergeCells("S3:Y3"); } catch (e) {}

      // Unmerge any old hardcoded template summary row (e.g. A123:E123)
      try { ws.unMergeCells("A123:E123"); } catch (e) {}

      // 5. Calculate total days in period
      let periodDays = 30;
      if (activeMode === "Monthly" && selectedMonth) {
        const [yStr, mStr] = selectedMonth.split("-");
        if (yStr && mStr) periodDays = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
      }

      // 6. Clear dummy/old rows from row 5 to 500
      for (let r = 5; r <= 500; r++) {
        const row = ws.getRow(r);
        for (let c = 1; c <= 32; c++) {
          row.getCell(c).value = null;
        }
      }

      const normalBorder = {
        top: { style: "thin", color: { indexed: 64 } },
        left: { style: "thin", color: { indexed: 64 } },
        bottom: { style: "thin", color: { indexed: 64 } },
        right: { style: "thin", color: { indexed: 64 } },
      };

      const startRowIdx = 5; // Row 5 (1-indexed in ExcelJS)
      const columnSums = {}; // For calculating totals across all numeric columns (6 to 28)

      // 7. Populate employee records starting at Row 5 into the provided template
      rows.forEach((row, idx) => {
        const rIdx = idx + startRowIdx;
        const empId = Number(row.employeeId || row.id);
        const empRecord = employeeById.get(empId) || {};
        const salRecord = salaryByEmployeeId.get(empId) || {};

        // Base salary and allowance monthly rates
        const basicRate = Number(salRecord.baseSalary || row.basicSalary || row.baseSalary || empRecord.basicSalary || row.basicPay) || 0;
        const allowanceRate = Number(salRecord.allowanceSalary || row.allowanceSalary || row.allowance) || 0;

        // Days
        const paidDays = Number(row.daysWorked) != null ? Number(row.daysWorked) : (periodDays - (Number(row.unpaidLeaves) || 0));
        const absentDays = Number(row.unpaidLeaves) != null ? Number(row.unpaidLeaves) : Math.max(0, periodDays - paidDays);

        // Pro-rated earned basic and allowances based on paid days
        let earnBasic = basicRate;
        let earnAllowance = allowanceRate;
        if (periodDays > 0 && paidDays < periodDays) {
          earnBasic = Number(((basicRate / periodDays) * paidDays).toFixed(2));
          earnAllowance = Number(((allowanceRate / periodDays) * paidDays).toFixed(2));
        } else if (Number(row.basicPay) > 0 && Number(row.basicPay) !== basicRate) {
          earnBasic = Number(row.basicPay);
        }

        const totalEarn = Number((earnBasic + earnAllowance).toFixed(2));
        const washingAll = Number(row.compensation) || 0;
        const otAmount = Number(row.otAmount) || 0;
        const grossSalary = Number((totalEarn + washingAll + otAmount).toFixed(2));
        const epfWages = Math.min(15000, earnBasic);

        const pfDeduction = Number(row.pfDeduction) || 0;
        const esicDeduction = Number(row.esicDeduction) || 0;
        const emiDeduction = Number(row.emiDeduction) || 0;
        const penalty = Number(row.otherDeductions) || 0;
        const canteen = Number(row.canteenDeduction) || 0;
        const totalDeductions = Number(row.totalDeductions) || Number((pfDeduction + esicDeduction + emiDeduction + penalty + canteen).toFixed(2));
        const netSalary = Number(row.netSalary) || Math.max(0, Number((grossSalary - totalDeductions).toFixed(2)));

        const rowValues = [
          idx + 1,                                                                     // 1: Sr. No.
          row.employeeCode || row.biometricEmployeeCode || empRecord.biometricEmployeeCode || "", // 2: EMPCODE
          row.employeeName || row.candidateName || empRecord.candidateName || "",                 // 3: NAME
          row.pfNo || row.uanNo || empRecord.pfNo || "",                                         // 4: UAN NO.
          row.esicNo || row.ipNo || empRecord.esicNo || "",                                       // 5: IP No.
          periodDays,                                                                  // 6: TOTAL_DAYS
          paidDays,                                                                    // 7: PAID_DAYS
          absentDays,                                                                  // 8: ABSENT_DAYS
          0,                                                                          // 9: OT HRS
          basicRate,                                                                   // 10: BASIC+DA
          earnBasic,                                                                   // 11: EARN BASIC+DA
          allowanceRate,                                                               // 12: ALLOW_RATE(TA,MOB,HRA,CON.)
          earnAllowance,                                                               // 13: EARN ALLOW (TA,MOB,HRA,CON.)
          totalEarn,                                                                   // 14: TOTAL
          washingAll,                                                                  // 15: WASHING ALL.
          otAmount,                                                                    // 16: OT
          grossSalary,                                                                 // 17: GROSS
          epfWages,                                                                    // 18: EPF WAGES
          pfDeduction,                                                                 // 19: PF
          0,                                                                          // 20: LABOUR WELFARE FUND
          esicDeduction,                                                               // 21: ESIC
          emiDeduction,                                                                // 22: ADV
          penalty,                                                                     // 23: Penalty
          canteen,                                                                     // 24: Canteen
          totalDeductions,                                                             // 25: TOTAL DEDUCTION
          netSalary,                                                                   // 26: NET SALARY
          0,                                                                          // 27: Diwali Bonus
          netSalary,                                                                   // 28: NET PAY AMOUNT
          (row.paymentMode || row.payMode || empRecord.payMode || "CASH").toUpperCase().includes("BANK") ? "BANK" : "CASH",               // 29: PAY-MODE
          row.bankAccountNo || empRecord.bankAccountNo || "",                            // 30: BANK A/C NO.
          row.ifscCode || empRecord.ifscCode || "",                                    // AE: IFSC
          row.remarks || "",                                                           // AF: REMARK
        ];

        const excelRow = ws.getRow(rIdx);
        rowValues.forEach((val, cIdx) => {
          const colNum = cIdx + 1;
          const cell = excelRow.getCell(colNum);
          cell.value = val;
          cell.font = { name: "Calibri", size: 9, bold: false };
          cell.alignment = { horizontal: "left", vertical: "middle" };
          cell.border = normalBorder;
          if (typeof val === "number" && colNum >= 6 && colNum <= 28) {
            columnSums[colNum] = (columnSums[colNum] || 0) + val;
          }
        });
        excelRow.commit();
      });

      // 8. Place the dynamic TOTAL row at the very bottom of the data
      const totalRowIdx = startRowIdx + rows.length;
      try { ws.mergeCells(`A${totalRowIdx}:E${totalRowIdx}`); } catch (e) {}

      const totalRow = ws.getRow(totalRowIdx);
      for (let c = 1; c <= 32; c++) {
        const cell = totalRow.getCell(c);
        cell.border = normalBorder;
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
      const cellTotalLabel = totalRow.getCell(1);
      cellTotalLabel.value = "TOTAL";
      cellTotalLabel.alignment = { horizontal: "center", vertical: "middle" };
      cellTotalLabel.font = { bold: true };

      // Set numeric sum totals in bold
      for (let c = 6; c <= 28; c++) {
        const sumVal = columnSums[c] !== undefined ? columnSums[c] : null;
        const cell = totalRow.getCell(c);
        cell.value = sumVal !== null ? (Number.isInteger(sumVal) ? sumVal : Number(sumVal.toFixed(2))) : null;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
      totalRow.commit();

      // 9. Download the exact populated Excel spreadsheet with full preserved styles & centered titles
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payroll_Register_${activeMode}_${period}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success(`Exported ${rows.length} rows with bottom TOTAL row!`);
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Export error:", err);
      toast.error("Export failed: " + (err?.message || "Unknown error"));
    }
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

  // Filter rows based on search term, department, company, and payMode
  const filteredRows = useMemo(() => {
    if (isSavedRun) {
      return payrollRows; // Already filtered & paginated by server
    }
    return payrollRows.filter(row => {
      const matchesSearch =
        !searchTerm ||
        (row.employeeName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (row.employeeCode || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        !departmentFilter || departmentFilter === "All" || row.department === departmentFilter;

      const matchesCompany =
        !companyFilter || companyFilter === "All" ||
        String(row.branchId) === String(companyFilter) ||
        row.branchName === companyFilter;

      const matchesPayMode =
        !payModeFilter || payModeFilter === "All" ||
        (row.paymentMode || "").toUpperCase() === payModeFilter.toUpperCase() ||
        (row.payMode || "").toUpperCase() === payModeFilter.toUpperCase();

      return matchesSearch && matchesDept && matchesCompany && matchesPayMode;
    });
  }, [isSavedRun, payrollRows, searchTerm, departmentFilter, companyFilter, payModeFilter]);

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

  // Summary Totals calculated across paginatedRows (current visible page) or filteredRows
  const summaryTotals = useMemo(() => {
    const list = paginatedRows;
    const totals = {
      paidDays: 0,
      absentDays: 0,
      otHrs: 0,
      basicRate: 0,
      earnBasic: 0,
      allowanceRate: 0,
      earnAllowance: 0,
      totalEarn: 0,
      washingAll: 0,
      otAmount: 0,
      grossSalary: 0,
      epfWages: 0,
      pfDeduction: 0,
      lwfDeduction: 0,
      esicDeduction: 0,
      emiDeduction: 0,
      otherDeductions: 0,
      canteenDeduction: 0,
      totalDeductions: 0,
      netSalary: 0,
      diwaliBonus: 0,
      netPayAmount: 0,
    };

    list.forEach(r => {
      totals.paidDays += Number(r.daysWorked || 0);
      totals.absentDays += Number(r.unpaidLeaves || 0);
      totals.otHrs += Number(r.otHrs || 0);
      totals.basicRate += Number(r.basicRate || r.basicPay || 0);
      totals.earnBasic += Number(r.earnBasic || r.basicPay || 0);
      totals.allowanceRate += Number(r.allowanceRate || r.allowance || 0);
      totals.earnAllowance += Number(r.earnAllowance || r.allowance || 0);
      totals.totalEarn += Number(r.totalEarn || ((r.earnBasic || r.basicPay || 0) + (r.earnAllowance || r.allowance || 0)));
      totals.washingAll += Number(r.compensation || 0);
      totals.otAmount += Number(r.otAmount || 0);
      totals.grossSalary += Number(r.grossSalary || 0);
      totals.epfWages += Number(r.epfWages || Math.min(15000, r.earnBasic || r.basicPay || 0));
      totals.pfDeduction += Number(r.pfDeduction || 0);
      totals.lwfDeduction += Number(r.lwfDeduction || 0);
      totals.esicDeduction += Number(r.esicDeduction || 0);
      totals.emiDeduction += Number(r.emiDeduction || 0);
      totals.otherDeductions += Number(r.otherDeductions || 0);
      totals.canteenDeduction += Number(r.canteenDeduction || 0);
      totals.totalDeductions += Number(r.totalDeductions || 0);
      totals.netSalary += Number(r.netSalary || 0);
      totals.diwaliBonus += Number(r.diwaliBonus || 0);
      totals.netPayAmount += Number(r.netPayAmount || r.netSalary || 0);
    });

    return totals;
  }, [paginatedRows]);

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

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
            >
              <Download size={16} />
              Export Excel (Payroll Formate)
            </button>
            {/* Export Summary PDF - Commented out for now
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm"
            >
              <FileText size={16} />
              Export Summary PDF
            </button>
            */}
            {/* Bulk Payslips PDF - Commented out for now
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
            */}
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

          {/* Status Info Badge below the action buttons */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50/90 px-3 py-1 rounded-lg border border-blue-100 shadow-sm">
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>
              {isSavedRun
                ? "Showing SAVED payroll run from database."
                : "Showing DRAFT calculation. Click 'Save Payroll Run' to save."}
            </span>
          </div>
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

        {/* Search & Multi-Filters Toolbar */}
        <div className="space-y-3">
          {/* Row 1: Full-width Search */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search employee by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          </div>

          {/* Row 2: Company, Pay Mode, Department - 3 Equal Balanced Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            {/* Company Filter Dropdown */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <Building2 size={16} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 shrink-0">Company:</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Companies</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PAYMODE Filter Dropdown */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <CreditCard size={16} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 shrink-0">Pay Mode:</span>
              <select
                value={payModeFilter}
                onChange={(e) => setPayModeFilter(e.target.value)}
                className="w-full bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Pay Modes</option>
                <option value="BANK">Bank</option>
                <option value="CASH">Cash</option>
              </select>
            </div>

            {/* Department Filter Dropdown */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3.5 py-2 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
              <Filter size={16} className="text-gray-500 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 shrink-0">Department:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full bg-transparent border-0 text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer truncate"
              >
                <option value="All">All Departments</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
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
            {activeMode === "Monthly" ? (
              /* MONTHLY MODE: 32 Statutory Columns matching Payroll Formate.xlsx */
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 shadow-sm border-b border-gray-300">
                  {/* Row 1: Main Headers + Grouped DEDUCTION */}
                  <tr className="bg-slate-100/90 border-b border-gray-300 text-xs font-bold text-gray-700 uppercase tracking-wider select-none">
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-100 z-20 border-r border-gray-200 min-w-[55px]">Sr. No.</th>
                    <th rowSpan={2} className="py-3 px-3 text-left sticky top-0 bg-slate-100 z-20 border-r border-gray-200 min-w-[100px]">EMPCODE</th>
                    <th rowSpan={2} className="py-3 px-4 text-left sticky top-0 bg-slate-100 z-20 border-r border-gray-200 min-w-[180px]">NAME</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[120px]">UAN NO.</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[120px]">IP No.</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[90px]">TOTAL_DAYS</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-blue-50 text-blue-900 z-20 border-r border-blue-200 min-w-[90px]">PAID_DAYS</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-rose-50 text-rose-900 z-20 border-r border-rose-200 min-w-[95px]">ABSENT_DAYS</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[75px]">OT HRS</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[105px]">BASIC+DA</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[110px]">EARN BASIC+DA</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[140px]">ALLOW_RATE</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[120px]">EARN ALLOW</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-100 z-20 border-r border-gray-200 min-w-[110px] font-extrabold text-gray-900">TOTAL</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[110px]">WASHING ALL.</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[80px]">OT</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-emerald-50 text-emerald-900 z-20 border-r border-emerald-200 min-w-[120px] font-extrabold">GROSS</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[110px]">EPF WAGES</th>

                    {/* DEDUCTION Grouped Header */}
                    <th colSpan={7} className="py-2 px-3 text-center sticky top-0 bg-rose-100/90 text-rose-900 font-extrabold tracking-wider z-20 border-r border-b border-rose-200 uppercase">
                      DEDUCTION
                    </th>

                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-blue-50 text-blue-900 z-20 border-r border-blue-200 min-w-[120px] font-bold">NET SALARY</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-amber-50 text-amber-900 z-20 border-r border-amber-200 min-w-[110px]">Diwali Bonus</th>
                    <th rowSpan={2} className="py-3 px-3 text-right sticky top-0 bg-emerald-100 text-emerald-950 z-20 border-r border-emerald-300 min-w-[130px] font-extrabold">NET PAY AMOUNT</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[110px]">PAY-MODE</th>
                    <th rowSpan={2} className="py-3 px-3 text-left sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[140px]">BANK A/C NO.</th>
                    <th rowSpan={2} className="py-3 px-3 text-left sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[110px]">IFSC</th>
                    <th rowSpan={2} className="py-3 px-3 text-left sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[130px]">REMARK</th>
                    <th rowSpan={2} className="py-3 px-3 text-center sticky top-0 bg-slate-50 z-20 border-r border-gray-200 min-w-[100px]">STATUS</th>
                    <th rowSpan={2} className="py-3 px-4 text-center sticky top-0 bg-slate-100 z-20 border-b border-gray-200 min-w-[105px]">ACTIONS</th>
                  </tr>

                  {/* Row 2: Sub-headers for DEDUCTION Columns */}
                  <tr className="bg-rose-50/80 border-b border-gray-300 text-xs font-bold text-rose-800 uppercase tracking-wider select-none">
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[90px]">PF</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[140px]">LABOUR WELFARE FUND</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[90px]">ESIC</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[90px]">ADV</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[90px]">Penalty</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-50/90 text-rose-800 z-20 border-r border-gray-200 min-w-[90px]">Canteen</th>
                    <th className="py-2 px-3 text-right sticky top-[37px] bg-rose-100 text-rose-950 font-extrabold z-20 border-r border-gray-200 min-w-[125px]">TOTAL DEDUCTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedRows.map((row, index) => (
                    <tr key={row.employeeId} className="hover:bg-blue-50/30 transition-colors group">
                      {/* 1. Sr. No. */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-100 text-xs font-mono text-gray-500">
                        {startIndex + index + 1}
                      </td>

                      {/* 2. EMPCODE */}
                      <td className="py-2.5 px-3 border-r border-gray-100">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                          {row.employeeCode}
                        </span>
                      </td>

                      {/* 3. NAME */}
                      <td className="py-2.5 px-4 border-r border-gray-100">
                        <div className="font-semibold text-gray-900 text-sm whitespace-nowrap">{row.employeeName}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <span>{row.department}</span>
                          {row.branchName && row.branchName !== "—" && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">{row.branchName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 4. UAN NO. */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {row.uanNo || "—"}
                      </td>

                      {/* 5. IP No. */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {row.ipNo || "—"}
                      </td>

                      {/* 6. TOTAL_DAYS */}
                      <td className="py-2.5 px-3 text-center font-semibold text-xs text-gray-700 border-r border-gray-100">
                        {row.periodDays || currentPeriodDays}
                      </td>

                      {/* 7. PAID_DAYS */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.daysWorked ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "daysWorked", val);
                          }}
                          className="w-14 border border-blue-200 bg-blue-50/30 rounded px-1.5 py-0.5 text-center text-xs font-semibold font-mono text-blue-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* 8. ABSENT_DAYS */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.unpaidLeaves ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "unpaidLeaves", val);
                          }}
                          className="w-14 border border-rose-200 bg-rose-50/30 rounded px-1.5 py-0.5 text-center text-xs font-semibold font-mono text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>

                      {/* 9. OT HRS */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs text-gray-600 border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.otHrs ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "otHrs", val);
                          }}
                          className="w-12 border border-gray-200 rounded px-1 py-0.5 text-center text-xs font-mono text-gray-700 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* 10. BASIC+DA */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 border-r border-gray-100">
                        {(Number(row.basicRate || row.basicPay || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 11. EARN BASIC+DA */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-900 font-medium border-r border-gray-100">
                        {(Number(row.earnBasic || row.basicPay || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 12. ALLOW_RATE */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 border-r border-gray-100">
                        {(Number(row.allowanceRate || row.allowance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 13. EARN ALLOW */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-900 font-medium border-r border-gray-100">
                        {(Number(row.earnAllowance || row.allowance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 14. TOTAL */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-gray-900 bg-slate-50/50 border-r border-gray-100">
                        {(Number(row.totalEarn || ((row.earnBasic || row.basicPay || 0) + (row.earnAllowance || row.allowance || 0)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 15. WASHING ALL. */}
                      <td className="py-2.5 px-3 text-right border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.compensation ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "compensation", val);
                          }}
                          className="w-20 border border-gray-200 rounded px-1.5 py-0.5 text-right text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* 16. OT */}
                      <td className="py-2.5 px-3 text-right border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.otAmount ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "otAmount", val);
                          }}
                          className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-right text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* 17. GROSS */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-emerald-800 bg-emerald-50/30 border-r border-emerald-100">
                        {(Number(row.grossSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 18. EPF WAGES */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-700 border-r border-gray-100">
                        {(Number(row.epfWages || Math.min(15000, row.earnBasic || row.basicPay || 0))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 19. PF */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-700 border-r border-gray-100">
                        {(Number(row.pfDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 20. LABOUR WELFARE FUND */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-600 border-r border-gray-100">
                        {(Number(row.lwfDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 21. ESIC */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-700 border-r border-gray-100">
                        {(Number(row.esicDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 22. ADV */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-700 border-r border-gray-100">
                        {(Number(row.emiDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 23. Penalty */}
                      <td className="py-2.5 px-3 text-right border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.otherDeductions ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "otherDeductions", val);
                          }}
                          className="w-16 border border-rose-200 rounded px-1.5 py-0.5 text-right text-xs font-mono text-rose-700 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>

                      {/* 24. Canteen */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs text-rose-700 border-r border-gray-100">
                        {(Number(row.canteenDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 25. TOTAL DEDUCTION */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-rose-800 bg-rose-50/40 border-r border-rose-100">
                        {(Number(row.totalDeductions || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 26. NET SALARY */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-blue-800 bg-blue-50/30 border-r border-blue-100">
                        {(Number(row.netSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 27. Diwali Bonus */}
                      <td className="py-2.5 px-3 text-right border-r border-gray-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.diwaliBonus ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "diwaliBonus", val);
                          }}
                          className="w-16 border border-amber-200 bg-amber-50/30 rounded px-1.5 py-0.5 text-right text-xs font-mono text-amber-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                        />
                      </td>

                      {/* 28. NET PAY AMOUNT */}
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-extrabold text-emerald-950 bg-emerald-100/50 border-r border-emerald-200">
                        {(Number(row.netPayAmount || row.netSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 29. PAY-MODE */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-100 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          ((row.paymentMode || row.payMode || "CASH").toUpperCase().includes("BANK"))
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {((row.paymentMode || row.payMode || "CASH").toUpperCase().includes("BANK")) ? "BANK" : "CASH"}
                        </span>
                      </td>

                      {/* 30. BANK A/C NO. */}
                      <td className="py-2.5 px-3 text-left font-mono text-xs text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {row.bankAccountNo || "—"}
                      </td>

                      {/* 31. IFSC */}
                      <td className="py-2.5 px-3 text-left font-mono text-xs text-gray-600 border-r border-gray-100 whitespace-nowrap">
                        {row.ifscCode || "—"}
                      </td>

                      {/* 32. REMARK */}
                      <td className="py-2.5 px-3 border-r border-gray-100">
                        <input
                          type="text"
                          placeholder="Remark..."
                          value={row.remarks || ""}
                          onChange={(e) => handleRemarksChange(row.employeeId, e.target.value)}
                          className="w-24 border border-gray-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* 33. STATUS */}
                      <td className="py-2.5 px-3 text-center border-r border-gray-100">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.employeeId, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            row.status === "Paid"
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

                      {/* 34. ACTIONS */}
                      <td className="py-2.5 px-4 text-center border-r border-gray-100 min-w-[105px]">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedRowForPayslip(row);
                              setShowPayslipModal(true);
                            }}
                            title="View Payslip"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDownloadPayslipPDF(row)}
                            title="Download Payslip PDF"
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handlePrintPayslip(row)}
                            title="Print Payslip"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* DAILY MODE: Original Table Format */
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 shadow-sm border-b border-gray-200">
                  <tr className="bg-gray-50/90 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none">
                    <th className="py-3 px-4 text-left">Emp Details</th>
                    <th className="py-3 px-3 text-center">Payable Days</th>
                    <th className="py-3 px-3 text-center">Paid Leaves</th>
                    <th className="py-3 px-3 text-center">Absent</th>
                    <th className="py-3 px-3 text-right">Basic Pay (₹)</th>
                    <th className="py-3 px-3 text-right">Allowance (₹)</th>
                    <th className="py-3 px-3 text-right">OT & Comp (₹)</th>
                    <th className="py-3 px-3 text-right">LWP Adjust (₹)</th>
                    <th className="py-3 px-3 text-right font-bold text-gray-700">Gross Salary (₹)</th>
                    <th className="py-3 px-3 text-right">PF (₹)</th>
                    <th className="py-3 px-3 text-right">ESIC (₹)</th>
                    <th className="py-3 px-3 text-right">EMI (₹)</th>
                    <th className="py-3 px-3 text-right">Canteen (₹)</th>
                    <th className="py-3 px-3 text-right">Other Deduct (₹)</th>
                    <th className="py-3 px-3 text-right font-bold text-rose-600">Total Deduct (₹)</th>
                    <th className="py-3 px-3 text-right font-bold text-green-600">Net Salary (₹)</th>
                    <th className="py-3 px-3 text-center">Paid Via</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-left">Remarks</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedRows.map((row) => (
                    <tr key={row.employeeId} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Emp Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {row.employeeCode}
                          </span>
                          <span className="font-semibold text-gray-900">{row.employeeName}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <span>{row.department}</span>
                          {row.branchName && row.branchName !== "—" && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 font-medium">{row.branchName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Payable Days */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.daysWorked ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "daysWorked", val);
                          }}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Paid Leaves */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          {row.paidLeaves ?? 0}
                        </span>
                      </td>

                      {/* Absent */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.unpaidLeaves ?? ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "unpaidLeaves", val);
                          }}
                          className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-center font-mono text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>

                      {/* Basic Pay */}
                      <td className="py-3 px-3 text-right font-mono">
                        {(Number(row.earnBasic || row.basicPay || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Allowance */}
                      <td className="py-3 px-3 text-right font-mono">
                        {(Number(row.earnAllowance || row.allowance || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* OT & Comp */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.compensation ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "compensation", val);
                          }}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* LWP Adjust */}
                      <td className="py-3 px-3 text-right font-mono text-rose-500">
                        {Number(row.leaveAdjustment || 0) > 0 ? `-${(Number(row.leaveAdjustment)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00"}
                      </td>

                      {/* Gross Salary */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                        {(Number(row.grossSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* PF */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {(Number(row.pfDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* ESIC */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {(Number(row.esicDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* EMI */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {(Number(row.emiDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Canteen */}
                      <td className="py-3 px-3 text-right font-mono text-rose-600">
                        {(Number(row.canteenDeduction || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Other Deduct */}
                      <td className="py-3 px-3 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={row.otherDeductions ?? 0}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, "");
                            handleCellChange(row.employeeId, "otherDeductions", val);
                          }}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right font-mono text-rose-600 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>

                      {/* Total Deduct */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                        {(Number(row.totalDeductions || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Net Salary */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-green-600">
                        {(Number(row.netSalary || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Paid Via */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          ((row.paymentMode || row.payMode || "CASH").toUpperCase().includes("BANK"))
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {((row.paymentMode || row.payMode || "CASH").toUpperCase().includes("BANK")) ? "BANK" : "CASH"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={row.status}
                          onChange={(e) => handleStatusChange(row.employeeId, e.target.value)}
                          className={`text-xs font-bold px-2 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            row.status === "Paid"
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
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          placeholder="Remark..."
                          value={row.remarks || ""}
                          onChange={(e) => handleRemarksChange(row.employeeId, e.target.value)}
                          className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedRowForPayslip(row);
                              setShowPayslipModal(true);
                            }}
                            title="View Payslip"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => handleDownloadPayslipPDF(row)}
                            title="Download Payslip PDF"
                            className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handlePrintPayslip(row)}
                            title="Print Payslip"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

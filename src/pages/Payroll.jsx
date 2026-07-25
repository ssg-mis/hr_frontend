import React, { useState, useEffect } from "react";
import { 
  Search, Calendar, Clock, Download, Plus, Check, X, FileText, 
  BarChart3, CreditCard, Calculator, Filter, Eye, Trash2, Save, 
  AlertCircle, ChevronRight, User, Settings, ShieldAlert, BadgeInfo
} from "lucide-react";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import api from "../lib/api";
import useAuthStore from "../store/authStore";
import toast from "react-hot-toast";

const Payroll = () => {
  const { user, isAdmin, isHR, isHOD } = useAuthStore();
  const [activeMode, setActiveMode] = useState("Monthly"); // "Monthly" | "Daily"
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  
  // Daily date range
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().slice(0, 10)); // 1st of current month
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10)); // Today
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  
  // Raw data from APIs
  const [employees, setEmployees] = useState([]);
  const [salariesList, setSalariesList] = useState([]);
  const [pfDetailsList, setPfDetailsList] = useState([]);
  const [esicDetailsList, setEsicDetailsList] = useState([]);
  const [emisList, setEmisList] = useState([]);
  const [compensationList, setCompensationList] = useState([]);
  const [canteenData, setCanteenData] = useState([]); // Monthly array or Daily logs
  const [leavesList, setLeavesList] = useState([]);
  
  // Calculated & Edited payroll records
  const [payrollRows, setPayrollRows] = useState([]);
  const [savedPayrollRuns, setSavedPayrollRuns] = useState([]);
  
  // Modals / Details
  const [selectedRowForPayslip, setSelectedRowForPayslip] = useState(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  // Load basic configurations
  const loadBaseData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active employees
      const empRes = await api.get("/employees");
      const activeEmps = (empRes.data || []).filter(e => e.status === "Active");
      setEmployees(activeEmps);

      // 2. Fetch salaries
      const salRes = await api.get("/salaries");
      setSalariesList(salRes.data || []);

      // 3. Fetch PF preferences
      const pfRes = await api.get("/pf");
      setPfDetailsList(pfRes.data || []);

      // 4. Fetch ESIC preferences
      const esicRes = await api.get("/esic");
      setEsicDetailsList(esicRes.data || []);

      // 5. Fetch EMIs
      const emiRes = await api.get("/emis");
      setEmisList((emiRes.data || []).filter(e => e.status === "Active"));

      // 6. Fetch approved compensations
      const compRes = await api.get("/compensation?status=Approved");
      setCompensationList(compRes.data || []);

      // 7. Fetch approved leaves for LWP calculations
      const leavesRes = await api.get("/leaves?limit=10000");
      setLeavesList((leavesRes.data || []).filter(l => l.status === "Approved"));

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

  // Fetch canteen deductions and saved runs when month or date range changes
  const loadPeriodSpecificData = async () => {
    setLoading(true);
    try {
      // Fetch saved payrolls for this period and mode
      const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`;
      const savedRes = await api.get(`/salaries/payroll?period=${periodStr}&type=${activeMode}`);
      const savedList = savedRes.data || [];
      setSavedPayrollRuns(savedList);

      // Fetch canteen records
      if (activeMode === "Monthly") {
        const cantRes = await api.get(`/canteen/deductions?month=${selectedMonth}`);
        setCanteenData(cantRes.data || []);
      } else {
        const cantRes = await api.get(`/canteen/logs?startDate=${startDate}&endDate=${endDate}`);
        setCanteenData(cantRes.data || []);
      }
    } catch (err) {
      console.error("Error loading period-specific data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriodSpecificData();
  }, [activeMode, selectedMonth, startDate, endDate]);

  // Trigger recalculations when base data or period data updates
  useEffect(() => {
    if (employees.length === 0) return;

    // If we have saved payroll records in the DB for this period, load them directly.
    if (savedPayrollRuns.length > 0) {
      const rows = savedPayrollRuns.map(run => ({
        ...run,
        // Ensure numeric fields are floating point numbers for frontend input controls
        daysWorked: parseFloat(run.daysWorked),
        basicPay: parseFloat(run.basicPay),
        allowance: parseFloat(run.allowance),
        compensation: parseFloat(run.compensation),
        leaveAdjustment: parseFloat(run.leaveAdjustment),
        grossSalary: parseFloat(run.grossSalary),
        pfDeduction: parseFloat(run.pfDeduction),
        esicDeduction: parseFloat(run.esicDeduction),
        emiDeduction: parseFloat(run.emiDeduction),
        canteenDeduction: parseFloat(run.canteenDeduction),
        otherDeductions: parseFloat(run.otherDeductions),
        totalDeductions: parseFloat(run.totalDeductions),
        netSalary: parseFloat(run.netSalary),
        isSaved: true
      }));
      setPayrollRows(rows);
      return;
    }

    // Otherwise, dynamically generate/calculate the payroll rows
    const generated = employees.map(emp => {
      // Find salary details
      const salRecord = salariesList.find(s => s.employeeId === emp.id);
      const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
      const monthlyAllowance = salRecord ? parseFloat(salRecord.allowanceSalary) : 0;

      // Find PF Settings
      const pfRecord = pfDetailsList.find(p => p.employeeId === emp.id);
      const isPfOptedIn = pfRecord ? pfRecord.isOptedIn : (monthlyBase <= 15000);

      // Find ESIC Settings
      const esicRecord = esicDetailsList.find(e => e.employeeId === emp.id);
      const isEsicOptedIn = esicRecord ? esicRecord.isOptedIn : ((monthlyBase + monthlyAllowance) <= 21000);

      // Find active EMIs
      const activeEmis = emisList.filter(e => e.employeeId === emp.id && e.status === "Active");
      const monthlyEmi = activeEmis.reduce((sum, item) => sum + parseFloat(item.emiAmount), 0);

      // Calculate days in period
      let daysInPeriod = 30;
      let workedDays = 30;
      
      if (activeMode === "Daily") {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        daysInPeriod = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        workedDays = daysInPeriod; // Default to full period worked
      }

      // Calculate leave adjustments (LWP)
      const empLeaves = leavesList.filter(l => l.employeeId === emp.id);
      let lwpDays = 0;

      if (activeMode === "Monthly") {
        const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
        empLeaves.forEach(l => {
          const lStart = new Date(l.startDate);
          const lEnd = new Date(l.endDate);
          
          // Calculate overlaps with the target month
          const firstOfMonth = new Date(yearStr, monthStr - 1, 1);
          const lastOfMonth = new Date(yearStr, monthStr, 0);
          
          const overlapStart = lStart > firstOfMonth ? lStart : firstOfMonth;
          const overlapEnd = lEnd < lastOfMonth ? lEnd : lastOfMonth;

          if (overlapStart <= overlapEnd && (l.leaveCode === "LWP" || l.leaveType?.toLowerCase().includes("without pay"))) {
            const diff = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            lwpDays += Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
          }
        });
      } else {
        // Daily Mode Leave overlap check
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        empLeaves.forEach(l => {
          const lStart = new Date(l.startDate);
          const lEnd = new Date(l.endDate);

          const overlapStart = lStart > rangeStart ? lStart : rangeStart;
          const overlapEnd = lEnd < rangeEnd ? lEnd : rangeEnd;

          if (overlapStart <= overlapEnd && (l.leaveCode === "LWP" || l.leaveType?.toLowerCase().includes("without pay"))) {
            const diff = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            lwpDays += Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
          }
        });
      }

      // Calculate base and allowance for period
      let basicPay = monthlyBase;
      let allowance = monthlyAllowance;
      let leaveAdjustment = 0;

      if (activeMode === "Monthly") {
        // Leave Adjustment deduction for Monthly: (Monthly Base / 30) * LWP days
        leaveAdjustment = lwpDays > 0 ? parseFloat(((monthlyBase / 30) * lwpDays).toFixed(2)) : 0;
      } else {
        // Daily: pro-rate monthly base/allowance based on worked days
        basicPay = parseFloat(((monthlyBase / 30) * workedDays).toFixed(2));
        allowance = parseFloat(((monthlyAllowance / 30) * workedDays).toFixed(2));
        // Daily already represents actual days worked, so no extra LWP deduction needed unless manually adjusted.
        leaveAdjustment = 0;
      }

      // Fetch canteen deductions
      let canteenDeduction = 0;
      if (activeMode === "Monthly") {
        const canteenItem = canteenData.find(c => c.employeeId === emp.id);
        canteenDeduction = canteenItem ? parseFloat(canteenItem.totalDeduction) : 0;
      } else {
        // Filter daily logs in date range
        const empLogs = canteenData.filter(log => log.employeeId === emp.id);
        canteenDeduction = empLogs.reduce((sum, item) => sum + parseFloat(item.price), 0);
      }

      // Fetch approved overtime compensation
      let compensation = 0;
      const empComps = compensationList.filter(c => c.employeeId === emp.id);
      
      if (activeMode === "Monthly") {
        const [yearStr, monthStr] = selectedMonth.split("-").map(Number);
        empComps.forEach(c => {
          const wDate = new Date(c.workDate);
          if (wDate.getFullYear() === yearStr && (wDate.getMonth() + 1) === monthStr) {
            // Overtime conversion: if hours, calculate as: hours * (baseSalary / 240) * 1.5
            const hours = parseFloat(c.hours) || 8;
            compensation += parseFloat((hours * (monthlyBase / 240) * 1.5).toFixed(2));
          }
        });
      } else {
        const rangeStart = new Date(startDate);
        const rangeEnd = new Date(endDate);
        empComps.forEach(c => {
          const wDate = new Date(c.workDate);
          if (wDate >= rangeStart && wDate <= rangeEnd) {
            const hours = parseFloat(c.hours) || 8;
            compensation += parseFloat((hours * (monthlyBase / 240) * 1.5).toFixed(2));
          }
        });
      }

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
        period: activeMode === "Monthly" ? selectedMonth : `${startDate}:${endDate}`,
        type: activeMode,
        daysWorked: workedDays,
        unpaidLeaves: lwpDays,
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
        payDate: new Date().toISOString().slice(0, 10),
        remarks: "",
        isSaved: false
      };
    });

    setPayrollRows(generated);
  }, [employees, salariesList, pfDetailsList, esicDetailsList, emisList, compensationList, canteenData, leavesList, savedPayrollRuns, activeMode, selectedMonth, startDate, endDate]);

  // Recalculates calculated columns on input overrides
  const handleCellChange = (empId, field, val) => {
    setPayrollRows(prevRows => 
      prevRows.map(row => {
        if (row.employeeId !== empId) return row;

        const updatedRow = { ...row, [field]: parseFloat(val) || 0 };

        // If days worked changed, re-calculate basic, allowance, etc.
        if (field === "daysWorked" && activeMode === "Daily") {
          const salRecord = salariesList.find(s => s.employeeId === empId);
          const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
          const monthlyAllowance = salRecord ? parseFloat(salRecord.allowanceSalary) : 0;
          
          updatedRow.basicPay = parseFloat(((monthlyBase / 30) * updatedRow.daysWorked).toFixed(2));
          updatedRow.allowance = parseFloat(((monthlyAllowance / 30) * updatedRow.daysWorked).toFixed(2));
          
          // Re-calculate PF daily
          const pfRecord = pfDetailsList.find(p => p.employeeId === empId);
          const isPfOptedIn = pfRecord ? pfRecord.isOptedIn : (monthlyBase <= 15000);
          if (isPfOptedIn) {
            const capDaily = Math.min(updatedRow.basicPay, 500 * updatedRow.daysWorked);
            updatedRow.pfDeduction = parseFloat((capDaily * 0.12).toFixed(2));
          }

          // Re-calculate ESIC daily
          const esicRecord = esicDetailsList.find(e => e.employeeId === empId);
          const isEsicOptedIn = esicRecord ? esicRecord.isOptedIn : ((monthlyBase + monthlyAllowance) <= 21000);
          if (isEsicOptedIn && (monthlyBase + monthlyAllowance) <= 21000) {
            updatedRow.esicDeduction = parseFloat(((updatedRow.basicPay + updatedRow.allowance) * 0.0075).toFixed(2));
          }

          // Re-calculate EMI daily
          const activeEmis = emisList.filter(e => e.employeeId === empId && e.status === "Active");
          const monthlyEmi = activeEmis.reduce((sum, item) => sum + parseFloat(item.emiAmount), 0);
          updatedRow.emiDeduction = parseFloat(((monthlyEmi / 30) * updatedRow.daysWorked).toFixed(2));
        }

        // Recalculate Leave adjustment if unpaid leaves override is made
        if (field === "unpaidLeaves" && activeMode === "Monthly") {
          const salRecord = salariesList.find(s => s.employeeId === empId);
          const monthlyBase = salRecord ? parseFloat(salRecord.baseSalary) : 0;
          updatedRow.leaveAdjustment = parseFloat(((monthlyBase / 30) * updatedRow.unpaidLeaves).toFixed(2));
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
        payDate: row.payDate,
        remarks: row.remarks
      }));

      const res = await api.post("/salaries/payroll", recordsToSubmit);
      if (res.success) {
        toast.success("Payroll records saved successfully to database!");
        loadPeriodSpecificData(); // Reload from DB
      }
    } catch (err) {
      console.error("Failed to save payroll batch:", err);
      toast.error(err.message || "Failed to save payroll run.");
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel (CSV)
  const handleExportCSV = () => {
    const headers = [
      "Employee Code", "Employee Name", "Department", "Period Type", "Period", 
      "Days Worked", "Unpaid Leaves", "Basic Pay (₹)", "Allowance (₹)", 
      "Compensation (₹)", "LWP Adjustment (₹)", "Gross Salary (₹)", 
      "PF (₹)", "ESIC (₹)", "EMI (₹)", "Canteen (₹)", "Other Deductions (₹)", 
      "Total Deductions (₹)", "Net Salary (₹)", "Status", "Pay Date", "Remarks"
    ];

    const rows = filteredRows.map(row => [
      row.employeeCode, row.employeeName, row.department, row.type, row.period,
      row.daysWorked, row.unpaidLeaves, row.basicPay, row.allowance,
      row.compensation, row.leaveAdjustment, row.grossSalary,
      row.pfDeduction, row.esicDeduction, row.emiDeduction, row.canteenDeduction, row.otherDeductions,
      row.totalDeductions, row.netSalary, row.status, row.payDate, row.remarks
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_export_${activeMode}_${activeMode === "Monthly" ? selectedMonth : `${startDate}_to_${endDate}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text(`HR FMS - ${activeMode} Payroll Sheet`, 14, 15);
    doc.setFontSize(10);
    const periodStr = activeMode === "Monthly" ? selectedMonth : `${startDate} to ${endDate}`;
    doc.text(`Period: ${periodStr}  |  Generated on: ${new Date().toLocaleDateString()}`, 14, 21);

    const tableHeaders = [
      ["Code", "Name", "Dept", "Basic", "Allow.", "OT/Comp", "LWP Ded", "Gross", "PF", "ESIC", "EMI", "Canteen", "Other Ded", "Total Ded", "Net", "Status"]
    ];

    const tableData = filteredRows.map(row => [
      row.employeeCode,
      row.employeeName,
      row.department,
      `Rs.${row.basicPay}`,
      `Rs.${row.allowance}`,
      `Rs.${row.compensation}`,
      `Rs.${row.leaveAdjustment}`,
      `Rs.${row.grossSalary}`,
      `Rs.${row.pfDeduction}`,
      `Rs.${row.esicDeduction}`,
      `Rs.${row.emiDeduction}`,
      `Rs.${row.canteenDeduction}`,
      `Rs.${row.otherDeductions}`,
      `Rs.${row.totalDeductions}`,
      `Rs.${row.netSalary}`,
      row.status
    ]);

    doc.autoTable({
      head: tableHeaders,
      body: tableData,
      startY: 26,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`payroll_sheet_${activeMode}_${periodStr}.pdf`);
  };

  // Generate individual printable PDF payslip
  const handleDownloadPayslipPDF = (row) => {
    const doc = new jsPDF();
    
    // Title & Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("BOTIVATE INTERNSHIP HR", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("Salary Slip / Payslip", 105, 26, { align: "center" });
    doc.text(`Period: ${row.period} (${row.type} Payroll)`, 105, 32, { align: "center" });
    
    // Horizontal Separator
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(14, 38, 196, 38);
    
    // Employee Info Grid
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    
    doc.text("Employee Name:", 14, 46);
    doc.setFont("helvetica", "normal");
    doc.text(row.employeeName, 50, 46);
    
    doc.setFont("helvetica", "bold");
    doc.text("Employee Code:", 110, 46);
    doc.setFont("helvetica", "normal");
    doc.text(row.employeeCode, 150, 46);
    
    doc.setFont("helvetica", "bold");
    doc.text("Department:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(row.department, 50, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("Days Worked:", 110, 52);
    doc.setFont("helvetica", "normal");
    doc.text(String(row.daysWorked), 150, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text("Status:", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(row.status, 50, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Unpaid Leaves:", 110, 58);
    doc.setFont("helvetica", "normal");
    doc.text(String(row.unpaidLeaves), 150, 58);
    
    // Separator
    doc.line(14, 64, 196, 64);
    
    // Earnings & Deductions Table
    const headers = [["Earnings Description", "Amount (Rs.)", "Deductions Description", "Amount (Rs.)"]];
    const body = [
      ["Basic Pay", row.basicPay.toFixed(2), "PF Contribution", row.pfDeduction.toFixed(2)],
      ["Allowances", row.allowance.toFixed(2), "ESIC Deduction", row.esicDeduction.toFixed(2)],
      ["OT & Compensation", row.compensation.toFixed(2), "EMI Deduction", row.emiDeduction.toFixed(2)],
      ["", "", "Canteen Deduction", row.canteenDeduction.toFixed(2)],
      ["", "", "LWP Leave Adjustment", row.leaveAdjustment.toFixed(2)],
      ["", "", "Other Deductions", row.otherDeductions.toFixed(2)],
      ["Gross Earnings", row.grossSalary.toFixed(2), "Total Deductions", row.totalDeductions.toFixed(2)]
    ];

    doc.autoTable({
      head: headers,
      body: body,
      startY: 70,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { fontStyle: "normal" },
        1: { halign: "right" },
        2: { fontStyle: "normal" },
        3: { halign: "right" }
      }
    });

    // Net Salary Block
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFillColor(243, 244, 246);
    doc.rect(14, finalY, 182, 18, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("NET SALARY (Take-home Pay):", 20, finalY + 11);
    
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text(`Rs. ${row.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 190, finalY + 11, { align: "right" });
    
    // Footer notes
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated document and does not require a physical signature.", 105, finalY + 30, { align: "center" });

    doc.save(`Payslip_${row.employeeCode}_${row.period}.pdf`);
  };

  // Filter rows based on search term and department
  const filteredRows = payrollRows.filter(row => {
    const matchesSearch = 
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      row.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDept = 
      !departmentFilter || row.department === departmentFilter;

    return matchesSearch && matchesDept;
  });

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
            Compute, adjust, and process monthly and daily payrolls with PF, ESIC, EMI, canteen, and leave adjustments.
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
            Export PDF
          </button>
          <button
            onClick={handleSavePayroll}
            disabled={saving || payrollRows.length === 0}
            className={`px-5 py-2 text-white rounded-xl font-medium transition-all flex items-center gap-1.5 shadow-sm text-sm ${
              saving || payrollRows.length === 0
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
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeMode === "Monthly" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Monthly Form
            </button>
            <button
              onClick={() => setActiveMode("Daily")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activeMode === "Daily" 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Daily Form
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            {activeMode === "Monthly" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                ? "Showing SAVED payroll run from the database. Modifications will overwrite the saved data." 
                : "Showing DRAFT payroll calculation. Click 'Save Payroll Run' to store in DB."}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-4 px-4 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Emp Details</th>
                  <th className="py-4 px-3 text-center">Days Worked</th>
                  {activeMode === "Monthly" && <th className="py-4 px-3 text-center">Unpaid Leaves</th>}
                  <th className="py-4 px-3 text-right">Basic Pay (₹)</th>
                  <th className="py-4 px-3 text-right">Allowance (₹)</th>
                  <th className="py-4 px-3 text-right">OT & Comp (₹)</th>
                  {activeMode === "Monthly" && <th className="py-4 px-3 text-right">LWP Adjust (₹)</th>}
                  <th className="py-4 px-3 text-right font-semibold text-green-600 bg-green-50/30">Gross Salary (₹)</th>
                  <th className="py-4 px-3 text-right">PF (₹)</th>
                  <th className="py-4 px-3 text-right">ESIC (₹)</th>
                  <th className="py-4 px-3 text-right">EMI (₹)</th>
                  <th className="py-4 px-3 text-right">Canteen (₹)</th>
                  <th className="py-4 px-3 text-right">Other Deduct (₹)</th>
                  <th className="py-4 px-3 text-right font-semibold text-red-600 bg-red-50/30">Total Deduct (₹)</th>
                  <th className="py-4 px-3 text-right font-bold text-blue-600 bg-blue-50/30">Net Salary (₹)</th>
                  <th className="py-4 px-3 text-center">Status</th>
                  <th className="py-4 px-3">Remarks</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredRows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-gray-50/60 transition-colors">
                    {/* Sticky Emp Info */}
                    <td className="py-3.5 px-4 sticky left-0 bg-white group-hover:bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="font-semibold text-gray-900">{row.employeeName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">{row.employeeCode}</span>
                        <span>•</span>
                        <span>{row.department}</span>
                      </div>
                    </td>

                    {/* Days Worked */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={activeMode === "Monthly" ? 31 : 90}
                        step="0.5"
                        disabled={activeMode === "Monthly"}
                        value={row.daysWorked}
                        onChange={(e) => handleCellChange(row.employeeId, "daysWorked", e.target.value)}
                        className={`w-16 border rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                          activeMode === "Monthly" ? "bg-gray-100/60 text-gray-500 border-gray-100" : "border-gray-200"
                        }`}
                      />
                    </td>

                    {/* Unpaid Leaves */}
                    {activeMode === "Monthly" && (
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="31"
                          step="1"
                          value={row.unpaidLeaves}
                          onChange={(e) => handleCellChange(row.employeeId, "unpaidLeaves", e.target.value)}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-center text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                    )}

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
                        type="number"
                        min="0"
                        value={row.compensation}
                        onChange={(e) => handleCellChange(row.employeeId, "compensation", e.target.value)}
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
                        type="number"
                        min="0"
                        value={row.otherDeductions}
                        onChange={(e) => handleCellChange(row.employeeId, "otherDeductions", e.target.value)}
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

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <select
                        value={row.status}
                        onChange={(e) => handleStatusChange(row.employeeId, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
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
                    <td className="py-3.5 px-4 text-center">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Modal */}
      {showPayslipModal && selectedRowForPayslip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Payslip Preview</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review calculated payroll details for {selectedRowForPayslip.employeeName}
                </p>
              </div>
              <button
                onClick={() => setShowPayslipModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Payslip Content */}
            <div className="p-6 space-y-6">
              {/* Slip Layout */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-6">
                {/* Logo / Company Name */}
                <div className="text-center pb-4 border-b border-slate-100">
                  <h4 className="text-xl font-extrabold text-slate-800 tracking-tight">BOTIVATE HR INTERNSHIP</h4>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">Salary Slip</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Period: {selectedRowForPayslip.period} ({selectedRowForPayslip.type})
                  </p>
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-semibold text-slate-800">{selectedRowForPayslip.employeeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee Code:</span>
                    <span className="font-semibold font-mono text-slate-800">{selectedRowForPayslip.employeeCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">{selectedRowForPayslip.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Days Worked:</span>
                    <span className="font-semibold text-slate-800">{selectedRowForPayslip.daysWorked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-slate-800">{selectedRowForPayslip.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unpaid Leaves:</span>
                    <span className="font-semibold text-slate-800">{selectedRowForPayslip.unpaidLeaves}</span>
                  </div>
                </div>

                {/* Breakdown Grid */}
                <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-200 py-4">
                  {/* Earnings */}
                  <div className="space-y-2 border-r border-slate-100 pr-4">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Earnings</h5>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Basic Salary:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.basicPay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Allowances:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.allowance.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">OT & Special Comp:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.compensation.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2 pl-4">
                    <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Deductions</h5>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">PF Contribution:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.pfDeduction.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">ESIC Deduction:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.esicDeduction.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">EMI Loan Repayment:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.emiDeduction.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Canteen Charges:</span>
                      <span className="font-mono">₹{selectedRowForPayslip.canteenDeduction.toFixed(2)}</span>
                    </div>
                    {selectedRowForPayslip.leaveAdjustment > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">LWP Leave Adjust:</span>
                        <span className="font-mono text-red-500">₹{selectedRowForPayslip.leaveAdjustment.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedRowForPayslip.otherDeductions > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Other Deductions:</span>
                        <span className="font-mono text-red-500">₹{selectedRowForPayslip.otherDeductions.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summaries */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gross Earnings:</span>
                    <span className="font-semibold font-mono">₹{selectedRowForPayslip.grossSalary.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Deductions:</span>
                    <span className="font-semibold font-mono text-red-500">₹{selectedRowForPayslip.totalDeductions.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-3 rounded-xl mt-3 text-blue-900">
                    <span className="font-bold">Net Take-Home Salary:</span>
                    <span className="text-lg font-extrabold font-mono text-blue-600">
                      ₹{selectedRowForPayslip.netSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
              <button
                onClick={() => setShowPayslipModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors text-sm"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPayslipPDF(selectedRowForPayslip)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm flex items-center gap-1.5 shadow-sm"
              >
                <Download size={16} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
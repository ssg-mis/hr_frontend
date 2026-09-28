import ExcelJS from "exceljs";

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const num = (v) => Number(v) || 0;

// "2026-04" -> "Apr-26"
export const formatMonthLabel = (period) => {
  const [y, m] = String(period).split("-");
  return `${MONTH_SHORT[parseInt(m, 10) - 1] || m}-${String(y).slice(-2)}`;
};

// Every "YYYY-MM" between from and to (inclusive), so months with no payroll still get a column
export const getMonthsInRange = (from, to) => {
  const months = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
};

// Net pay actually paid (includes Diwali bonus); older rows may only have netSalary
const getNetPay = (r) => num(r.netPayAmount) || num(r.netSalary);

const AMOUNT_FIELDS = [
  "basicPay", "allowance", "compensation", "otAmount", "grossSalary",
  "pfDeduction", "esicDeduction", "emiDeduction", "canteenDeduction", "otherDeductions",
  "totalDeductions", "netSalary", "diwaliBonus",
];

const AMOUNT_COLUMNS = [
  { header: "Basic", key: "basicPay", width: 11, numeric: true },
  { header: "Allowance", key: "allowance", width: 11, numeric: true },
  { header: "Washing Allow.", key: "compensation", width: 12, numeric: true },
  { header: "OT Hrs", key: "otHrs", width: 8, numeric: true, decimals: true },
  { header: "OT Amt", key: "otAmount", width: 10, numeric: true },
  { header: "Gross", key: "grossSalary", width: 12, numeric: true },
  { header: "PF", key: "pfDeduction", width: 9, numeric: true },
  { header: "ESIC", key: "esicDeduction", width: 9, numeric: true },
  { header: "EMI", key: "emiDeduction", width: 9, numeric: true },
  { header: "Canteen", key: "canteenDeduction", width: 9, numeric: true },
  { header: "Other Ded", key: "otherDeductions", width: 10, numeric: true },
  { header: "Total Ded", key: "totalDeductions", width: 11, numeric: true },
  { header: "Net Salary", key: "netSalary", width: 12, numeric: true },
  { header: "Diwali Bonus", key: "diwaliBonus", width: 11, numeric: true },
  { header: "Net Pay", key: "netPay", width: 12, numeric: true },
];

const thinBorder = {
  top: { style: "thin", color: { argb: "FFD1D5DB" } },
  left: { style: "thin", color: { argb: "FFD1D5DB" } },
  bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
  right: { style: "thin", color: { argb: "FFD1D5DB" } },
};

// Writes title block + header + data + bold TOTAL row onto a worksheet
const writeSheet = (ws, { companyName, subtitle, filterLine, columns, rows }) => {
  const lastCol = ws.getColumn(columns.length).letter;

  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = companyName.toUpperCase();
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  ws.getRow(1).height = 28;

  ws.mergeCells(`A2:${lastCol}2`);
  const subtitleCell = ws.getCell("A2");
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle" };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  ws.getRow(2).height = 22;

  ws.mergeCells(`A3:${lastCol}3`);
  const filterCell = ws.getCell("A3");
  filterCell.value = filterLine;
  filterCell.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF4B5563" } };
  filterCell.alignment = { horizontal: "center", vertical: "middle" };

  // Header row 5
  const headerRow = ws.getRow(5);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF1F2937" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDBEAFE" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder;
    ws.getColumn(i + 1).width = col.width || 12;
  });
  headerRow.height = 30;
  ws.views = [{ state: "frozen", ySplit: 5, xSplit: 3, showGridLines: true }];

  // Data rows
  const totals = {};
  rows.forEach((r, idx) => {
    const row = ws.getRow(6 + idx);
    columns.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      const val = col.key === "sno" ? idx + 1 : r[col.key];
      if (col.numeric) {
        // null means "no payroll for this month" -> show a dash instead of 0
        if (val === null || val === undefined) {
          cell.value = "—";
          cell.alignment = { horizontal: "center" };
        } else {
          cell.value = num(val);
          cell.numFmt = col.decimals ? "#,##0.00" : "#,##0";
          cell.alignment = { horizontal: "right" };
          totals[col.key] = (totals[col.key] || 0) + num(val);
        }
      } else {
        cell.value = val ?? "";
        cell.alignment = { horizontal: col.key === "sno" ? "center" : "left" };
      }
      cell.font = { name: "Arial", size: 10 };
      cell.border = thinBorder;
    });
  });

  // TOTAL row
  const totalRow = ws.getRow(6 + rows.length);
  columns.forEach((col, i) => {
    const cell = totalRow.getCell(i + 1);
    if (i === 0) cell.value = "TOTAL";
    else if (col.numeric && !col.noTotal) {
      cell.value = totals[col.key] || 0;
      cell.numFmt = col.decimals ? "#,##0.00" : "#,##0";
      cell.alignment = { horizontal: "right" };
    }
    cell.font = { name: "Arial", size: 10, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    cell.border = thinBorder;
  });
  if (columns.length > 2) ws.mergeCells(totalRow.number, 1, totalRow.number, 3);
  totalRow.getCell(1).alignment = { horizontal: "center" };
};

/**
 * Builds the 3-sheet Salary Report workbook (Summary, Month-wise, Detail) and triggers download.
 * @param {Array} data - rows from GET /salaries/payroll/report
 */
export const generateSalaryReportExcel = async ({ data, from, to, companyName, filterLine, author }) => {
  const months = getMonthsInRange(from, to);
  const rangeLabel = `${formatMonthLabel(from)} to ${formatMonthLabel(to)}`;

  // Group payroll rows by employee (API returns them ordered by emp code, then period)
  const byEmployee = new Map();
  data.forEach((r) => {
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, {
        employeeCode: r.employeeCode || "",
        employeeName: r.employeeName || "",
        department: r.department || "—",
        designation: r.designation || "—",
        runs: [],
      });
    }
    byEmployee.get(r.employeeId).runs.push(r);
  });
  const employeesList = Array.from(byEmployee.values());

  const wb = new ExcelJS.Workbook();
  wb.creator = "HR FMS System";
  wb.lastModifiedBy = author || "HR Admin";
  wb.created = new Date();
  wb.modified = new Date();
  const sheetOpts = { pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 } };

  // Sheet 1: Summary - one row per employee, totals across the range
  const summaryRows = employeesList.map((emp) => {
    const row = {
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department,
      designation: emp.designation,
      monthsPaid: new Set(emp.runs.map((r) => r.period)).size,
      daysWorked: 0,
      otHrs: 0,
      netPay: 0,
    };
    AMOUNT_FIELDS.forEach((f) => { row[f] = 0; });
    emp.runs.forEach((r) => {
      row.daysWorked += num(r.daysWorked);
      row.otHrs += num(r.otHrs);
      row.netPay += getNetPay(r);
      AMOUNT_FIELDS.forEach((f) => { row[f] += num(r[f]); });
    });
    return row;
  });
  writeSheet(wb.addWorksheet("Summary", sheetOpts), {
    companyName,
    subtitle: `SALARY REPORT (SUMMARY) - ${rangeLabel}`,
    filterLine,
    rows: summaryRows,
    columns: [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Emp Code", key: "employeeCode", width: 11 },
      { header: "Employee Name", key: "employeeName", width: 26 },
      { header: "Department", key: "department", width: 18 },
      { header: "Designation", key: "designation", width: 18 },
      { header: "Months Paid", key: "monthsPaid", width: 8, numeric: true, noTotal: true },
      { header: "Days Worked", key: "daysWorked", width: 9, numeric: true, decimals: true },
      ...AMOUNT_COLUMNS,
    ],
  });

  // Sheet 2: Month-wise - net pay per month as columns
  const monthwiseRows = employeesList.map((emp) => {
    const row = {
      employeeCode: emp.employeeCode,
      employeeName: emp.employeeName,
      department: emp.department,
      total: 0,
    };
    months.forEach((m) => { row[m] = null; });
    emp.runs.forEach((r) => {
      row[r.period] = (row[r.period] || 0) + getNetPay(r);
      row.total += getNetPay(r);
    });
    return row;
  });
  writeSheet(wb.addWorksheet("Month-wise", sheetOpts), {
    companyName,
    subtitle: `SALARY REPORT (MONTH-WISE NET PAY) - ${rangeLabel}`,
    filterLine,
    rows: monthwiseRows,
    columns: [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Emp Code", key: "employeeCode", width: 11 },
      { header: "Employee Name", key: "employeeName", width: 26 },
      { header: "Department", key: "department", width: 18 },
      ...months.map((m) => ({ header: formatMonthLabel(m), key: m, width: 11, numeric: true })),
      { header: "Total", key: "total", width: 13, numeric: true },
    ],
  });

  // Sheet 3: Detail - one row per employee per month
  const detailRows = [];
  employeesList.forEach((emp) => {
    emp.runs.forEach((r) => {
      detailRows.push({
        ...r,
        employeeCode: emp.employeeCode,
        employeeName: emp.employeeName,
        department: emp.department,
        month: formatMonthLabel(r.period),
        netPay: getNetPay(r),
        payModeLabel: (r.paymentMode || r.payMode || "CASH").toUpperCase().includes("BANK") ? "BANK" : "CASH",
      });
    });
  });
  writeSheet(wb.addWorksheet("Detail", sheetOpts), {
    companyName,
    subtitle: `SALARY REPORT (DETAIL) - ${rangeLabel}`,
    filterLine,
    rows: detailRows,
    columns: [
      { header: "S.No", key: "sno", width: 6 },
      { header: "Emp Code", key: "employeeCode", width: 11 },
      { header: "Employee Name", key: "employeeName", width: 26 },
      { header: "Department", key: "department", width: 18 },
      { header: "Month", key: "month", width: 9 },
      { header: "Days", key: "daysWorked", width: 8, numeric: true, decimals: true },
      ...AMOUNT_COLUMNS,
      { header: "Status", key: "status", width: 10 },
      { header: "Pay Mode", key: "payModeLabel", width: 9 },
    ],
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Salary_Report_${from}_to_${to}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { employees: employeesList.length, rows: data.length };
};

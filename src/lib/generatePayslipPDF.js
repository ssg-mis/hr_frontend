import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to safely invoke autoTable regardless of environment
const applyAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, options);
  }
};

// Helper: Format number to Indian Currency
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(num);
};

// Helper: Convert number to Indian words
export const numberToIndianWords = (num) => {
  const parsedNum = Math.round(Number(num) || 0);
  if (parsedNum === 0) return 'Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
    'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  };

  return convert(parsedNum) + ' Only';
};

const formatPeriod = (period) => {
  if (!period) return '';
  if (period.includes(':')) {
    return period;
  }
  const [year, month] = period.split('-');
  if (!year || !month) return period;
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

// Internal function to draw a single payslip on the given PDF instance
const drawPayslip = (doc, data, startY = 10) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = startY;

  // Header
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(data.branchName || 'SHRI SHYAM WAREHOUSING AND POWER PVT. LTD.', pageWidth / 2, currentY + 10, { align: 'center' });
  
  if (data.branchAddress) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(data.branchAddress, pageWidth / 2, currentY + 16, { align: 'center' });
  }

  const periodLabel = formatPeriod(data.period);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`SALARY SLIP — ${periodLabel.toUpperCase()}`, pageWidth / 2, currentY + 25, { align: 'center' });

  // Separator Line
  currentY += 28;
  doc.setLineWidth(0.5);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 4;

  // Employee Details & Attendance Grid
  applyAutoTable(doc, {
    startY: currentY,
    theme: 'plain',
    styles: { cellPadding: 2, fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 48 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 48 }
    },
    body: [
      ['Employee Name:', data.employeeName || 'N/A', 'Employee Code:', data.employeeCode || 'N/A'],
      ['Company Branch:', data.branchName || 'N/A', 'Department:', data.department || 'N/A'],
      ['Designation:', data.designation || 'N/A', 'Payment Mode:', data.paymentMode || 'Cash'],
      ['Pay Period:', periodLabel || 'N/A', 'Payable Days:', (data.daysWorked || 0).toString()],
      ['Paid Leave Days:', (data.paidLeaves || 0).toString(), 'Absent:', (data.unpaidLeaves || 0).toString()]
    ],
  });

  const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 40;
  currentY = lastTableY + 6;

  // Earnings and Deductions Data
  const earnings = [
    ['Basic Pay', formatCurrency(data.basicPay)],
    ['Allowances', formatCurrency(data.allowance)],
    ['OT & Compensation', formatCurrency(data.compensation)],
    ['', ''],
    ['', ''],
    ['', '']
  ];

  const deductions = [
    ['PF Contribution', formatCurrency(data.pfDeduction)],
    ['ESIC Deduction', formatCurrency(data.esicDeduction)],
    ['EMI Deduction', formatCurrency(data.emiDeduction)],
    ['Canteen Deduction', formatCurrency(data.canteenDeduction)],
    ['LWP Leave Adjustment', formatCurrency(data.leaveAdjustment)],
    ['Other Deductions', formatCurrency(data.otherDeductions)]
  ];

  const tableBody = [];
  for (let i = 0; i < 6; i++) {
    tableBody.push([
      earnings[i][0], earnings[i][1],
      deductions[i][0], deductions[i][1]
    ]);
  }

  // Earnings vs Deductions Table
  applyAutoTable(doc, {
    startY: currentY,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 55 },
      3: { cellWidth: 35, halign: 'right' }
    },
    head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
    body: tableBody,
    foot: [
      ['Gross Earnings', formatCurrency(data.grossSalary), 'Total Deductions', formatCurrency(data.totalDeductions)]
    ],
    footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentY + 60;
  currentY = finalY + 10;

  // Net Salary Block
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(249, 250, 251);
  doc.rect(14, currentY, pageWidth - 28, 22, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`NET SALARY (Take-Home Pay): ${formatCurrency(data.netSalary)}`, 20, currentY + 8);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`In Words: Rupees ${numberToIndianWords(data.netSalary || 0)}`, 20, currentY + 16);

  // Footer area
  const footerY = 265;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('This is a system-generated payslip and does not require a physical signature.', 14, footerY);
  doc.text(`Generated Date: ${new Date().toLocaleDateString('en-IN')}`, 14, footerY + 6);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', pageWidth - 14, footerY + 6, { align: 'right' });
  
  return footerY + 15;
};

export const generatePayslipPDF = (payslipData, options = {}) => {
  const { action = 'download' } = options;
  const doc = new jsPDF();
  
  const parsedData = parsePayslipNumbers(payslipData);
  drawPayslip(doc, parsedData);
  
  const fileName = `Payslip_${parsedData.employeeCode || 'Emp'}_${parsedData.period || 'Period'}.pdf`;

  if (action === 'blob') {
    return doc.output('blob');
  } else if (action === 'print') {
    try {
      const blobUrl = doc.output('bloburl');
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }, 300);
      };
    } catch (err) {
      console.error("PDF print error, falling back to download:", err);
      doc.save(fileName);
    }
  } else {
    // Default: download
    doc.save(fileName);
  }
};

export const generateBulkPayslipsPDF = (payslipDataArray, periodLabel) => {
  if (!payslipDataArray || payslipDataArray.length === 0) return null;
  
  const doc = new jsPDF();
  
  payslipDataArray.forEach((data, index) => {
    if (index > 0) {
      doc.addPage();
    }
    const slipData = parsePayslipNumbers({ ...data, period: data.period || periodLabel });
    drawPayslip(doc, slipData);
  });
  
  doc.save(`Payslips_All_${periodLabel || 'Bulk'}.pdf`);
};

// Helper: Parse all numeric fields from string to number (DB returns strings for numeric columns)
export const parsePayslipNumbers = (data) => {
  if (!data) return {};
  const numericFields = [
    'basicPay', 'allowance', 'compensation', 'leaveAdjustment',
    'grossSalary', 'pfDeduction', 'esicDeduction', 'emiDeduction',
    'canteenDeduction', 'otherDeductions', 'totalDeductions', 'netSalary',
    'daysWorked', 'unpaidLeaves', 'presentDays', 'paidLeaves'
  ];
  const parsed = { ...data };
  numericFields.forEach(field => {
    if (parsed[field] !== undefined && parsed[field] !== null) {
      parsed[field] = Number(parsed[field]) || 0;
    }
  });
  return parsed;
};


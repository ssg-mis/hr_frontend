import React from 'react';
import { X, Download, Printer } from 'lucide-react';
import { generatePayslipPDF } from '../lib/generatePayslipPDF';

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Helper to convert number to words (Indian numbering system)
const numberToIndianWords = (num) => {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees Only';

  const single = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];
  
  const formatTens = (n) => {
    if (n < 20) return single[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + single[n % 10] : '');
  };

  const integerPart = Math.floor(num);
  
  let result = '';
  
  if (integerPart > 9999999) {
    result += formatTens(Math.floor(integerPart / 10000000)) + ' Crore ';
  }
  
  const lakhs = Math.floor((integerPart % 10000000) / 100000);
  if (lakhs > 0) result += formatTens(lakhs) + ' Lakh ';
  
  const thousands = Math.floor((integerPart % 100000) / 1000);
  if (thousands > 0) result += formatTens(thousands) + ' Thousand ';
  
  const hundreds = Math.floor((integerPart % 1000) / 100);
  if (hundreds > 0) result += formatTens(hundreds) + ' Hundred ';
  
  const remainder = integerPart % 100;
  if (remainder > 0) result += formatTens(remainder);
  
  return result.trim() + ' Rupees Only';
};

const PayslipPreviewModal = ({ isOpen, onClose, payslipData }) => {
  if (!isOpen || !payslipData) return null;

  const handleDownload = () => {
    generatePayslipPDF(payslipData, { action: 'download' });
  };

  const handlePrint = () => {
    generatePayslipPDF(payslipData, { action: 'print' });
  };

  // Safe defaults
  const data = {
    employeeName: payslipData.employeeName || 'N/A',
    employeeCode: payslipData.employeeCode || 'N/A',
    department: payslipData.department || 'N/A',
    designation: payslipData.designation || 'N/A',
    branchName: payslipData.branchName || 'SHRI SHYAM WAREHOUSING AND POWER PVT. LTD.',
    branchAddress: payslipData.branchAddress || 'Village - BANARI',
    paymentMode: payslipData.paymentMode || 'Cash',
    period: payslipData.period || 'N/A',
    daysWorked: payslipData.daysWorked || 0,
    presentDays: payslipData.presentDays || payslipData.daysWorked || 0,
    paidLeaves: payslipData.paidLeaves || 0,
    unpaidLeaves: payslipData.unpaidLeaves || 0,
    basicPay: payslipData.basicPay || 0,
    allowance: payslipData.allowance || 0,
    compensation: payslipData.compensation || 0,
    leaveAdjustment: payslipData.leaveAdjustment || 0,
    grossSalary: payslipData.grossSalary || 0,
    pfDeduction: payslipData.pfDeduction || 0,
    esicDeduction: payslipData.esicDeduction || 0,
    emiDeduction: payslipData.emiDeduction || 0,
    canteenDeduction: payslipData.canteenDeduction || 0,
    otherDeductions: payslipData.otherDeductions || 0,
    totalDeductions: payslipData.totalDeductions || 0,
    netSalary: payslipData.netSalary || 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col my-8 max-h-[90vh]">
        {/* Header Options */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-800">Payslip Preview</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - The Payslip itself */}
        <div className="p-8 overflow-y-auto bg-slate-50/50">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 p-8 shadow-sm print:shadow-none print:border-none">
            
            {/* Payslip Header */}
            <div className="text-center mb-8 border-b border-slate-200 pb-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{data.branchName}</h1>
              {data.branchAddress && <p className="text-slate-600 mb-4">{data.branchAddress}</p>}
              <h2 className="text-lg font-semibold text-slate-800 uppercase tracking-wider">
                Payslip for the month of {data.period}
              </h2>
            </div>

            {/* Employee Details & Attendance Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-8 text-sm">
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Employee Name</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.employeeName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Employee Code</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.employeeCode}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Company Branch</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.branchName}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Department</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.department}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Designation</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.designation}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Payment Mode</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.paymentMode}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Payable Days</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.daysWorked}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Paid Leave Days</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.paidLeaves}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium col-span-1">Unpaid Leaves (LWP)</span>
                <span className="text-slate-900 col-span-2 font-medium">: {data.unpaidLeaves}</span>
              </div>
            </div>

            {/* Earnings and Deductions Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <div className="grid grid-cols-2 bg-slate-50 text-sm font-bold text-slate-800 border-b border-slate-200">
                <div className="p-3 border-r border-slate-200">Earnings</div>
                <div className="p-3">Deductions</div>
              </div>
              
              <div className="grid grid-cols-2">
                {/* Earnings Column */}
                <div className="border-r border-slate-200 p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Basic Pay</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.basicPay)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Allowance</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.allowance)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Compensation</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.compensation)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Leave Adjustment</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.leaveAdjustment)}</td>
                      </tr>
                      {/* Filler rows to match height */}
                      <tr><td className="p-3 text-transparent">-</td><td className="p-3">-</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Deductions Column */}
                <div className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">PF Deduction</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.pfDeduction)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">ESIC Deduction</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.esicDeduction)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">EMI Deduction</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.emiDeduction)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Canteen Deduction</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.canteenDeduction)}</td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-3 text-slate-600">Other Deductions</td>
                        <td className="p-3 text-right font-mono text-slate-900">{formatCurrency(data.otherDeductions)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Row */}
              <div className="grid grid-cols-2 bg-slate-50 border-t border-slate-200 font-bold text-sm">
                <div className="p-3 border-r border-slate-200 flex justify-between">
                  <span className="text-slate-800">Gross Salary</span>
                  <span className="font-mono text-indigo-700">{formatCurrency(data.grossSalary)}</span>
                </div>
                <div className="p-3 flex justify-between">
                  <span className="text-slate-800">Total Deductions</span>
                  <span className="font-mono text-rose-600">{formatCurrency(data.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Salary Highlight */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-12 flex flex-col items-center justify-center">
              <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wider mb-1">Net Take-Home Salary</p>
              <p className="text-3xl font-bold font-mono text-indigo-900 mb-2">{formatCurrency(data.netSalary)}</p>
              <p className="text-sm font-medium text-indigo-700 text-center">
                ({numberToIndianWords(data.netSalary)})
              </p>
            </div>

            {/* Signatures & Footer */}
            <div className="flex justify-between items-end mt-16 pt-8 text-sm border-t border-slate-100">
              <div className="text-slate-400 italic">
                <p>This is a system-generated payslip</p>
                <p>and does not require a physical signature.</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
                <p className="font-medium text-slate-700">Authorized Signatory</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PayslipPreviewModal;

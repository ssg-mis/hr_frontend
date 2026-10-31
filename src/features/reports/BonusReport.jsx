import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable, StatusBadge } from './ReportParts';
import { downloadExcel, formatMoney, formatMonthLabel } from './reportUtils';

const BonusReport = ({ departmentId, employeeId, search, fromMonth, toMonth }) => {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('bonus', { fromMonth, toMonth, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const match = (r) => !term || [r.name, r.employeeCode].some((v) => String(v || '').toLowerCase().includes(term));
  const records = (data?.records || []).filter(match);
  const summary = (data?.summary || []).filter(match);
  const unsaved = data?.unsavedMonths || [];
  const total = records.reduce((s, r) => s + r.bonus, 0);
  const period = fromMonth === toMonth ? formatMonthLabel(fromMonth) : `${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)}`;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const sheets = [{
        name: 'Bonus Payments',
        title: `Bonus Report — ${period}`,
        columns: [
          { header: 'Month', key: 'monthLabel', width: 14 }, { header: 'Code', key: 'employeeCode', width: 8 },
          { header: 'Name', key: 'name', width: 26 }, { header: 'Department', key: 'department', width: 16 },
          { header: 'Bonus', key: 'bonus', width: 12, numFmt: '#,##0' }, { header: 'Net Salary', key: 'netSalary', width: 12, numFmt: '#,##0' },
          { header: 'Net Pay (incl. bonus)', key: 'netPay', width: 16, numFmt: '#,##0' }, { header: 'Payroll Status', key: 'status', width: 12 },
        ],
        rows: records.map((r) => ({ ...r, monthLabel: formatMonthLabel(r.month) })),
      }];
      if (!employeeId) {
        sheets.unshift({
          name: 'Employee Totals',
          title: `Bonus — Employee Totals (${period})`,
          columns: [
            { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 26 },
            { header: 'Department', key: 'department', width: 16 }, { header: 'Months Paid', key: 'months', width: 11 },
            { header: 'Total Bonus', key: 'bonus', width: 12, numFmt: '#,##0' },
          ],
          rows: summary,
        });
      }
      await downloadExcel(`Bonus_Report_${fromMonth}_to_${toMonth}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={`Bonus Report — ${period}`}
        subtitle="Diwali bonus entered on saved payroll runs (Payroll Creation → Save Payroll Run)."
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      {!loading && !error && unsaved.length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <p><span className="font-bold">Payroll not saved for:</span> {unsaved.map(formatMonthLabel).join(', ')}. Bonus for these months will appear once their payroll run is saved.</p>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <StatCards items={[
          { label: 'Employees Paid', value: summary.length, tone: 'indigo' },
          { label: 'Total Bonus', value: formatMoney(total), tone: 'emerald' },
          { label: 'Average per Employee', value: formatMoney(summary.length ? total / summary.length : 0), tone: 'sky' },
          { label: 'Highest', value: formatMoney(Math.max(...summary.map((s) => s.bonus))), tone: 'amber' },
          { label: 'Months', value: new Set(records.map((r) => r.month)).size, tone: 'gray' },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={records.length === 0} emptyText="No bonus paid in saved payroll for this period" />

      {!loading && !error && records.length > 0 && (
        employeeId ? (
          <ReportTable
            rows={records}
            columns={[
              { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month) },
              { key: 'bonus', label: 'Bonus', align: 'right', render: (r) => <span className="font-bold">{formatMoney(r.bonus)}</span> },
              { key: 'netSalary', label: 'Net Salary', align: 'right', render: (r) => formatMoney(r.netSalary) },
              { key: 'netPay', label: 'Net Pay (incl. bonus)', align: 'right', render: (r) => formatMoney(r.netPay) },
              { key: 'status', label: 'Payroll', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        ) : (
          <ReportTable
            rowKey="employeeId"
            rows={summary}
            columns={[
              { key: 'employeeCode', label: 'Code' },
              { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
              { key: 'department', label: 'Department' },
              { key: 'months', label: 'Months Paid', align: 'right' },
              { key: 'bonus', label: 'Total Bonus', align: 'right', render: (r) => <span className="font-bold">{formatMoney(r.bonus)}</span> },
            ]}
          />
        )
      )}
    </div>
  );
};

export default BonusReport;

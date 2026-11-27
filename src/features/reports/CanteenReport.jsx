import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable } from './ReportParts';
import { downloadExcel, formatDate, formatMoney } from './reportUtils';

const CanteenReport = ({ departmentId, employeeId, search, from, to }) => {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('canteen', { from, to, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const summary = (data?.summary || []).filter((e) =>
    !term || [e.name, e.employeeCode].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const logs = data?.logs || [];
  const byMeal = data?.byMeal || [];
  const single = employeeId ? summary[0] : null;

  const totals = summary.reduce((t, e) => ({
    meals: t.meals + e.meals, employeePays: t.employeePays + e.employeePays, companyPays: t.companyPays + e.companyPays,
  }), { meals: 0, employeePays: 0, companyPays: 0 });

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const period = `${formatDate(from)} to ${formatDate(to)}`;
      const sheets = [{
        name: 'Employee Summary',
        title: `Canteen Report — ${period}`,
        columns: [
          { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 26 },
          { header: 'Department', key: 'department', width: 16 }, { header: 'Meals', key: 'meals', width: 8 },
          { header: 'Days Used', key: 'daysUsed', width: 9 },
          { header: 'Employee Pays', key: 'employeePays', width: 14, numFmt: '#,##0.00' },
          { header: 'Company Pays', key: 'companyPays', width: 14, numFmt: '#,##0.00' },
          { header: 'Total', key: 'total', width: 12, numFmt: '#,##0.00' },
        ],
        rows: summary,
      }, {
        name: 'Meal-wise',
        title: `Meal-wise Summary — ${period}`,
        columns: [
          { header: 'Meal', key: 'meal', width: 18 }, { header: 'Count', key: 'count', width: 8 },
          { header: 'Employee Pays', key: 'employeePays', width: 14, numFmt: '#,##0.00' },
          { header: 'Company Pays', key: 'companyPays', width: 14, numFmt: '#,##0.00' },
        ],
        rows: byMeal,
      }];
      if (single) {
        sheets.unshift({
          name: 'Meal Log',
          title: `${single.name} (${single.employeeCode}) — ${period}`,
          columns: [
            { header: 'Date', key: 'date', width: 12 }, { header: 'Time', key: 'time', width: 8 },
            { header: 'Meal', key: 'meal', width: 16 },
            { header: 'Employee Pays', key: 'employeePays', width: 14, numFmt: '#,##0.00' },
            { header: 'Company Pays', key: 'companyPays', width: 14, numFmt: '#,##0.00' },
          ],
          rows: logs.map((l) => ({ ...l, date: formatDate(l.date) })),
        });
      }
      await downloadExcel(`Canteen_Report_${from}_to_${to}${single ? `_${single.employeeCode}` : ''}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Canteen Report"
        subtitle={`Meals served from ${formatDate(from)} to ${formatDate(to)}, with the employee and company share.`}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || summary.length === 0}
      />

      {!loading && !error && summary.length > 0 && (
        <>
          <StatCards items={[
            { label: single ? 'Days Used' : 'Employees', value: single ? single.daysUsed : summary.length, tone: 'indigo' },
            { label: 'Meals Served', value: totals.meals, tone: 'sky' },
            { label: 'Employee Pays', value: formatMoney(totals.employeePays), tone: 'amber', hint: 'Deducted from salary' },
            { label: 'Company Pays', value: formatMoney(totals.companyPays), tone: 'emerald' },
            { label: 'Total Cost', value: formatMoney(totals.employeePays + totals.companyPays), tone: 'gray' },
          ]} />
          <div className="flex flex-wrap gap-2">
            {byMeal.map((m) => (
              <span key={m.meal} className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
                {m.meal}: <span className="text-indigo-700">{m.count}</span> · {formatMoney(m.employeePays + m.companyPays)}
              </span>
            ))}
          </div>
        </>
      )}

      <ReportStatus loading={loading} error={error} empty={summary.length === 0} emptyText="No canteen meals in this period" />

      {!loading && !error && summary.length > 0 && (
        single ? (
          <ReportTable
            rows={logs}
            columns={[
              { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
              { key: 'time', label: 'Time' },
              { key: 'meal', label: 'Meal' },
              { key: 'employeePays', label: 'Employee Pays', align: 'right', render: (r) => formatMoney(r.employeePays) },
              { key: 'companyPays', label: 'Company Pays', align: 'right', render: (r) => formatMoney(r.companyPays) },
            ]}
          />
        ) : (
          <ReportTable
            rows={summary}
            columns={[
              { key: 'employeeCode', label: 'Code' },
              { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
              { key: 'department', label: 'Department' },
              { key: 'meals', label: 'Meals', align: 'right' },
              { key: 'daysUsed', label: 'Days Used', align: 'right' },
              { key: 'employeePays', label: 'Employee Pays', align: 'right', render: (r) => formatMoney(r.employeePays) },
              { key: 'companyPays', label: 'Company Pays', align: 'right', render: (r) => formatMoney(r.companyPays) },
              { key: 'total', label: 'Total', align: 'right', render: (r) => <span className="font-bold">{formatMoney(r.total)}</span> },
            ]}
          />
        )
      )}
    </div>
  );
};

export default CanteenReport;

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable } from './ReportParts';
import { downloadExcel, formatDate, formatMoney, formatMonthLabel } from './reportUtils';

const pct = (v) => (v === null || v === undefined ? '—' : `${v}%`);

const IncrementReport = ({ departmentId, employeeId, search, fromMonth, toMonth }) => {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('increment', { fromMonth, toMonth, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const records = (data?.records || []).filter((r) =>
    !term || [r.name, r.employeeCode].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const history = data?.history || [];

  const raised = records.filter((r) => r.increase > 0);
  const totalIncrease = records.reduce((s, r) => s + r.increase, 0);
  const withPct = records.filter((r) => r.percent !== null);
  const avgPct = withPct.length ? Math.round((withPct.reduce((s, r) => s + r.percent, 0) / withPct.length) * 100) / 100 : 0;
  const period = `${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)}`;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const sheets = [{
        name: 'Increments',
        title: `Increment Report — ${period}`,
        columns: [
          { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 26 },
          { header: 'Department', key: 'department', width: 16 }, { header: 'Designation', key: 'designation', width: 16 },
          { header: 'Effective From', key: 'effectiveLabel', width: 14 }, { header: 'Type', key: 'changeType', width: 14 },
          { header: 'Old Basic', key: 'oldBasic', width: 11, numFmt: '#,##0' }, { header: 'Old Allowance', key: 'oldAllowance', width: 12, numFmt: '#,##0' },
          { header: 'Old Gross', key: 'oldGross', width: 11, numFmt: '#,##0' },
          { header: 'New Basic', key: 'newBasic', width: 11, numFmt: '#,##0' }, { header: 'New Allowance', key: 'newAllowance', width: 12, numFmt: '#,##0' },
          { header: 'New Gross', key: 'newGross', width: 11, numFmt: '#,##0' },
          { header: 'Increase', key: 'increase', width: 10, numFmt: '#,##0' }, { header: 'Increase %', key: 'percent', width: 10 },
          { header: 'Changed On', key: 'changedOnFmt', width: 12 }, { header: 'Remarks', key: 'remarks', width: 30 },
        ],
        rows: records.map((r) => ({ ...r, effectiveLabel: formatMonthLabel(r.effectiveFrom), changedOnFmt: formatDate(r.changedOn), percent: r.percent ?? '' })),
      }];
      if (employeeId && history.length) {
        sheets.push({
          name: 'Salary History',
          title: `Salary History — ${records[0]?.name || ''}`,
          columns: [
            { header: 'Effective From', key: 'effectiveLabel', width: 14 }, { header: 'Type', key: 'changeType', width: 16 },
            { header: 'Basic', key: 'basic', width: 11, numFmt: '#,##0' }, { header: 'Allowance', key: 'allowance', width: 11, numFmt: '#,##0' },
            { header: 'Gross', key: 'gross', width: 11, numFmt: '#,##0' }, { header: 'Remarks', key: 'remarks', width: 30 },
          ],
          rows: history.map((h) => ({ ...h, effectiveLabel: h.changeType === 'Opening Rate' ? 'Opening' : formatMonthLabel(h.effectiveFrom) })),
        });
      }
      await downloadExcel(`Increment_Report_${fromMonth}_to_${toMonth}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Increment Report"
        subtitle={`Salary revisions effective ${period}, compared with each employee's previous rate.`}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      {!loading && !error && records.length > 0 && (
        <StatCards items={[
          { label: 'Revisions', value: records.length, tone: 'indigo' },
          { label: 'Employees Raised', value: new Set(raised.map((r) => r.employeeId)).size, tone: 'emerald' },
          { label: 'Avg Increase', value: `${avgPct}%`, tone: 'sky' },
          { label: 'Monthly Cost Added', value: formatMoney(totalIncrease), tone: 'amber', hint: 'New gross − old gross' },
          { label: 'Annual Impact', value: formatMoney(totalIncrease * 12), tone: 'gray' },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={records.length === 0 && history.length === 0} emptyText="No salary revisions in this period" />

      {!loading && !error && records.length > 0 && (
        <ReportTable
          rows={records}
          columns={[
            ...(employeeId ? [] : [
              { key: 'employeeCode', label: 'Code' },
              { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
              { key: 'department', label: 'Department' },
            ]),
            { key: 'effectiveFrom', label: 'Effective', render: (r) => formatMonthLabel(r.effectiveFrom) },
            { key: 'changeType', label: 'Type' },
            { key: 'oldGross', label: 'Old Gross', align: 'right', render: (r) => <span title={`Basic ${formatMoney(r.oldBasic)} + Allowance ${formatMoney(r.oldAllowance)}`}>{formatMoney(r.oldGross)}</span> },
            { key: 'newGross', label: 'New Gross', align: 'right', render: (r) => <span title={`Basic ${formatMoney(r.newBasic)} + Allowance ${formatMoney(r.newAllowance)}`}>{formatMoney(r.newGross)}</span> },
            { key: 'increase', label: 'Increase', align: 'right', render: (r) => <span className={`font-bold ${r.increase > 0 ? 'text-emerald-700' : r.increase < 0 ? 'text-rose-600' : ''}`}>{formatMoney(r.increase)}</span> },
            { key: 'percent', label: '%', align: 'right', render: (r) => pct(r.percent) },
            { key: 'changedOn', label: 'Changed On', render: (r) => formatDate(r.changedOn) },
          ]}
        />
      )}

      {employeeId && history.length > 0 && !loading && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Full Salary History</h4>
          <ReportTable
            maxHeight="none"
            rows={history}
            columns={[
              { key: 'effectiveFrom', label: 'Effective From', render: (r) => (r.changeType === 'Opening Rate' ? 'Opening rate' : formatMonthLabel(r.effectiveFrom)) },
              { key: 'changeType', label: 'Type' },
              { key: 'basic', label: 'Basic', align: 'right', render: (r) => formatMoney(r.basic) },
              { key: 'allowance', label: 'Allowance', align: 'right', render: (r) => formatMoney(r.allowance) },
              { key: 'gross', label: 'Gross', align: 'right', render: (r) => <span className="font-bold">{formatMoney(r.gross)}</span> },
              { key: 'remarks', label: 'Remarks' },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default IncrementReport;

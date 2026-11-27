import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable, StatusBadge } from './ReportParts';
import { downloadExcel, formatDate, formatMoney } from './reportUtils';

const STATUSES = ['all', 'Approved', 'Pending HOD', 'Pending HR', 'Rejected'];

const CompensationReport = ({ departmentId, employeeId, search, from, to }) => {
  const [status, setStatus] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('compensation', { from, to, status, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const match = (r) => !term || [r.name, r.employeeCode, r.compensationNumber].some((v) => String(v || '').toLowerCase().includes(term));
  const records = (data?.records || []).filter(match);
  const summary = (data?.summary || []).filter(match);

  const approved = records.filter((r) => r.status === 'Approved');
  const pending = records.filter((r) => r.status.startsWith('Pending'));
  const approvedAmount = approved.reduce((s, r) => s + r.amount, 0);
  const approvedHours = approved.reduce((s, r) => s + (r.hours || 0), 0);

  const recordColumns = [
    { key: 'compensationNumber', label: 'Request No' },
    ...(employeeId ? [] : [
      { key: 'employeeCode', label: 'Code' },
      { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    ]),
    { key: 'workDate', label: 'Work Date', render: (r) => formatDate(r.workDate) },
    { key: 'time', label: 'Time', render: (r) => (r.startTime ? `${r.startTime}–${r.endTime || ''}` : '—') },
    { key: 'type', label: 'Type' },
    { key: 'hours', label: 'Hours', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right', render: (r) => formatMoney(r.amount) },
    { key: 'reason', label: 'Reason', render: (r) => <span className="block max-w-[220px] truncate" title={r.reason}>{r.reason}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const period = `${formatDate(from)} to ${formatDate(to)}`;
      const sheets = [{
        name: 'Requests',
        title: `Compensation Report — ${period}`,
        columns: [
          { header: 'Request No', key: 'compensationNumber', width: 14 }, { header: 'Code', key: 'employeeCode', width: 8 },
          { header: 'Name', key: 'name', width: 24 }, { header: 'Department', key: 'department', width: 14 },
          { header: 'Work Date', key: 'workDateFmt', width: 12 }, { header: 'Start', key: 'startTime', width: 8 },
          { header: 'End', key: 'endTime', width: 8 }, { header: 'Type', key: 'type', width: 18 },
          { header: 'Hours', key: 'hours', width: 7 }, { header: 'Amount', key: 'amount', width: 12, numFmt: '#,##0.00' },
          { header: 'Reason', key: 'reason', width: 30 }, { header: 'HOD', key: 'hodStatus', width: 10 },
          { header: 'HR', key: 'hrStatus', width: 10 }, { header: 'Status', key: 'status', width: 12 },
        ],
        rows: records.map((r) => ({ ...r, workDateFmt: formatDate(r.workDate) })),
      }];
      if (!employeeId) {
        sheets.unshift({
          name: 'Employee Summary',
          title: `Compensation Summary — ${period}`,
          columns: [
            { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 24 },
            { header: 'Department', key: 'department', width: 14 }, { header: 'Requests', key: 'requests', width: 9 },
            { header: 'Approved', key: 'approved', width: 9 }, { header: 'Pending', key: 'pending', width: 9 },
            { header: 'Rejected', key: 'rejected', width: 9 }, { header: 'Approved Hours', key: 'approvedHours', width: 12 },
            { header: 'Approved Amount', key: 'approvedAmount', width: 14, numFmt: '#,##0.00' },
          ],
          rows: summary,
        });
      }
      await downloadExcel(`Compensation_Report_${from}_to_${to}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Compensation Report"
        subtitle={`Overtime allowance and comp-off requests with work date from ${formatDate(from)} to ${formatDate(to)}. Amount without a fixed value = hours × (gross ÷ 240) × 1.5, as in Payroll.`}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {s === 'all' ? 'All Statuses' : s}
          </button>
        ))}
      </div>

      {!loading && !error && records.length > 0 && (
        <StatCards items={[
          { label: 'Requests', value: records.length, tone: 'indigo' },
          { label: 'Approved', value: approved.length, tone: 'emerald' },
          { label: 'Pending', value: pending.length, tone: 'amber' },
          { label: 'Approved Hours', value: approvedHours, tone: 'sky' },
          { label: 'Approved Amount', value: formatMoney(approvedAmount), tone: 'gray' },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={records.length === 0} emptyText="No compensation requests in this period" />

      {!loading && !error && records.length > 0 && (
        <>
          {!employeeId && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Employee-wise Summary</h4>
              <ReportTable
                rowKey="employeeId"
                maxHeight="40vh"
                rows={summary}
                columns={[
                  { key: 'employeeCode', label: 'Code' },
                  { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
                  { key: 'department', label: 'Department' },
                  { key: 'requests', label: 'Requests', align: 'right' },
                  { key: 'approved', label: 'Approved', align: 'right' },
                  { key: 'pending', label: 'Pending', align: 'right' },
                  { key: 'rejected', label: 'Rejected', align: 'right' },
                  { key: 'approvedHours', label: 'Approved Hrs', align: 'right' },
                  { key: 'approvedAmount', label: 'Approved Amount', align: 'right', render: (r) => <span className="font-bold">{formatMoney(r.approvedAmount)}</span> },
                ]}
              />
            </div>
          )}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">All Requests</h4>
            <ReportTable rows={records} columns={recordColumns} />
          </div>
        </>
      )}
    </div>
  );
};

export default CompensationReport;

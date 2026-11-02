import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable, StatusBadge } from './ReportParts';
import { downloadExcel, formatDate } from './reportUtils';

const STATUSES = ['all', 'Approved', 'Pending HOD', 'Pending HR', 'Rejected'];

const LeaveReport = ({ departmentId, employeeId, search, from, to }) => {
  const [status, setStatus] = useState('all');
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('leave', { from, to, status, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const match = (r) => !term || [r.name, r.employeeCode].some((v) => String(v || '').toLowerCase().includes(term));
  const records = (data?.records || []).filter(match);
  const summary = (data?.summary || []).filter(match);
  const codes = data?.leaveCodes || [];

  const approved = records.filter((r) => r.status === 'Approved');
  const approvedDays = approved.reduce((s, r) => s + r.daysInRange, 0);
  const unpaidDays = approved.filter((r) => !r.paid).reduce((s, r) => s + r.daysInRange, 0);
  const pending = records.filter((r) => r.status.startsWith('Pending'));

  const recordColumns = [
    ...(employeeId ? [] : [
      { key: 'employeeCode', label: 'Code' },
      { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    ]),
    { key: 'leaveCode', label: 'Code' },
    { key: 'leaveType', label: 'Leave Type' },
    { key: 'startDate', label: 'From', render: (r) => formatDate(r.startDate) },
    { key: 'endDate', label: 'To', render: (r) => formatDate(r.endDate) },
    { key: 'totalDays', label: 'Days', align: 'right' },
    { key: 'daysInRange', label: 'In Period', align: 'right' },
    { key: 'paid', label: 'Paid', render: (r) => (r.paid ? 'Yes' : 'No') },
    { key: 'remark', label: 'Remark', render: (r) => <span className="block max-w-[200px] truncate" title={r.remark || ''}>{r.remark || '—'}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const period = `${formatDate(from)} to ${formatDate(to)}`;
      const sheets = [{
        name: 'Leave Requests',
        title: `Leave Report — ${period}`,
        columns: [
          { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 26 },
          { header: 'Department', key: 'department', width: 16 }, { header: 'Leave Code', key: 'leaveCode', width: 10 },
          { header: 'Leave Type', key: 'leaveType', width: 18 }, { header: 'From', key: 'fromFmt', width: 12 },
          { header: 'To', key: 'toFmt', width: 12 }, { header: 'Total Days', key: 'totalDays', width: 10 },
          { header: 'Days in Period', key: 'daysInRange', width: 12 }, { header: 'Paid', key: 'paidFmt', width: 7 },
          { header: 'Status', key: 'status', width: 12 }, { header: 'Applied On', key: 'appliedFmt', width: 12 },
          { header: 'Remark', key: 'remark', width: 30 },
        ],
        rows: records.map((r) => ({ ...r, fromFmt: formatDate(r.startDate), toFmt: formatDate(r.endDate), appliedFmt: formatDate(r.appliedOn), paidFmt: r.paid ? 'Yes' : 'No' })),
      }];
      if (!employeeId) {
        sheets.unshift({
          name: 'Employee Summary',
          title: `Leave Summary (approved days) — ${period}`,
          columns: [
            { header: 'Code', key: 'employeeCode', width: 8 }, { header: 'Name', key: 'name', width: 26 },
            { header: 'Department', key: 'department', width: 16 },
            ...codes.map((c) => ({ header: c, key: `code_${c}`, width: 8 })),
            { header: 'Approved Days', key: 'approvedDays', width: 12 }, { header: 'Paid Days', key: 'paidDays', width: 10 },
            { header: 'Unpaid Days', key: 'unpaidDays', width: 11 }, { header: 'Pending Days', key: 'pendingDays', width: 12 },
            { header: 'Rejected', key: 'rejected', width: 9 },
          ],
          rows: summary.map((s) => ({ ...s, ...Object.fromEntries(codes.map((c) => [`code_${c}`, s.byCode[c] || 0])) })),
        });
      }
      await downloadExcel(`Leave_Report_${from}_to_${to}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Leave Report"
        subtitle={`Leave requests overlapping ${formatDate(from)} to ${formatDate(to)}. "In Period" counts only the days inside the selected dates.`}
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
          { label: 'Approved Days', value: approvedDays, tone: 'emerald' },
          { label: 'Unpaid (LWP) Days', value: unpaidDays, tone: 'rose' },
          { label: 'Pending Requests', value: pending.length, tone: 'amber' },
          { label: 'Employees', value: summary.length, tone: 'gray' },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={records.length === 0} emptyText="No leave requests in this period" />

      {!loading && !error && records.length > 0 && (
        <>
          {!employeeId && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Employee-wise Summary (approved days)</h4>
              <ReportTable
                rowKey="employeeId"
                maxHeight="40vh"
                rows={summary}
                columns={[
                  { key: 'employeeCode', label: 'Code' },
                  { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
                  ...codes.map((c) => ({ key: `code_${c}`, label: c, align: 'right', render: (r) => r.byCode[c] || '—' })),
                  { key: 'approvedDays', label: 'Approved', align: 'right', render: (r) => <span className="font-bold">{r.approvedDays}</span> },
                  { key: 'unpaidDays', label: 'Unpaid Days', align: 'right' },
                  { key: 'pendingDays', label: 'Pending Days', align: 'right' },
                  { key: 'rejected', label: 'Rejected', align: 'right' },
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

export default LeaveReport;

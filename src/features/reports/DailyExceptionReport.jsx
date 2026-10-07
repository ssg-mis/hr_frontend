import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable } from './ReportParts';
import { downloadExcel, formatDate, formatMinutes } from './reportUtils';

// Late/early and overtime share one layout: employee summary (overall) or day-by-day list (employee-wise),
// both from biometric attendance with multiple sessions merged per day.
const mins = (v) => (v ? `${v} min` : '—');

const CONFIG = {
  lateEarly: {
    path: 'late-early',
    title: 'Late Arrival / Early Leaving Report',
    subtitle: 'Days with a late check-in or an early check-out against the assigned shift.',
    empty: 'No late arrivals or early exits in this period',
    file: 'Late_Early_Report',
    summaryCols: [
      { key: 'lateDays', label: 'Late Days', align: 'right' },
      { key: 'lateMinutes', label: 'Late Time', align: 'right', render: (r) => formatMinutes(r.lateMinutes), excel: (r) => r.lateMinutes, excelHeader: 'Late Minutes' },
      { key: 'avgLate', label: 'Avg Late', align: 'right', render: (r) => mins(r.lateDays ? Math.round(r.lateMinutes / r.lateDays) : 0), excel: (r) => (r.lateDays ? Math.round(r.lateMinutes / r.lateDays) : 0), excelHeader: 'Avg Late (min)' },
      { key: 'earlyDays', label: 'Early Days', align: 'right' },
      { key: 'earlyMinutes', label: 'Early Time', align: 'right', render: (r) => formatMinutes(r.earlyMinutes), excel: (r) => r.earlyMinutes, excelHeader: 'Early Minutes' },
    ],
    recordCols: [
      { key: 'lateMinutes', label: 'Late', align: 'right', render: (r) => mins(r.lateMinutes), excelHeader: 'Late (min)' },
      { key: 'earlyMinutes', label: 'Early Out', align: 'right', render: (r) => mins(r.earlyMinutes), excelHeader: 'Early Out (min)' },
    ],
    stats: (summary, records) => [
      { label: 'Employees', value: summary.length, tone: 'indigo' },
      { label: 'Late Days', value: summary.reduce((s, r) => s + r.lateDays, 0), tone: 'amber' },
      { label: 'Total Late Time', value: formatMinutes(summary.reduce((s, r) => s + r.lateMinutes, 0)), tone: 'rose' },
      { label: 'Early-out Days', value: summary.reduce((s, r) => s + r.earlyDays, 0), tone: 'sky' },
      { label: 'Total Early Time', value: formatMinutes(summary.reduce((s, r) => s + r.earlyMinutes, 0)), tone: 'gray', hint: `${records.length} day records` },
    ],
  },
  overtime: {
    path: 'overtime',
    title: 'Overtime Report',
    subtitle: 'Biometric overtime per day, with approved overtime-allowance hours for the same period alongside.',
    empty: 'No overtime recorded in this period',
    file: 'Overtime_Report',
    summaryCols: [
      { key: 'otDays', label: 'OT Days', align: 'right' },
      { key: 'overtimeMinutes', label: 'Biometric OT', align: 'right', render: (r) => formatMinutes(r.overtimeMinutes), excel: (r) => Math.round((r.overtimeMinutes / 60) * 100) / 100, excelHeader: 'Biometric OT (hrs)' },
      { key: 'approvedHours', label: 'Approved OT Hrs', align: 'right', excelHeader: 'Approved OT Allowance (hrs)' },
    ],
    recordCols: [
      { key: 'overtimeMinutes', label: 'OT', align: 'right', render: (r) => formatMinutes(r.overtimeMinutes), excel: (r) => r.overtimeMinutes, excelHeader: 'OT (min)' },
    ],
    stats: (summary, records) => [
      { label: 'Employees', value: summary.length, tone: 'indigo' },
      { label: 'OT Days', value: records.length, tone: 'sky' },
      { label: 'Biometric OT', value: formatMinutes(summary.reduce((s, r) => s + r.overtimeMinutes, 0)), tone: 'amber' },
      { label: 'Approved OT Hours', value: summary.reduce((s, r) => s + r.approvedHours, 0), tone: 'emerald', hint: 'Overtime-allowance requests' },
      { label: 'Avg OT / Day', value: formatMinutes(records.length ? Math.round(summary.reduce((s, r) => s + r.overtimeMinutes, 0) / records.length) : 0), tone: 'gray' },
    ],
  },
};

const BASE_RECORD_COLS = [
  { key: 'date', label: 'Date', render: (r) => formatDate(r.date), excel: (r) => formatDate(r.date) },
  { key: 'shift', label: 'Shift' },
  { key: 'inTime', label: 'In' },
  { key: 'outTime', label: 'Out' },
  { key: 'workingMinutes', label: 'Working', render: (r) => formatMinutes(r.workingMinutes), excel: (r) => formatMinutes(r.workingMinutes) },
];

const toExcelColumns = (cols) => cols.map((c) => ({ header: c.excelHeader || c.label, key: c.key, width: 13 }));
const toExcelRows = (rows, cols) => rows.map((r) => Object.fromEntries(cols.map((c) => [c.key, c.excel ? c.excel(r) : (r[c.key] ?? '')])));

const DailyExceptionReport = ({ kind, departmentId, employeeId, search, from, to }) => {
  const cfg = CONFIG[kind];
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport(cfg.path, { from, to, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const match = (r) => !term || [r.name, r.employeeCode].some((v) => String(v || '').toLowerCase().includes(term));
  const records = (data?.records || []).filter(match);
  const summary = (data?.summary || []).filter(match);

  const empCols = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span>, excel: (r) => r.name },
    { key: 'department', label: 'Department' },
  ];
  const summaryColumns = [...empCols, ...cfg.summaryCols];
  const recordColumns = [...(employeeId ? [] : empCols), ...BASE_RECORD_COLS, ...cfg.recordCols];

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const title = `${cfg.title} — ${formatDate(from)} to ${formatDate(to)}`;
      const daily = [...empCols, ...BASE_RECORD_COLS, ...cfg.recordCols];
      await downloadExcel(`${cfg.file}_${from}_to_${to}.xlsx`, [
        ...(employeeId ? [] : [{ name: 'Employee Summary', title, columns: toExcelColumns(summaryColumns), rows: toExcelRows(summary, summaryColumns) }]),
        { name: 'Day-wise', title, columns: toExcelColumns(daily), rows: toExcelRows(records, daily) },
      ]);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={cfg.title}
        subtitle={`${cfg.subtitle} ${formatDate(from)} to ${formatDate(to)}.${employeeId ? '' : ' Pick an employee to see each day.'}`}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      {!loading && !error && records.length > 0 && <StatCards items={cfg.stats(summary, records)} />}

      <ReportStatus loading={loading} error={error} empty={records.length === 0} emptyText={cfg.empty} />

      {!loading && !error && records.length > 0 && (
        employeeId
          ? <ReportTable rowKey="date" rows={records} columns={recordColumns} />
          : <ReportTable rowKey="employeeId" rows={summary} columns={summaryColumns} />
      )}
    </div>
  );
};

export default DailyExceptionReport;

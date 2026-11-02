import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable } from './ReportParts';
import { downloadExcel, formatMinutes, formatMonthLabel } from './reportUtils';

const COLS = [
  { key: 'present', label: 'Present' },
  { key: 'weekOffWorked', label: 'Worked on WO' },
  { key: 'holidayWorked', label: 'Worked on Holiday' },
  { key: 'paidLeave', label: 'Paid Leave' },
  { key: 'lwp', label: 'LWP' },
  { key: 'weekOff', label: 'WO (paid)' },
  { key: 'holiday', label: 'Holiday (paid)' },
  { key: 'absent', label: 'Absent' },
  { key: 'paidDays', label: 'Paid Days' },
  { key: 'lateDays', label: 'Late Days' },
];

const sum = (rows, key) => rows.reduce((s, r) => s + (r[key] || 0), 0);

const MonthlyAttendanceReport = ({ departmentId, employeeId, search, fromMonth, toMonth }) => {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('monthly-attendance', { fromMonth, toMonth, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const records = (data?.records || []).filter((r) =>
    !term || [r.name, r.employeeCode].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const months = Array.from(new Set(records.map((r) => r.month))).sort();
  const period = fromMonth === toMonth ? formatMonthLabel(fromMonth) : `${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)}`;

  const byMonth = months.map((month) => {
    const rows = records.filter((r) => r.month === month);
    return { month, employees: rows.length, ...Object.fromEntries(COLS.map((c) => [c.key, sum(rows, c.key)])), overtimeMinutes: sum(rows, 'overtimeMinutes') };
  });

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExcel(`Monthly_Attendance_${fromMonth}_to_${toMonth}.xlsx`, [
        {
          name: 'Employee-Month',
          title: `Monthly Attendance — ${period}`,
          columns: [
            { header: 'Month', key: 'monthLabel', width: 14 }, { header: 'Code', key: 'employeeCode', width: 8 },
            { header: 'Name', key: 'name', width: 26 }, { header: 'Department', key: 'department', width: 16 },
            { header: 'Days', key: 'daysInMonth', width: 6 },
            ...COLS.map((c) => ({ header: c.label, key: c.key, width: 10 })),
            { header: 'Working Hrs', key: 'workingHours', width: 11 }, { header: 'OT Hrs', key: 'otHours', width: 9 },
          ],
          rows: records.map((r) => ({
            ...r, monthLabel: formatMonthLabel(r.month),
            workingHours: Math.round((r.workingMinutes / 60) * 10) / 10, otHours: Math.round((r.overtimeMinutes / 60) * 10) / 10,
          })),
        },
        {
          name: 'Month Totals',
          title: `Monthly Attendance Totals — ${period}`,
          columns: [{ header: 'Month', key: 'monthLabel', width: 14 }, { header: 'Employees', key: 'employees', width: 10 }, ...COLS.map((c) => ({ header: c.label, key: c.key, width: 10 }))],
          rows: byMonth.map((m) => ({ ...m, monthLabel: formatMonthLabel(m.month) })),
        },
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
        title={`Monthly Attendance — ${period}`}
        subtitle="Month-wise attendance totals per employee, using the same rules as the Attendance Register and Payroll."
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      {!loading && !error && records.length > 0 && (
        <StatCards items={[
          { label: employeeId ? 'Months' : 'Employee-Months', value: records.length, tone: 'indigo' },
          { label: 'Present (man-days)', value: sum(records, 'present'), tone: 'emerald' },
          { label: 'Absent (man-days)', value: sum(records, 'absent'), tone: 'rose' },
          { label: 'Paid Days', value: sum(records, 'paidDays'), tone: 'sky' },
          { label: 'OT', value: formatMinutes(sum(records, 'overtimeMinutes')), tone: 'amber', hint: `${sum(records, 'lateDays')} late days` },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={records.length === 0} />

      {!loading && !error && records.length > 0 && (
        <>
          {!employeeId && byMonth.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Month Totals</h4>
              <ReportTable
                rowKey="month"
                maxHeight="none"
                rows={byMonth}
                columns={[
                  { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month) },
                  { key: 'employees', label: 'Employees', align: 'right' },
                  ...COLS.map((c) => ({ key: c.key, label: c.label, align: 'right' })),
                ]}
              />
            </div>
          )}
          <ReportTable
            rowKey="_key"
            rows={records.map((r) => ({ ...r, _key: `${r.month}-${r.employeeId}` }))}
            columns={[
              { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month) },
              ...(employeeId ? [] : [
                { key: 'employeeCode', label: 'Code' },
                { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
              ]),
              ...COLS.map((c) => ({
                key: c.key, label: c.label, align: 'right',
                render: c.key === 'paidDays' ? (r) => <span className="font-bold text-indigo-700">{r.paidDays}</span> : undefined,
              })),
              { key: 'workingMinutes', label: 'Working', render: (r) => formatMinutes(r.workingMinutes) },
              { key: 'overtimeMinutes', label: 'OT', render: (r) => (r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : '—') },
            ]}
          />
        </>
      )}
    </div>
  );
};

export default MonthlyAttendanceReport;

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable } from './ReportParts';
import { downloadExcel, formatDate, formatMinutes, formatMonthLabel } from './reportUtils';

const CODE_STYLES = {
  P: 'bg-emerald-100 text-emerald-800',
  WOP: 'bg-teal-100 text-teal-800',
  HP: 'bg-teal-100 text-teal-800',
  A: 'bg-rose-100 text-rose-700',
  WO: 'bg-gray-100 text-gray-500',
  H: 'bg-violet-100 text-violet-700',
  LWP: 'bg-orange-100 text-orange-700',
};
const codeClass = (code) => CODE_STYLES[code] || (code ? 'bg-sky-100 text-sky-700' : 'text-gray-300');

const EXCEL_FILLS = { P: 'FFD1FAE5', WOP: 'FFCCFBF1', HP: 'FFCCFBF1', A: 'FFFFE4E6', WO: 'FFF3F4F6', H: 'FFEDE9FE', LWP: 'FFFFEDD5' };

const LEGEND = [
  ['P', 'Present'], ['A', 'Absent'], ['WO', 'Week off (paid)'], ['WOP', 'Worked on week off'],
  ['H', 'Holiday (paid)'], ['HP', 'Worked on holiday'], ['CL / SL …', 'Paid leave (leave code)'], ['LWP', 'Leave without pay'],
];

const TOTAL_COLS = [
  { key: 'present', label: 'P' },
  { key: 'paidLeave', label: 'PL' },
  { key: 'lwp', label: 'LWP' },
  { key: 'weekOff', label: 'WO' },
  { key: 'holiday', label: 'H' },
  { key: 'absent', label: 'A' },
  { key: 'paidDays', label: 'Paid Days' },
];

const AttendanceRegisterReport = ({ departmentId, employeeId, search, month }) => {
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('attendance-register', { month, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const employees = (data?.employees || []).filter((e) =>
    !term || [e.name, e.employeeCode].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const days = data?.days || [];
  const single = employeeId && employees.length === 1 ? employees[0] : null;

  const sum = (key) => employees.reduce((s, e) => s + (e.totals[key] || 0), 0);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const sheets = [{
        name: 'Attendance Register',
        title: `Attendance Register — ${formatMonthLabel(month)}`,
        columns: [
          { header: 'Code', key: 'employeeCode', width: 8 },
          { header: 'Name', key: 'name', width: 24 },
          { header: 'Department', key: 'department', width: 14 },
          ...days.map((d) => ({ header: `${d.day}\n${d.weekday.slice(0, 2)}`, key: `d${d.day}`, width: 5 })),
          ...TOTAL_COLS.map((c) => ({ header: c.label, key: c.key, width: 7 })),
          { header: 'Late Days', key: 'lateDays', width: 7 },
          { header: 'OT Hrs', key: 'otHours', width: 7 },
        ],
        rows: employees.map((e) => ({
          employeeCode: e.employeeCode,
          name: e.name,
          department: e.department || '',
          ...Object.fromEntries(e.codes.map((c, i) => [`d${i + 1}`, c])),
          ...e.totals,
          otHours: Math.round((e.totals.overtimeMinutes / 60) * 100) / 100,
        })),
        cellStyle: (key, value) => {
          if (!/^d\d+$/.test(key || '') || !value) return null;
          const argb = EXCEL_FILLS[value] || 'FFE0F2FE';
          return { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb } }, alignment: { horizontal: 'center' } };
        },
      }];
      if (single?.detail) {
        sheets.push({
          name: 'Daily Detail',
          title: `${single.name} (${single.employeeCode}) — ${formatMonthLabel(month)}`,
          columns: [
            { header: 'Date', key: 'date', width: 12 }, { header: 'Day', key: 'weekday', width: 6 },
            { header: 'Status', key: 'code', width: 8 }, { header: 'In', key: 'inTime', width: 8 },
            { header: 'Out', key: 'outTime', width: 8 }, { header: 'Working', key: 'working', width: 10 },
            { header: 'Late (min)', key: 'lateMinutes', width: 9 }, { header: 'Early (min)', key: 'earlyMinutes', width: 9 },
            { header: 'OT', key: 'ot', width: 9 }, { header: 'Holiday', key: 'holiday', width: 18 },
          ],
          rows: single.detail.map((d) => ({ ...d, date: formatDate(d.date), working: formatMinutes(d.workingMinutes), ot: formatMinutes(d.overtimeMinutes) })),
        });
      }
      await downloadExcel(`Attendance_Register_${month}${single ? `_${single.employeeCode}` : ''}.xlsx`, sheets);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title={`Attendance Register — ${formatMonthLabel(month)}`}
        subtitle="Muster roll from biometric attendance, approved leaves, weekly offs and company holidays (same rules as Payroll)."
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || employees.length === 0}
      />

      {!loading && !error && employees.length > 0 && (
        <StatCards items={single ? [
          { label: 'Present Days', value: single.totals.present, tone: 'emerald', hint: `${single.totals.weekOffWorked} on week off · ${single.totals.holidayWorked} on holiday` },
          { label: 'Paid Days', value: single.totals.paidDays, tone: 'indigo' },
          { label: 'Absent', value: single.totals.absent, tone: 'rose' },
          { label: 'Leaves', value: `${single.totals.paidLeave} paid · ${single.totals.lwp} LWP`, tone: 'sky' },
          { label: 'Late Days', value: single.totals.lateDays, tone: 'amber', hint: `${formatMinutes(single.totals.lateMinutes)} total · OT ${formatMinutes(single.totals.overtimeMinutes)}` },
        ] : [
          { label: 'Employees', value: employees.length, tone: 'indigo' },
          { label: 'Present (man-days)', value: sum('present'), tone: 'emerald' },
          { label: 'Absent (man-days)', value: sum('absent'), tone: 'rose' },
          { label: 'Leaves', value: `${sum('paidLeave')} paid · ${sum('lwp')} LWP`, tone: 'sky' },
          { label: 'Late Arrivals', value: sum('lateDays'), tone: 'amber' },
        ]} />
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-gray-600">
        {LEGEND.map(([code, label]) => (
          <span key={code} className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded font-bold ${codeClass(code.split(' ')[0])}`}>{code}</span>{label}
          </span>
        ))}
        <span className="text-gray-400">A week off / holiday is paid only if present or on paid leave the day before or after.</span>
      </div>

      <ReportStatus loading={loading} error={error} empty={employees.length === 0} />

      {!loading && !error && employees.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-auto" style={{ maxHeight: single ? 'none' : '65vh' }}>
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 bg-gray-50 px-3 py-2 text-left font-bold text-gray-500 uppercase border-b border-r border-gray-200 min-w-[200px]">Employee</th>
                {days.map((d) => (
                  <th key={d.day} title={d.holiday || ''} className={`px-1 py-1.5 text-center font-bold border-b border-gray-200 min-w-[34px] ${d.holiday ? 'text-violet-700 bg-violet-50' : d.weekday === 'SUN' ? 'text-gray-400' : 'text-gray-600'}`}>
                    <div>{d.day}</div>
                    <div className="text-[9px] font-semibold">{d.weekday.slice(0, 2)}</div>
                  </th>
                ))}
                {TOTAL_COLS.map((c) => (
                  <th key={c.key} className="px-2 py-1.5 text-center font-bold text-indigo-700 bg-indigo-50 border-b border-l border-gray-200 whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/70">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5 border-b border-r border-gray-100">
                    <div className="font-semibold text-gray-900 truncate max-w-[220px]">{e.name}</div>
                    <div className="text-[10px] text-gray-500">{e.employeeCode} · {e.department || '—'}</div>
                  </td>
                  {e.codes.map((c, i) => (
                    <td key={i} className="px-0.5 py-1 text-center border-b border-gray-100">
                      {c ? <span className={`inline-block min-w-[28px] px-1 py-0.5 rounded text-[10px] font-bold ${codeClass(c)}`}>{c}</span> : <span className="text-gray-200">·</span>}
                    </td>
                  ))}
                  {TOTAL_COLS.map((c) => (
                    <td key={c.key} className="px-2 py-1 text-center font-bold text-gray-800 border-b border-l border-gray-100 tabular-nums">{e.totals[c.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {single?.detail && !loading && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Daily Detail — {single.name}</h4>
          <ReportTable
            rowKey="date"
            maxHeight="none"
            rows={single.detail.filter((d) => d.code)}
            columns={[
              { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
              { key: 'weekday', label: 'Day' },
              { key: 'code', label: 'Status', render: (r) => <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${codeClass(r.code)}`}>{r.code}</span> },
              { key: 'inTime', label: 'In' },
              { key: 'outTime', label: 'Out' },
              { key: 'workingMinutes', label: 'Working', render: (r) => (r.workingMinutes ? formatMinutes(r.workingMinutes) : '—') },
              { key: 'lateMinutes', label: 'Late', align: 'right', render: (r) => (r.lateMinutes ? `${r.lateMinutes} min` : '—') },
              { key: 'earlyMinutes', label: 'Early Out', align: 'right', render: (r) => (r.earlyMinutes ? `${r.earlyMinutes} min` : '—') },
              { key: 'overtimeMinutes', label: 'OT', render: (r) => (r.overtimeMinutes ? formatMinutes(r.overtimeMinutes) : '—') },
              { key: 'holiday', label: 'Holiday' },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default AttendanceRegisterReport;

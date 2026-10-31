import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable, StatusBadge } from './ReportParts';
import { downloadExcel, formatMoney, formatMonthLabel } from './reportUtils';

// PF and ESIC share one layout: month-wise totals + one row per employee per month, from saved payroll runs.
const CONFIG = {
  pf: {
    path: 'pf',
    title: 'PF Report',
    subtitle: 'Employee 12% (deducted) and employer 12% (EPS 8.33% + EPF 3.67%) on EPF wages = earned basic, capped at ₹15,000.',
    idCols: [{ key: 'uanNo', label: 'UAN' }, { key: 'pfNo', label: 'PF No' }],
    wageKey: 'epfWages',
    wageLabel: 'EPF Wages',
    employeeKey: 'employeePf',
    employeeLabel: 'Employee 12%',
    employerCols: [
      { key: 'employerEps', label: 'Employer EPS 8.33%' },
      { key: 'employerEpf', label: 'Employer EPF 3.67%' },
    ],
    employerKey: 'employerTotal',
  },
  esic: {
    path: 'esic',
    title: 'ESIC Report',
    subtitle: 'Employee 0.75% (deducted) and employer 3.25% on ESIC wages = earned gross for the month.',
    idCols: [{ key: 'esicNo', label: 'ESIC IP No' }],
    wageKey: 'esicWages',
    wageLabel: 'ESIC Wages',
    employeeKey: 'employeeEsic',
    employeeLabel: 'Employee 0.75%',
    employerCols: [],
    employerKey: 'employerEsic',
    employerLabel: 'Employer 3.25%',
  },
};

const sumBy = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

const StatutoryReport = ({ kind, departmentId, employeeId, search, fromMonth, toMonth }) => {
  const cfg = CONFIG[kind];
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport(cfg.path, { fromMonth, toMonth, departmentId, employeeId });

  const term = search.trim().toLowerCase();
  const records = (data?.records || []).filter((r) =>
    !term || [r.name, r.employeeCode, r.uanNo, r.esicNo].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const unsaved = data?.unsavedMonths || [];
  const drafts = new Set(records.filter((r) => r.status === 'Draft').map((r) => r.month));

  const employerCols = cfg.employerCols.length ? cfg.employerCols : [{ key: cfg.employerKey, label: cfg.employerLabel }];
  const moneyCols = [
    { key: cfg.wageKey, label: cfg.wageLabel },
    { key: cfg.employeeKey, label: cfg.employeeLabel },
    ...employerCols,
    ...(cfg.employerCols.length ? [{ key: cfg.employerKey, label: 'Employer Total' }] : []),
    { key: 'total', label: 'Total Contribution' },
  ];

  // Month-wise totals
  const byMonth = Array.from(records.reduce((map, r) => {
    if (!map.has(r.month)) map.set(r.month, []);
    map.get(r.month).push(r);
    return map;
  }, new Map()).entries()).map(([month, rows]) => ({
    month,
    employees: rows.length,
    ...Object.fromEntries(moneyCols.map((c) => [c.key, sumBy(rows, c.key)])),
  }));

  const period = fromMonth === toMonth ? formatMonthLabel(fromMonth) : `${formatMonthLabel(fromMonth)} to ${formatMonthLabel(toMonth)}`;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const money = (c) => ({ header: c.label, key: c.key, width: 14, numFmt: '#,##0' });
      await downloadExcel(`${cfg.title.replace(' ', '_')}_${fromMonth}_to_${toMonth}.xlsx`, [
        {
          name: 'Employee-wise',
          title: `${cfg.title} — ${period}`,
          columns: [
            { header: 'Month', key: 'monthLabel', width: 10 }, { header: 'Code', key: 'employeeCode', width: 8 },
            { header: 'Name', key: 'name', width: 26 }, { header: "Father's Name", key: 'fatherName', width: 22 },
            ...cfg.idCols.map((c) => ({ header: c.label, key: c.key, width: 16 })),
            { header: 'Paid Days', key: 'paidDays', width: 9 }, { header: 'Earned Gross', key: 'earnedGross', width: 12, numFmt: '#,##0' },
            ...moneyCols.map(money), { header: 'Payroll Status', key: 'status', width: 12 },
          ],
          rows: records.map((r) => ({ ...r, monthLabel: formatMonthLabel(r.month) })),
        },
        {
          name: 'Month-wise',
          title: `${cfg.title} — Month-wise Totals`,
          columns: [{ header: 'Month', key: 'monthLabel', width: 14 }, { header: 'Employees', key: 'employees', width: 10 }, ...moneyCols.map(money)],
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
        title={`${cfg.title} — ${period}`}
        subtitle={cfg.subtitle}
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || records.length === 0}
      />

      {!loading && !error && (unsaved.length > 0 || drafts.size > 0) && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {unsaved.length > 0 && (
              <p><span className="font-bold">Payroll not saved for:</span> {unsaved.map(formatMonthLabel).join(', ')}. Open Payroll Creation and click “Save Payroll Run” for these months.</p>
            )}
            {drafts.size > 0 && (
              <p><span className="font-bold">Still in Draft:</span> {[...drafts].sort().map(formatMonthLabel).join(', ')}. Figures may change until payroll is processed.</p>
            )}
          </div>
        </div>
      )}

      {!loading && !error && records.length > 0 && (
        <StatCards items={[
          { label: employeeId ? 'Months' : 'Employees', value: employeeId ? byMonth.length : new Set(records.map((r) => r.employeeId)).size, tone: 'indigo' },
          { label: cfg.wageLabel, value: formatMoney(sumBy(records, cfg.wageKey)), tone: 'sky' },
          { label: 'Employee Share', value: formatMoney(sumBy(records, cfg.employeeKey)), tone: 'amber', hint: 'Deducted from salary' },
          { label: 'Employer Share', value: formatMoney(sumBy(records, cfg.employerKey)), tone: 'emerald' },
          { label: 'Total to Deposit', value: formatMoney(sumBy(records, 'total')), tone: 'gray' },
        ]} />
      )}

      <ReportStatus
        loading={loading}
        error={error}
        empty={records.length === 0}
        emptyText={unsaved.length > 0 ? 'No saved payroll with contributions for this period' : `No ${kind.toUpperCase()} contributions in this period`}
      />

      {!loading && !error && records.length > 0 && (
        <>
          {!employeeId && byMonth.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Month-wise Totals</h4>
              <ReportTable
                rowKey="month"
                maxHeight="none"
                rows={byMonth}
                columns={[
                  { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month) },
                  { key: 'employees', label: 'Employees', align: 'right' },
                  ...moneyCols.map((c) => ({ key: c.key, label: c.label, align: 'right', render: (r) => formatMoney(r[c.key]) })),
                ]}
              />
            </div>
          )}
          <div className="space-y-2">
            {!employeeId && byMonth.length > 1 && <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Employee-wise</h4>}
            <ReportTable
              rows={records}
              columns={[
                { key: 'month', label: 'Month', render: (r) => formatMonthLabel(r.month) },
                ...(employeeId ? [] : [
                  { key: 'employeeCode', label: 'Code' },
                  { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
                ]),
                ...cfg.idCols,
                { key: 'paidDays', label: 'Paid Days', align: 'right' },
                ...moneyCols.map((c) => ({ key: c.key, label: c.label, align: 'right', render: (r) => formatMoney(r[c.key]) })),
                { key: 'status', label: 'Payroll', render: (r) => <StatusBadge status={r.status} /> },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default StatutoryReport;

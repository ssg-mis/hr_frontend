import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Save, Search, AlertTriangle, RotateCcw, Undo2, Trash2, ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import adjustmentPayrollApi from '../features/adjustment-payroll/adjustmentPayroll.api';
import { applyEdit, revertCell, resetRow, fromDbRow } from '../features/adjustment-payroll/adjustmentPayroll.utils';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmtMoney = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const PAGE_SIZE = 50;

// Column definitions — same order as the Payroll A–Z table.
// `group: 'ded'` columns sit under the DEDUCTIONS header.
const COLUMNS = [
  { key: 'employeeCode', label: 'EMPCODE', type: 'text', w: 'w-20' },
  { key: 'employeeName', label: 'NAME', type: 'text', w: 'w-44' },
  { key: 'uanNo', label: 'UAN NO.', type: 'text', w: 'w-28' },
  { key: 'ipNo', label: 'IP No.', type: 'text', w: 'w-28' },
  { key: 'periodDays', label: 'TOTAL_DAYS', w: 'w-14' },
  { key: 'daysWorked', label: 'PAID_DAYS', w: 'w-14', tint: 'bg-blue-50' },
  { key: 'presentDays', label: 'PRESENT_DAYS', w: 'w-14', tint: 'bg-emerald-50' },
  { key: 'woDays', label: 'WO', w: 'w-12', tint: 'bg-purple-50' },
  { key: 'unpaidLeaves', label: 'ABSENT_DAYS', w: 'w-14', tint: 'bg-rose-50' },
  { key: 'paidLeaves', label: 'LEAVE', w: 'w-12', tint: 'bg-amber-50' },
  { key: 'otHrs', label: 'OT HRS', w: 'w-14' },
  { key: 'basicRate', label: 'BASIC+DA', w: 'w-24' },
  { key: 'earnBasic', label: 'EARN BASIC+DA', w: 'w-24' },
  { key: 'allowanceRate', label: 'ALLOW_RATE', w: 'w-24' },
  { key: 'earnAllowance', label: 'EARN ALLOW', w: 'w-24' },
  { key: 'grossTotal', label: 'GROSS TOTAL', w: 'w-24', bold: true },
  // Payroll shows washing allowance + OT amount together in this column; edits change the washing part.
  { key: 'compensation', label: 'WASHING ALL.', w: 'w-24', washing: true },
  { key: 'earnGross', label: 'EARN GROSS', w: 'w-24', bold: true, tint: 'bg-emerald-50' },
  { key: 'epfWages', label: 'EPF WAGES', w: 'w-24' },
  { key: 'pfDeduction', label: 'PF', w: 'w-20', group: 'ded' },
  { key: 'lwfDeduction', label: 'LABOUR WELFARE FUND', w: 'w-20', group: 'ded' },
  { key: 'esicDeduction', label: 'ESIC', w: 'w-20', group: 'ded' },
  { key: 'emiDeduction', label: 'ADV', w: 'w-20', group: 'ded' },
  { key: 'otherDeductions', label: 'Penalty', w: 'w-20', group: 'ded' },
  { key: 'absentDeduction', label: 'ABSENT', w: 'w-20', group: 'ded' },
  { key: 'canteenDeduction', label: 'Canteen', w: 'w-20', group: 'ded' },
  { key: 'totalDeductions', label: 'TOTAL DEDUCTION', w: 'w-24', group: 'ded', bold: true },
  { key: 'netSalary', label: 'NET SALARY', w: 'w-24', bold: true, tint: 'bg-blue-50' },
  { key: 'diwaliBonus', label: 'Diwali Bonus', w: 'w-20' },
  { key: 'netPayAmount', label: 'NET PAY AMOUNT', w: 'w-28', bold: true, tint: 'bg-emerald-100' },
  { key: 'paymentMode', label: 'PAY-MODE', type: 'select', options: ['BANK', 'CASH'], w: 'w-20' },
  { key: 'bankAccountNo', label: 'BANK A/C NO.', type: 'text', w: 'w-32' },
  { key: 'ifscCode', label: 'IFSC', type: 'text', w: 'w-24' },
  { key: 'remarks', label: 'REMARK', type: 'text', w: 'w-32' },
  { key: 'status', label: 'STATUS', type: 'select', options: ['Draft', 'Processed', 'Paid'], w: 'w-24' },
];
const DED_COUNT = COLUMNS.filter((c) => c.group === 'ded').length;

const cellValue = (row, col) => (col.washing ? (row.compensation || 0) + (row.otAmount || 0) : row[col.key]);
const originalValue = (row, col) => {
  const o = row.originalValues || {};
  return col.washing ? (Number(o.compensation) || 0) + (Number(o.otAmount) || 0) : o[col.key];
};

// One editable cell. Numbers/text commit on blur or Enter so typing "12." is not cut short.
const EditCell = ({ col, value, edited, original, onCommit, onRevert }) => {
  const isNum = !col.type;
  const shown = isNum ? String(Number(value || 0)) : (value ?? '');
  const [draft, setDraft] = useState(shown);
  useEffect(() => setDraft(shown), [shown]);

  const commit = () => {
    if (draft === shown) return;
    if (isNum && draft.trim() !== '' && !Number.isFinite(Number(draft))) {
      setDraft(shown);
      return;
    }
    onCommit(draft);
  };

  const base = `${col.w} border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isNum ? 'text-right font-mono' : ''} ${
    edited ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold' : `${col.tint || 'bg-white'} border-gray-200 ${col.bold ? 'font-bold text-gray-900' : 'text-gray-700'}`
  }`;
  const title = edited ? `Original: ${isNum ? fmtMoney(original) : (original || '—')}` : undefined;

  return (
    <div className="flex items-center gap-0.5" title={title}>
      {col.type === 'select' ? (
        <select value={value || ''} onChange={(e) => onCommit(e.target.value)} className={base}>
          {col.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type="text"
          inputMode={isNum ? 'decimal' : undefined}
          value={draft}
          onChange={(e) => setDraft(isNum ? e.target.value.replace(/[^0-9.\-]/g, '') : e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(shown); } }}
          className={base}
        />
      )}
      {edited && (
        <button onClick={onRevert} title={`Revert to original (${isNum ? fmtMoney(original) : original || '—'})`} className="text-amber-600 hover:text-amber-800 shrink-0">
          <Undo2 size={12} />
        </button>
      )}
    </div>
  );
};

const AdjustmentPayroll = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') || currentMonth();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [editedOnly, setEditedOnly] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adjustmentPayrollApi.list(period);
      setRows((res?.data || []).map(fromDbRow));
      setMeta(res?.meta || null);
      setDirty(false);
    } catch (err) {
      toast.error(err.message || 'Failed to load adjustment payroll');
      setRows([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const changePeriod = (next) => {
    if (!next || next === period) return;
    if (dirty && !window.confirm('You have unsaved changes. Discard them and switch month?')) return;
    setSearchParams({ period: next });
  };

  const updateRow = (employeeId, fn) => {
    setRows((prev) => prev.map((r) => (r.employeeId === employeeId ? fn(r) : r)));
    setDirty(true);
  };

  const commitCell = (row, col, raw) => {
    if (col.washing) {
      // Displayed value = washing + OT amount; store only the washing part.
      const washing = (Number(raw) || 0) - (row.otAmount || 0);
      updateRow(row.employeeId, (r) => applyEdit(r, 'compensation', washing));
    } else {
      updateRow(row.employeeId, (r) => applyEdit(r, col.key, raw));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adjustmentPayrollApi.save(period, rows);
      toast.success('Adjustment payroll saved');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to save adjustment payroll');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    if (!window.confirm('Reset ALL edits back to the copied payroll values?\n\nThis is applied after you click Save Adjustments.')) return;
    setRows((prev) => prev.map((r) => ((r.editedFields || []).length ? resetRow(r) : r)));
    setDirty(true);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete the adjustment payroll for ${period}?\n\nThe original payroll is NOT affected.`)) return;
    try {
      await adjustmentPayrollApi.remove(period);
      toast.success('Adjustment payroll deleted');
      await load();
    } catch (err) {
      toast.error(err.message || 'Failed to delete adjustment payroll');
    }
  };

  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(), [rows]);
  const branches = useMemo(() => [...new Set(rows.map((r) => r.branchName).filter(Boolean))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (!q || (r.employeeName || '').toLowerCase().includes(q) || (r.employeeCode || '').toLowerCase().includes(q)) &&
      (deptFilter === 'All' || r.department === deptFilter) &&
      (branchFilter === 'All' || r.branchName === branchFilter) &&
      (modeFilter === 'All' || r.paymentMode === modeFilter) &&
      (!editedOnly || (r.editedFields || []).length > 0)
    );
  }, [rows, search, deptFilter, branchFilter, modeFilter, editedOnly]);

  useEffect(() => setPage(1), [search, deptFilter, branchFilter, modeFilter, editedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => {
    let original = 0, adjusted = 0, edited = 0;
    for (const r of rows) {
      original += Number(r.originalValues?.netPayAmount) || 0;
      adjusted += Number(r.netPayAmount) || 0;
      if ((r.editedFields || []).length) edited += 1;
    }
    return { original, adjusted, diff: adjusted - original, edited };
  }, [rows]);

  const selectCls = 'border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SlidersHorizontal className="text-indigo-600 w-7 h-7" />
            Adjustment Payroll
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Editable copy of the saved payroll. Changes here never affect the original payroll.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/payroll')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center gap-1.5 shadow-sm text-sm">
            <ArrowLeft size={16} /> Payroll
          </button>
          <input type="month" value={period} onChange={(e) => changePeriod(e.target.value)} className={selectCls} />
          {totals.edited > 0 && (
            <button onClick={handleResetAll} className="px-4 py-2 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 rounded-xl font-medium flex items-center gap-1.5 shadow-sm text-sm">
              <RotateCcw size={16} /> Reset all edits
            </button>
          )}
          {rows.length > 0 && (
            <button onClick={handleDelete} className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center gap-1.5 shadow-sm text-sm">
              <Trash2 size={16} /> Delete
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`px-5 py-2 text-white rounded-xl font-medium flex items-center gap-1.5 shadow-sm text-sm ${!dirty || saving ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Adjustments'}
          </button>
        </div>
      </div>

      {meta?.outdated && (
        <div className="flex gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <span>
            The original payroll for {period} was saved again on <b>{fmtDateTime(meta.originalUpdatedAt)}</b>, after this adjustment was synced ({fmtDateTime(meta.sourceSyncedAt)}).
            To bring in the new values for cells you did not edit, open <b>Payroll → {period} → Adjust Payroll → Sync un-edited cells</b>. Your edits will be kept.
          </span>
        </div>
      )}

      {dirty && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-800">
          <Info size={16} /> You have unsaved changes — click <b>Save Adjustments</b>.
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center text-gray-500">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
          <p className="text-gray-700 font-semibold">No adjustment payroll for {period}.</p>
          <p className="text-sm text-gray-500">Open Payroll, select this month (it must be saved), and click <b>Adjust Payroll</b> to create the copy.</p>
          <button onClick={() => navigate('/payroll')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium">Go to Payroll</button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Employees', value: rows.length },
              { label: 'Rows edited', value: totals.edited },
              { label: 'Net Pay (original)', value: `₹${fmtMoney(totals.original)}` },
              { label: 'Net Pay (adjusted)', value: `₹${fmtMoney(totals.adjusted)}`, sub: totals.diff ? `${totals.diff > 0 ? '+' : ''}${fmtMoney(totals.diff)}` : null },
            ].map((s) => (
              <div key={s.label} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{s.value}</p>
                {s.sub && <p className={`text-xs font-semibold ${totals.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>{s.sub}</p>}
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee by name or code..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className={selectCls}>
              <option value="All">All Companies</option>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className={selectCls}>
              <option value="All">All Pay Modes</option>
              <option value="BANK">BANK</option>
              <option value="CASH">CASH</option>
            </select>
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={selectCls}>
              <option value="All">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={editedOnly} onChange={(e) => setEditedOnly(e.target.checked)} /> Edited only
            </label>
            <span className="text-xs text-gray-500 ml-auto">
              <span className="inline-block w-3 h-3 bg-amber-100 border border-amber-400 rounded align-middle mr-1" /> edited cell (hover for original)
            </span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[70vh]">
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 text-gray-700 font-bold uppercase">
                  <tr>
                    <th rowSpan={2} className="py-2 px-2 border-r border-b border-gray-200 bg-slate-100">Sr.</th>
                    {COLUMNS.map((c, i) => {
                      if (c.group === 'ded') {
                        return COLUMNS.findIndex((x) => x.group === 'ded') === i ? (
                          <th key="ded" colSpan={DED_COUNT} className="py-1.5 px-2 text-center bg-rose-100 text-rose-900 border-r border-b border-rose-200">Deductions</th>
                        ) : null;
                      }
                      return <th key={c.key} rowSpan={2} className="py-2 px-2 text-center whitespace-nowrap border-r border-b border-gray-200 bg-slate-100">{c.label}</th>;
                    })}
                    <th rowSpan={2} className="py-2 px-2 border-b border-gray-200 bg-slate-100">Actions</th>
                  </tr>
                  <tr>
                    {COLUMNS.filter((c) => c.group === 'ded').map((c) => (
                      <th key={c.key} className="py-1.5 px-2 text-center whitespace-nowrap bg-rose-50 text-rose-800 border-r border-b border-gray-200">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((row, idx) => {
                    const edited = new Set(row.editedFields || []);
                    return (
                      <tr key={row.employeeId} className={edited.size ? 'bg-amber-50/30' : 'hover:bg-indigo-50/20'}>
                        <td className="py-1.5 px-2 text-center font-mono text-gray-500 border-r border-gray-100">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        {COLUMNS.map((c) => (
                          <td key={c.key} className="py-1.5 px-1.5 border-r border-gray-100">
                            <EditCell
                              col={c}
                              value={cellValue(row, c)}
                              edited={edited.has(c.key)}
                              original={originalValue(row, c)}
                              onCommit={(v) => commitCell(row, c, v)}
                              onRevert={() => updateRow(row.employeeId, (r) => revertCell(r, c.key))}
                            />
                            {c.key === 'employeeName' && (
                              <div className="text-[10px] text-gray-500 mt-0.5 whitespace-nowrap">
                                {row.department}{row.branchName ? <> • <span className="text-indigo-600">{row.branchName}</span></> : null}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="py-1.5 px-2 text-center">
                          <button
                            onClick={() => updateRow(row.employeeId, resetRow)}
                            disabled={!edited.size}
                            title="Reset row to original payroll values"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <RotateCcw size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pageRows.length === 0 && (
                    <tr><td colSpan={COLUMNS.length + 2} className="py-10 text-center text-gray-500">No employees match the filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
                <span className="text-gray-600">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50">Previous</button>
                  <span className="text-gray-600">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Editing a value recalculates everything after it with the payroll formulas (e.g. PAID_DAYS → Earn Basic/Allow → Earn Gross → PF/ESIC → Total Deduction → Net Salary → Net Pay).
            A value you type directly is kept as typed.
          </p>
        </>
      )}
    </div>
  );
};

export default AdjustmentPayroll;

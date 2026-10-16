// Adjustment Payroll — copy, edit-recalculation and sync helpers.
// The formulas mirror the Payroll screen (monthly), but run on the adjusted values.
// Nothing here writes to the original payroll.

export const NUMERIC_FIELDS = [
  'periodDays', 'daysWorked', 'presentDays', 'woDays', 'unpaidLeaves', 'paidLeaves', 'otHrs',
  'basicRate', 'earnBasic', 'allowanceRate', 'earnAllowance', 'grossTotal', 'compensation', 'otAmount',
  'earnGross', 'epfWages', 'pfDeduction', 'lwfDeduction', 'esicDeduction', 'emiDeduction',
  'otherDeductions', 'absentDeduction', 'canteenDeduction', 'totalDeductions', 'netSalary',
  'diwaliBonus', 'netPayAmount',
];

export const TEXT_FIELDS = [
  'employeeCode', 'employeeName', 'uanNo', 'ipNo', 'paymentMode', 'bankAccountNo', 'ifscCode', 'remarks', 'status',
];

export const EDITABLE_FIELDS = [...NUMERIC_FIELDS, ...TEXT_FIELDS];

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (n) => Math.round(n * 100) / 100;
const dash = (v) => (v === '—' || v === undefined || v === null ? '' : String(v));

// Derived fields in calculation order, each with the fields it depends on.
const DERIVED = [
  ['grossTotal', ['basicRate', 'allowanceRate'], (r) => r2(r.basicRate + r.allowanceRate)],
  ['earnBasic', ['basicRate', 'periodDays', 'daysWorked'], (r) =>
    r.periodDays > 0 && r.daysWorked < r.periodDays ? Math.round((r.basicRate / r.periodDays) * r.daysWorked) : r.basicRate],
  ['earnAllowance', ['allowanceRate', 'periodDays', 'daysWorked'], (r) =>
    r.allowanceRate <= 0 ? 0
      : r.periodDays > 0 && r.daysWorked < r.periodDays ? Math.round((r.allowanceRate / r.periodDays) * r.daysWorked) : r.allowanceRate],
  ['otAmount', ['otHrs', 'grossTotal', 'periodDays'], (r) => {
    const hourly = r.grossTotal > 0 && r.periodDays > 0 ? r.grossTotal / (r.periodDays * 8) : 0;
    return r.otHrs > 0 && hourly > 0 ? Math.round(r.otHrs * hourly) : 0;
  }],
  ['earnGross', ['earnBasic', 'earnAllowance', 'compensation', 'otAmount'], (r) =>
    Math.round(r.earnBasic + r.earnAllowance + r.compensation + r.otAmount)],
  ['epfWages', ['earnBasic'], (r) => Math.round(Math.min(15000, r.earnBasic))],
  ['pfDeduction', ['epfWages'], (r) => (r.pfApplicable ? Math.round(r.epfWages * 0.12) : 0)],
  ['esicDeduction', ['earnGross', 'grossTotal'], (r) =>
    r.esicApplicable && r.grossTotal <= 21000 ? Math.ceil(r.earnGross * 0.0075) : 0],
  ['totalDeductions', ['pfDeduction', 'lwfDeduction', 'esicDeduction', 'emiDeduction', 'otherDeductions', 'absentDeduction', 'canteenDeduction'], (r) =>
    Math.round(r.pfDeduction + r.lwfDeduction + r.esicDeduction + r.emiDeduction + r.otherDeductions + r.absentDeduction + r.canteenDeduction)],
  ['netSalary', ['earnGross', 'totalDeductions'], (r) => Math.max(0, r.earnGross - r.totalDeductions)],
  ['netPayAmount', ['netSalary', 'diwaliBonus'], (r) => r.netSalary + r.diwaliBonus],
];

export const DERIVED_FIELDS = DERIVED.map(([f]) => f);

// Recalculate everything downstream of `changed` fields. Fields the admin edited directly stay as typed.
export const cascade = (row, changed) => {
  const out = { ...row };
  const dirty = new Set(changed);
  const pinned = new Set(out.editedFields || []);
  for (const [field, deps, calc] of DERIVED) {
    if (pinned.has(field) || !deps.some((d) => dirty.has(d))) continue;
    const next = calc(out);
    if (next !== out[field]) {
      out[field] = next;
      dirty.add(field);
    }
  }
  return out;
};

const snapshotOf = (row) => Object.fromEntries(EDITABLE_FIELDS.map((f) => [f, row[f]]));

// Payroll screen row (mapSavedPayrollRunToRow output) -> adjustment row.
export const toAdjustmentRow = (p) => {
  const isBank = String(p.paymentMode || p.payMode || 'CASH').toUpperCase().includes('BANK');
  const row = {
    employeeId: Number(p.employeeId),
    employeeCode: p.employeeCode || '',
    employeeName: p.employeeName || '',
    department: p.department || '',
    branchId: p.branchId ?? null,
    branchName: dash(p.branchName),
    uanNo: dash(p.uanNo),
    ipNo: dash(p.ipNo),
    periodDays: num(p.periodDays),
    daysWorked: num(p.daysWorked),
    presentDays: num(p.presentDays),
    woDays: num(p.woDays),
    unpaidLeaves: num(p.unpaidLeaves),
    paidLeaves: num(p.paidLeaves),
    otHrs: num(p.otHrs),
    basicRate: num(p.basicRate || p.basicPay),
    earnBasic: num(p.earnBasic ?? p.basicPay),
    allowanceRate: num(p.allowanceRate),
    earnAllowance: num(p.earnAllowance ?? p.allowance),
    grossTotal: num(p.grossTotal),
    compensation: num(p.compensation),
    otAmount: num(p.otAmount),
    earnGross: num(p.earnGross ?? p.grossSalary),
    epfWages: num(p.epfWages),
    pfDeduction: num(p.pfDeduction),
    lwfDeduction: num(p.lwfDeduction),
    esicDeduction: num(p.esicDeduction),
    emiDeduction: num(p.emiDeduction),
    otherDeductions: num(p.otherDeductions),
    absentDeduction: 0, // ABSENT cut is disabled in payroll (always 0.00)
    canteenDeduction: Math.round(num(p.canteenDeduction)),
    totalDeductions: num(p.totalDeductions),
    netSalary: num(p.netSalary),
    diwaliBonus: num(p.diwaliBonus),
    netPayAmount: num(p.netPayAmount ?? p.netSalary),
    paymentMode: isBank ? 'BANK' : 'CASH',
    bankAccountNo: dash(p.bankAccountNo),
    ifscCode: dash(p.ifscCode),
    remarks: p.remarks || '',
    status: p.status || 'Draft',
    pfApplicable: num(p.pfDeduction) > 0,
    esicApplicable: num(p.esicDeduction) > 0,
    editedFields: [],
  };
  row.originalValues = snapshotOf(row);
  return row;
};

// DB row (numeric strings) -> working row (numbers).
export const fromDbRow = (d) => {
  const row = { ...d };
  for (const f of NUMERIC_FIELDS) row[f] = num(d[f]);
  for (const f of TEXT_FIELDS) row[f] = d[f] ?? '';
  row.editedFields = Array.isArray(d.editedFields) ? d.editedFields : [];
  row.originalValues = d.originalValues || snapshotOf(row);
  return row;
};

const sameValue = (a, b) => (typeof a === 'number' || typeof b === 'number' ? num(a) === num(b) : String(a ?? '') === String(b ?? ''));

// Admin edits one cell: mark it edited (or un-mark if back to original) and recalc downstream.
export const applyEdit = (row, field, rawValue) => {
  const isNum = NUMERIC_FIELDS.includes(field);
  const value = isNum ? r2(num(rawValue)) : String(rawValue ?? '');
  const edited = new Set(row.editedFields || []);
  if (sameValue(value, row.originalValues?.[field])) edited.delete(field);
  else edited.add(field);
  const next = { ...row, [field]: value, editedFields: [...edited] };
  return isNum ? cascade(next, [field]) : next;
};

// Put one cell back to its copied value and recalc downstream.
export const revertCell = (row, field) => {
  const next = {
    ...row,
    [field]: row.originalValues?.[field] ?? row[field],
    editedFields: (row.editedFields || []).filter((f) => f !== field),
  };
  return NUMERIC_FIELDS.includes(field) ? cascade(next, [field]) : next;
};

export const resetRow = (row) => ({ ...row, ...(row.originalValues || {}), editedFields: [] });

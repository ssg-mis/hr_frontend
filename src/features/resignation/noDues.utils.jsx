import React from 'react';

// Shared helpers for No Dues Clearance (stage "Clearance").
export const NO_DUES_STAGE_LABEL = 'No Dues Clearance';
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const noDuesOf = (checklist) => {
  const nd = (checklist && checklist.noDues) || {};
  const out = {};
  for (const s of ['canteen', 'accounts', 'store', 'hr']) out[s] = { status: 'Pending', ...(nd[s] || {}) };
  return out;
};

// A section is complete with No Due, or with a Due that Admin/HR has checked and marked Cleared.
export const isSectionDone = (e) => e?.status === 'NoDue' || e?.status === 'Cleared';

export const handoverStatusOf = (checklist) => {
  const cl = checklist || {};
  if (cl.handoverStatus === 'Approved' || cl.handover === true) return 'Approved';
  return cl.handoverStatus || 'Not Prompted';
};

const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border';
export const GREEN = 'bg-green-50 text-green-700 border-green-200';
export const AMBER = 'bg-amber-50 text-amber-700 border-amber-200';
export const RED = 'bg-red-50 text-red-700 border-red-200';
export const GREY = 'bg-gray-50 text-gray-500 border-gray-200';

/** Status pill for one No Dues section answer. */
export const NoDuesPill = ({ entry }) => {
  const e = entry || { status: 'Pending' };
  const pill = (cls, text) => <span className={`${base} ${cls}`}>{text}</span>;
  return (
    <div title={e.remark || ''}>
      {e.status === 'NoDue' && pill(GREEN, 'No Due')}
      {e.status === 'Approved' && pill(GREEN, 'Approved')}
      {e.status === 'Due' && pill(RED, `Due ${inr(e.amount)} · pending`)}
      {e.status === 'Cleared' && pill(GREEN, `Cleared ${inr(e.amount)}`)}
      {e.status === 'Pending' && pill(AMBER, 'Pending')}
      {e.remark && <div className="text-[11px] text-gray-500 mt-0.5 max-w-[160px] truncate">{e.remark}</div>}
    </div>
  );
};

/** Department (HOD task handover) pill. */
export const HandoverPill = ({ checklist }) => {
  const st = handoverStatusOf(checklist);
  const map = { Approved: [GREEN, 'Approved'], 'Pending HOD': [AMBER, 'Pending HOD'], Rejected: [RED, 'Rejected'] };
  const [cls, text] = map[st] || [GREY, 'Not requested'];
  return <span className={`${base} ${cls}`}>{text}</span>;
};

export { inr };

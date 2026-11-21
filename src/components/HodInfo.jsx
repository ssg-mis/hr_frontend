import React, { useEffect, useState } from 'react';
import { UserCheck, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

/** HOD of the logged-in employee: { departmentName, hodName, hodCode, isSelfHod } or null */
export const useMyHod = () => {
  const [hod, setHod] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api.get('/employees/my-hod')
      .then((res) => { if (alive) setHod(res?.data || null); })
      .catch(() => { if (alive) setHod(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return { hod, loading };
};

/**
 * Shows who approves a request at the HOD stage.
 * Pass the HOD fields of the employee the request is for (own HOD from useMyHod,
 * or the selected employee's HOD when HR raises it on their behalf).
 */
const HodInfo = ({ hodName, hodCode, departmentName, isSelfHod = false, loading = false, className = '' }) => {
  if (loading) {
    return <div className={`text-xs text-gray-400 ${className}`}>Loading HOD…</div>;
  }

  if (isSelfHod) {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 ${className}`}>
        <UserCheck size={16} className="mt-0.5 shrink-0" />
        <span>You are the HOD{departmentName ? ` of ${departmentName}` : ''}.</span>
      </div>
    );
  }

  if (!hodName) {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 ${className}`}>
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <span>HOD is not assigned for {departmentName ? <b>{departmentName}</b> : 'this'} department yet.</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ${className}`}>
      <UserCheck size={16} className="mt-0.5 shrink-0" />
      <span>
        Your HOD: <b>{hodName}</b>{hodCode ? ` (${hodCode})` : ''}{departmentName ? ` · ${departmentName}` : ''}
        <span className="block text-xs text-emerald-700">This request goes to them for approval first.</span>
      </span>
    </div>
  );
};

/** One-line HOD label for request lists, e.g. under a "Pending HOD" status badge */
export const HodLabel = ({ hodName, hodCode }) => (
  hodName
    ? <span className="block text-[11px] text-gray-500 mt-0.5">HOD: {hodName}{hodCode ? ` (${hodCode})` : ''}</span>
    : <span className="block text-[11px] text-amber-600 mt-0.5">HOD not assigned</span>
);

export default HodInfo;

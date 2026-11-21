import React, { useEffect, useState } from 'react';
import { CheckCircle2, IndianRupee, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import resignationApi from './resignation.api';
import { NoDuesPill, inr } from './noDues.utils';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '—');
const TITLES = {
  canteen: { title: 'No Dues Requests — Canteen', hint: 'Employees who left. Check their canteen dues: click No Due, or enter the due amount and send.' },
  accounts: { title: 'No Dues Requests — Accounts', hint: 'Employees who left. Check advance / EMI still pending: click No Due, or enter the pending amount and send.' },
  store: { title: 'No Dues Requests — Store', hint: 'Check accessories / items returned: click No Due, or enter the amount due and send.' },
};

/** Inbox for one No Dues section (Canteen page, EMI Management page). */
const NoDuesRequests = ({ section }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({}); // id -> { amount, remark, due: bool }
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await resignationApi.noDuesInbox(section));
    } catch (err) {
      toast.error(err.message || 'Failed to load No Dues requests');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [section]);

  const setF = (id, patch) => setForm((f) => ({ ...f, [id]: { ...(f[id] || {}), ...patch } }));

  const send = async (r, status) => {
    const f = form[r.id] || {};
    if (status === 'Due' && !(Number(f.amount) > 0)) { toast.error('Enter the due amount'); return; }
    setBusyId(r.id);
    try {
      const res = await resignationApi.noDuesRespond(r.id, section, { status, amount: status === 'Due' ? Number(f.amount) : null, remark: f.remark || '' });
      toast.success(res.message || 'Saved');
      setForm((x) => ({ ...x, [r.id]: {} }));
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setBusyId(null);
    }
  };

  const systemFigure = (r) => {
    if (section === 'canteen' && r.canteen) return <>This month {inr(r.canteen.thisMonth)}<br />Last month {inr(r.canteen.lastMonth)}</>;
    if (section === 'accounts' && r.outstanding) return <>Advance {inr(r.outstanding.advance)}<br />EMI left {inr(r.outstanding.emi)}</>;
    return '—';
  };
  const pending = rows.filter((r) => r.response?.status === 'Pending' && ['Left', 'Clearance'].includes(r.stage));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            {TITLES[section].title}
            {pending.length > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">{pending.length} pending</span>}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{TITLES[section].hint}</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
              <th className="px-4 py-2.5 text-left">Employee</th>
              <th className="px-4 py-2.5 text-left">Department</th>
              <th className="px-4 py-2.5 text-left">Last working day</th>
              <th className="px-4 py-2.5 text-left">{section === 'canteen' ? 'Canteen (system)' : section === 'accounts' ? 'Pending (system)' : 'System'}</th>
              <th className="px-4 py-2.5 text-left">Response</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400"><Loader2 className="inline animate-spin" size={18} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No No Dues requests.</td></tr>
            ) : rows.map((r) => {
              const open = r.response?.status === 'Pending' && ['Left', 'Clearance'].includes(r.stage);
              const f = form[r.id] || {};
              return (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.candidateName}</div>
                    <div className="text-xs text-gray-400 font-mono">{r.employeeCode} · {r.candidatePhone}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {r.departmentName || '—'}
                    <div className="text-xs text-gray-400">{r.designationName || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(r.lastWorkingDay)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{systemFigure(r)}</td>
                  <td className="px-4 py-3 min-w-[300px]">
                    {!open ? (
                      <div className="space-y-0.5">
                        <NoDuesPill entry={r.response} />
                        {r.response?.by && <div className="text-[11px] text-gray-400">by {r.response.by} · {fmtDate(r.response.at)}</div>}
                      </div>
                    ) : !f.due ? (
                      <div className="flex gap-2">
                        <button onClick={() => send(r, 'NoDue')} disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-60">
                          <CheckCircle2 size={13} /> No Due
                        </button>
                        <button onClick={() => setF(r.id, { due: true })} disabled={busyId === r.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold">
                          <IndianRupee size={13} /> Has Due
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input type="number" min="1" value={f.amount || ''} onChange={(e) => setF(r.id, { amount: e.target.value })} placeholder="Due amount (₹)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <input value={f.remark || ''} onChange={(e) => setF(r.id, { remark: e.target.value })} placeholder="Remark (what is due)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                        <div className="flex gap-2">
                          <button onClick={() => send(r, 'Due')} disabled={busyId === r.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-60">{busyId === r.id ? 'Sending...' : 'Send Due'}</button>
                          <button onClick={() => setF(r.id, { due: false })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600">Cancel</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NoDuesRequests;

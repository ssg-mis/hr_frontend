import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, ClipboardCheck, CheckCircle, X, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { resignationApi } from '../features/resignation/resignation.api';

const CLEARANCE_ITEMS = [
  { key: 'assetClearance', label: 'Asset Clearance' },
  { key: 'departmentClearance', label: 'Department Clearance' },
  { key: 'handover', label: 'Handover' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const stageBadge = (stage) => {
  const style = {
    Left: 'bg-gray-100 text-gray-700 border border-gray-200',
    Clearance: 'bg-purple-100 text-purple-800 border border-purple-200',
    Settlement: 'bg-amber-100 text-amber-800 border border-amber-200',
    Relieved: 'bg-green-100 text-green-800 border border-green-200',
  }[stage] || 'bg-gray-100 text-gray-700 border border-gray-200';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>{stage}</span>;
};

const AfterLeavingWork = () => {
  const [activeTab, setActiveTab] = useState('progress');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Handover & Clearance modal
  const [clearing, setClearing] = useState(null); // resignation row
  const [checklist, setChecklist] = useState({});
  const [clearanceRemark, setClearanceRemark] = useState('');

  // Full & Final Settlement modal
  const [settling, setSettling] = useState(null); // resignation row
  const [settlementForm, setSettlementForm] = useState({
    pendingSalary: '', bonus: '', advanceDeduction: '', canteenDues: '', finalSettlementAmount: '', settlementRemark: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await resignationApi.list({ search: searchTerm, stage: 'Left,Clearance,Settlement,Relieved' });
      setRows(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load after-leaving-work data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openClearance = (row) => {
    setChecklist(row.clearanceChecklist || {});
    setClearanceRemark(row.clearanceRemark || '');
    setClearing(row);
  };

  const toggleItem = (key) => setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

  const saveClearance = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(clearing.id, {
        stage: clearing.stage === 'Left' ? 'Clearance' : clearing.stage,
        clearanceChecklist: checklist,
        clearanceRemark: clearanceRemark || null,
      });
      toast.success('Clearance checklist saved');
      setClearing(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save clearance checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const proceedToSettlement = async () => {
    if (!CLEARANCE_ITEMS.every((item) => checklist[item.key])) {
      toast.error('All clearance items must be checked before proceeding');
      return;
    }
    setSubmitting(true);
    try {
      await resignationApi.update(clearing.id, {
        stage: 'Clearance',
        clearanceChecklist: checklist,
        clearanceRemark: clearanceRemark || null,
      });
      toast.success('Clearance complete — proceed to settlement');
      setClearing(null);
      openSettlement({ ...clearing, stage: 'Clearance' });
    } catch (err) {
      toast.error(err.message || 'Failed to save clearance checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const openSettlement = (row) => {
    setSettlementForm({
      pendingSalary: row.pendingSalary || '',
      bonus: row.bonus || '',
      advanceDeduction: row.advanceDeduction || '',
      canteenDues: row.canteenDues || '',
      finalSettlementAmount: row.finalSettlementAmount || '',
      settlementRemark: row.settlementRemark || '',
    });
    setSettling(row);
  };

  const handleSettlementChange = (e) => setSettlementForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const saveSettlement = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(settling.id, {
        stage: 'Settlement',
        ...settlementForm,
      });
      toast.success('Settlement details saved');
      setSettling(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save settlement details');
    } finally {
      setSubmitting(false);
    }
  };

  const markRelieved = async () => {
    setSubmitting(true);
    try {
      await resignationApi.update(settling.id, {
        stage: 'Relieved',
        ...settlementForm,
      });
      toast.success('Employee relieved — full & final settlement complete');
      setSettling(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to mark as relieved');
    } finally {
      setSubmitting(false);
    }
  };

  const rows_ = rows.filter((r) => (activeTab === 'progress' ? r.stage !== 'Relieved' : r.stage === 'Relieved'));

  return (
    <div className="space-y-6 page-content p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900">After Leaving Work</h2>
            <p className="mt-0.5 text-sm text-gray-500">Handover &amp; clearance, then full &amp; final settlement</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search by employee name, phone or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-gray-50/50 pl-10 pr-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'progress' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('progress')}
            >
              <ClipboardCheck size={16} className="inline mr-2" />
              In Progress ({rows.filter((r) => r.stage !== 'Relieved').length})
            </button>
            <button
              className={`py-4 px-6 font-medium text-sm border-b-2 ${activeTab === 'relieved' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('relieved')}
            >
              <CheckCircle size={16} className="inline mr-2" />
              Relieved ({rows.filter((r) => r.stage === 'Relieved').length})
            </button>
          </nav>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-6 py-3 text-left">Applying For</th>
                <th className="px-6 py-3 text-left">Last Working Day</th>
                <th className="px-6 py-3 text-left">Stage</th>
                {activeTab === 'progress' ? (
                  <th className="px-6 py-3 text-center">Action</th>
                ) : (
                  <th className="px-6 py-3 text-left">Final Settlement</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <span className="w-8 h-8 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                      <span className="text-sm font-semibold">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : rows_.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400 text-sm">
                    {activeTab === 'progress' ? 'No one is in the after-leaving-work pipeline.' : 'No employees relieved yet.'}
                  </td>
                </tr>
              ) : (
                rows_.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{r.candidateName}</div>
                      <div className="text-xs text-gray-400 font-mono">{r.employeeCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800">{r.applyingForPost || '—'}</div>
                      <div className="text-xs text-gray-400">{r.vacancyNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">{fmtDate(r.lastWorkingDay)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{stageBadge(r.stage)}</td>
                    {activeTab === 'progress' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(r.stage === 'Left' || r.stage === 'Clearance') && (
                          <button onClick={() => openClearance(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <ClipboardCheck size={13} /> Handover &amp; Clearance
                          </button>
                        )}
                        {r.stage === 'Settlement' && (
                          <button onClick={() => openSettlement(r)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors">
                            <Wallet size={13} /> Full &amp; Final Settlement
                          </button>
                        )}
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{r.finalSettlementAmount || '—'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Handover & Clearance modal */}
      {clearing && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Handover &amp; Clearance</h3>
                <p className="text-sm text-gray-500 mt-0.5">{clearing.candidateName} · {clearing.employeeCode}</p>
              </div>
              <button onClick={() => setClearing(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {CLEARANCE_ITEMS.map((item) => (
                  <label key={item.key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 bg-white cursor-pointer">
                    <input type="checkbox" checked={!!checklist[item.key]} onChange={() => toggleItem(item.key)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                <textarea rows={2} value={clearanceRemark} onChange={(e) => setClearanceRemark(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setClearing(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={saveClearance} disabled={submitting} className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl">Save</button>
              <button type="button" onClick={proceedToSettlement} disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Proceed to Settlement'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full & Final Settlement modal */}
      {settling && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Full &amp; Final Settlement</h3>
                <p className="text-sm text-gray-500 mt-0.5">{settling.candidateName} · {settling.employeeCode}</p>
              </div>
              <button onClick={() => setSettling(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pending Salary</label>
                  <input type="text" name="pendingSalary" value={settlementForm.pendingSalary} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bonus</label>
                  <input type="text" name="bonus" value={settlementForm.bonus} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Advance / Loan Deduction</label>
                  <input type="text" name="advanceDeduction" value={settlementForm.advanceDeduction} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Canteen Dues</label>
                  <input type="text" name="canteenDues" value={settlementForm.canteenDues} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Final Settlement Amount</label>
                <input type="text" name="finalSettlementAmount" value={settlementForm.finalSettlementAmount} onChange={handleSettlementChange} placeholder="Net amount payable/recoverable" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remark</label>
                <textarea name="settlementRemark" rows={2} value={settlementForm.settlementRemark} onChange={handleSettlementChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button type="button" onClick={() => setSettling(null)} disabled={submitting} className="px-5 py-2.5 border border-gray-250 bg-white hover:bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancel</button>
              <button type="button" onClick={saveSettlement} disabled={submitting} className="px-5 py-2.5 border border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold rounded-xl">Save</button>
              <button type="button" onClick={markRelieved} disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl">{submitting ? 'Saving...' : 'Mark Relieved'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AfterLeavingWork;

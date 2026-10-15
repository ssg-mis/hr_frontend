import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, ExternalLink, RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import adjustmentPayrollApi from './adjustmentPayroll.api';
import { toAdjustmentRow, fromDbRow, mergeSync } from './adjustmentPayroll.utils';

const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/**
 * "Adjust Payroll" button for the Payroll page.
 * Copies the saved monthly payroll (read-only) into the separate adjustment_payrolls table and
 * opens the Adjustment Payroll page. It never writes to the original payroll.
 *
 * @param {string}   period      "YYYY-MM"
 * @param {string}   disabledReason  shown as a toast instead of copying (e.g. payroll not saved)
 * @param {Function} getPayrollRows  async () => all payroll rows of the month, as shown on the Payroll page
 */
const AdjustPayrollButton = ({ period, disabledReason, getPayrollRows }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(null); // status meta when an adjustment already exists

  const openPage = () => navigate(`/payroll-adjustment?period=${encodeURIComponent(period)}`);

  const freshRows = async () => {
    const rows = await getPayrollRows();
    if (!rows || rows.length === 0) throw new Error('No saved payroll rows found for this month');
    return rows.map(toAdjustmentRow);
  };

  const handleClick = async () => {
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    setBusy(true);
    try {
      const status = await adjustmentPayrollApi.status(period);
      if (status?.exists) {
        // Ask only when the original payroll was re-saved after the copy; otherwise just open it.
        if (status.outdated) setExisting(status);
        else openPage();
        return;
      }
      const rows = await freshRows();
      await adjustmentPayrollApi.save(period, rows, { markSynced: true });
      toast.success(`Adjustment payroll created (${rows.length} employees)`);
      openPage();
    } catch (err) {
      toast.error(err.message || 'Failed to create adjustment payroll');
    } finally {
      setBusy(false);
    }
  };

  const handleSync = async () => {
    setBusy(true);
    try {
      const [res, fresh] = await Promise.all([adjustmentPayrollApi.list(period), freshRows()]);
      const current = (res?.data || []).map(fromDbRow);
      const merged = mergeSync(current, fresh);
      await adjustmentPayrollApi.save(period, merged, { markSynced: true });
      toast.success('Synced from payroll — your edited cells were kept');
      setExisting(null);
      openPage();
    } catch (err) {
      toast.error(err.message || 'Failed to sync adjustment payroll');
    } finally {
      setBusy(false);
    }
  };

  const handleRecopy = async () => {
    if (!window.confirm('Re-copy from payroll?\n\nALL edits made in the adjustment payroll for this month will be discarded.')) return;
    setBusy(true);
    try {
      const rows = await freshRows();
      await adjustmentPayrollApi.save(period, rows, { markSynced: true });
      toast.success('Adjustment payroll re-copied from payroll');
      setExisting(null);
      openPage();
    } catch (err) {
      toast.error(err.message || 'Failed to re-copy adjustment payroll');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={busy}
        className={`px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-sm text-sm ${busy ? 'opacity-60 cursor-wait' : ''}`}
      >
        <SlidersHorizontal size={16} />
        {busy && !existing ? 'Preparing...' : 'Adjust Payroll'}
      </button>

      {existing && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Adjustment Payroll – {period}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {existing.rowCount} employees · {existing.editedRows} with edits · last synced {fmtDateTime(existing.sourceSyncedAt)}
                </p>
              </div>
              <button onClick={() => setExisting(null)} disabled={busy} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>The original payroll was saved again on {fmtDateTime(existing.originalUpdatedAt)}, after this adjustment was synced. What would you like to do?</span>
              </div>

              <button onClick={() => { setExisting(null); openPage(); }} disabled={busy}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-left">
                <ExternalLink size={18} className="text-indigo-600 mt-0.5 shrink-0" />
                <span>
                  <span className="block font-semibold text-gray-900">Open adjustment as it is</span>
                  <span className="block text-xs text-gray-500">No changes — continue editing.</span>
                </span>
              </button>

              <button onClick={handleSync} disabled={busy}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-left">
                <RefreshCw size={18} className="text-green-600 mt-0.5 shrink-0" />
                <span>
                  <span className="block font-semibold text-gray-900">Sync un-edited cells from payroll</span>
                  <span className="block text-xs text-gray-500">Takes latest payroll values only where you did not edit. Your edited cells are kept and totals recalculated.</span>
                </span>
              </button>

              <button onClick={handleRecopy} disabled={busy}
                className="w-full flex items-start gap-3 p-4 rounded-xl border border-red-200 hover:bg-red-50 text-left">
                <RotateCcw size={18} className="text-red-600 mt-0.5 shrink-0" />
                <span>
                  <span className="block font-semibold text-red-700">Re-copy everything (discard edits)</span>
                  <span className="block text-xs text-gray-500">Starts fresh from the current payroll.</span>
                </span>
              </button>
            </div>
            {busy && <p className="px-6 pb-4 text-sm text-gray-500">Working...</p>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AdjustPayrollButton;

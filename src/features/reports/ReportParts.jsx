import React, { useEffect, useState } from 'react';
import { Download, Loader2, FileX } from 'lucide-react';
import api from '../../lib/api';
import { buildQuery } from './reportUtils';

// Fetch a report whenever its query params change
export const useReport = (path, params) => {
  const query = buildQuery(params);
  const [state, setState] = useState({ data: null, loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api.get(`/reports/${path}${query ? `?${query}` : ''}`)
      .then((res) => { if (!cancelled) setState({ data: res?.data ?? null, loading: false, error: '' }); })
      .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Failed to load report' }); });
    return () => { cancelled = true; };
  }, [path, query]);

  return state;
};

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

export const StatCards = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
    {items.map((it) => (
      <div key={it.label} className={`rounded-xl border p-4 ${TONES[it.tone || 'gray']}`}>
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{it.label}</p>
        <p className="text-2xl font-black mt-1 text-gray-900">{it.value}</p>
        {it.hint && <p className="text-[11px] mt-0.5 opacity-80">{it.hint}</p>}
      </div>
    ))}
  </div>
);

export const SectionHeader = ({ title, subtitle, onDownload, downloading, downloadDisabled }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {onDownload && (
      <button
        type="button"
        onClick={onDownload}
        disabled={downloading || downloadDisabled}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
      >
        {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Download Excel
      </button>
    )}
  </div>
);

export const ReportStatus = ({ loading, error, empty, emptyText = 'No records found for the selected filters' }) => {
  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center text-gray-400">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm mt-2">Loading report...</p>
      </div>
    );
  }
  if (error) return <p className="py-12 text-center text-sm text-red-600">{error}</p>;
  if (empty) {
    return (
      <div className="py-16 flex flex-col items-center text-gray-400">
        <FileX size={28} />
        <p className="text-sm mt-2">{emptyText}</p>
      </div>
    );
  }
  return null;
};

/** columns: [{ key, label, align?, render?(row) }] */
export const ReportTable = ({ columns, rows, rowKey = 'id', onRowClick, maxHeight = '60vh', footer }) => (
  <div className="border border-gray-200 rounded-xl overflow-auto" style={{ maxHeight }}>
    <table className="min-w-full divide-y divide-gray-200 text-sm">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          {columns.map((c) => (
            <th key={c.key} className={`px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-100">
        {rows.map((row, i) => (
          <tr
            key={row[rowKey] ?? i}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? 'cursor-pointer hover:bg-indigo-50/50' : 'hover:bg-gray-50'}
          >
            {columns.map((c) => (
              <td key={c.key} className={`px-4 py-2.5 whitespace-nowrap text-gray-700 ${c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : ''}`}>
                {c.render ? c.render(row) : (row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer && <tfoot className="bg-gray-50 font-bold sticky bottom-0">{footer}</tfoot>}
    </table>
  </div>
);

export const StatusBadge = ({ status }) => {
  const tone = {
    Approved: 'bg-emerald-50 text-emerald-700',
    Active: 'bg-emerald-50 text-emerald-700',
    Processed: 'bg-emerald-50 text-emerald-700',
    Paid: 'bg-emerald-50 text-emerald-700',
    Rejected: 'bg-rose-50 text-rose-700',
    Relieved: 'bg-gray-100 text-gray-600',
  }[status] || 'bg-amber-50 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${tone}`}>{status}</span>;
};

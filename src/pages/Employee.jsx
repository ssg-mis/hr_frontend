import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Users, UserCheck, UserMinus, Briefcase, Phone, Mail,
  Calendar, Building2, Hash, Eye, X, RefreshCw, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';

/* ─── helpers ─────────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const statusBadge = (status) => {
  const map = {
    Active: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Working' },
    Pending: { cls: 'bg-amber-50  text-amber-700  border border-amber-200', label: 'Resignation Requested' },
    Relieved: { cls: 'bg-red-50    text-red-700    border border-red-200', label: 'Relieved' },
  };
  const { cls = 'bg-gray-100 text-gray-600 border border-gray-200', label = status } = map[status] || {};
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const Avatar = ({ name, size = 'md' }) => {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
  const color = colors[(name || '').charCodeAt(0) % colors.length];
  const sz = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
};

/* ─── Stat Card ────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-13 h-13 w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ─── Detail Modal ─────────────────────────────────────────────────── */
const DetailModal = ({ employee, onClose }) => {
  if (!employee) return null;

  const fields = [
    { label: 'Employee Code', value: employee.employeeCode, icon: Hash },
    { label: 'Full Name', value: employee.candidateName, icon: Users },
    { label: 'Department', value: employee.departmentName, icon: Building2 },
    { label: 'Designation', value: employee.applyingForPost, icon: Briefcase },
    { label: 'Phone', value: employee.candidatePhone, icon: Phone },
    { label: 'Email', value: employee.candidateEmail, icon: Mail },
    { label: 'Date of Birth', value: fmtDate(employee.dob), icon: Calendar },
    { label: 'Marital Status', value: employee.maritalStatus, icon: null },
    { label: 'Present Address', value: employee.presentAddress, icon: null },
    { label: 'Aadhar No.', value: employee.aadharNo, icon: Hash },
    { label: 'Date of Joining', value: fmtDate(employee.joiningDate), icon: Calendar },
    { label: 'Base Salary', value: employee.baseSalary ? `₹${Number(employee.baseSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00', icon: null },
    { label: 'Allowance Salary', value: employee.allowanceSalary ? `₹${Number(employee.allowanceSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00', icon: null },
    { label: 'Vacancy No.', value: employee.vacancyNumber, icon: Hash },
    { label: 'Status', value: employee.status, icon: UserCheck, isStatus: true },
    { label: 'Joining Remark', value: employee.joiningRemark, icon: null },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden"
        style={{ animation: 'modalIn .2s ease' }}
      >
        {/* Modal header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={employee.candidateName} size="lg" />
            <div>
              <h3 className="text-white font-bold text-base leading-tight">{employee.candidateName}</h3>
              <p className="text-indigo-200 text-xs mt-0.5">{employee.employeeCode}</p>
              <div className="mt-1">{statusBadge(employee.status)}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 gap-0 divide-y divide-gray-100">
            {fields.map(({ label, value, icon: Icon, isStatus }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-gray-400 min-w-0">
                  {Icon && <Icon size={13} className="shrink-0" />}
                  <span className="text-xs font-semibold uppercase tracking-wide truncate">{label}</span>
                </div>
                <div className="text-right ml-4 max-w-[55%]">
                  {isStatus ? statusBadge(value) : (
                    <span className="text-sm text-gray-800 font-medium break-words">{value || '—'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─── Main Component ───────────────────────────────────────────────── */
const LIMIT = 15;

const TAB_CONFIG = [
  { key: 'Active', label: 'Working', statusFilter: 'Active' },
  { key: 'Pending', label: 'Resignation Requested', statusFilter: 'Pending' },
  { key: 'Relieved', label: 'Relieved', statusFilter: 'Relieved' },
];

const Employee = () => {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchTerm, setSearchTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ Active: 0, Pending: 0, Relieved: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const isFirstRun = React.useRef(true);

  /* fetch counts for all statuses once */
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/employees');
      const all = res.data || [];
      setStats({
        Active: all.filter(e => e.status === 'Active').length,
        Pending: all.filter(e => e.status === 'Pending').length,
        Relieved: all.filter(e => e.status === 'Relieved').length,
      });
    } catch (_) { }
  }, []);

  /* fetch + filter for the current tab */
  const fetchList = useCallback(async (pg = 1, tab = activeTab, search = searchTerm) => {
    setLoading(true);
    try {
      const res = await api.get(`/employees?status=${tab}`);
      let list = res.data || [];

      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(e =>
          (e.candidateName || '').toLowerCase().includes(q) ||
          (e.employeeCode || '').toLowerCase().includes(q) ||
          (e.candidatePhone || '').toLowerCase().includes(q) ||
          (e.candidateEmail || '').toLowerCase().includes(q) ||
          (e.applyingForPost || '').toLowerCase().includes(q) ||
          (e.departmentName || '').toLowerCase().includes(q)
        );
      }

      setTotalCount(list.length);
      setTotalPages(Math.max(1, Math.ceil(list.length / LIMIT)));
      const start = (pg - 1) * LIMIT;
      setRows(list.slice(start, start + LIMIT));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm]);

  useEffect(() => {
    setPage(1);
    fetchList(1, activeTab, searchTerm);
    fetchStats();
  }, [activeTab]);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const t = setTimeout(() => { setPage(1); fetchList(1, activeTab, searchTerm); }, 350);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const goPage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    fetchList(p, activeTab, searchTerm);
  };

  return (
    <div className="space-y-5 p-6 max-w-[1400px] mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={22} className="text-indigo-600" /> Employees
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and view all company employees</p>
        </div>
        <button
          onClick={() => { fetchList(page); fetchStats(); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stats — only Working + Resignation Requested ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={UserCheck}
          label="Working"
          value={stats.Active}
          color="bg-emerald-500"
          sub="Currently active employees"
        />
        <StatCard
          icon={UserMinus}
          label="Resignation Requested"
          value={stats.Pending}
          color="bg-amber-500"
          sub="Pending resignation approvals"
        />
      </div>

      {/* ── Table card ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          {/* Tabs */}
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {TAB_CONFIG.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeTab === key
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                {label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
                  }`}>
                  {stats[key]}
                </span>
              </button>
            ))}
          </nav>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, code, phone, dept…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 h-9 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Code</th>
                <th className="px-5 py-3 text-left">Department</th>
                <th className="px-5 py-3 text-left">Designation</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Joined</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-36"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-5 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Users size={32} className="opacity-30" />
                      <span className="text-sm font-semibold">
                        {searchTerm
                          ? 'No employees match your search.'
                          : `No ${TAB_CONFIG.find(t => t.key === activeTab)?.label.toLowerCase()} employees found.`}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map(emp => (
                  <tr key={emp.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={emp.candidateName} />
                        <span className="font-semibold text-gray-900">{emp.candidateName}</span>
                      </div>
                    </td>
                    <td className="px-1 py-1">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        {emp.employeeCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{emp.departmentName || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{emp.applyingForPost || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">{emp.candidatePhone}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[160px] truncate" title={emp.candidateEmail}>
                      {emp.candidateEmail || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{fmtDate(emp.joiningDate)}</td>
                    <td className="px-5 py-3.5 text-center">{statusBadge(emp.status)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => setSelected(emp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors text-xs font-semibold"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-200 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, totalCount)}</span>
              {' '}of{' '}
              <span className="font-semibold text-gray-700">{totalCount}</span> employees
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => goPage(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => goPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${page === p ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-white'
                      }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button onClick={() => goPage(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Row count (no pagination) */}
        {!loading && totalPages <= 1 && rows.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">{totalCount} employee{totalCount !== 1 ? 's' : ''} found</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <DetailModal employee={selected} onClose={() => setSelected(null)} />

      {/* Inline keyframe for modal pop-in */}
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.95) } to { opacity:1; transform:scale(1) } }`}</style>
    </div>
  );
};

export default Employee;

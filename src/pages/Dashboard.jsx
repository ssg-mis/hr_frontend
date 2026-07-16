import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  Briefcase,
  CalendarClock,
  CreditCard,
  TrendingUp,
  UserPlus,
  Clock,
  AlertTriangle,
  Loader2,
  LogOut,
  CalendarDays,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  MapPin,
  Building2,
} from 'lucide-react';
import { api } from '../lib/api';
import useAuthStore from '../store/authStore';

/* ─── helpers ─────────────────────────────────────────────────── */
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5',
  '#4338ca', '#3730a3',
];

const DEPARTMENT_COLORS = [
  '#6366f1', '#10B981', '#F59E0B', '#EF4444', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
];

/* ─── Stat Card ───────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, trend, trendLabel, color, bgColor }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-lg transition-all duration-300 group cursor-default">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor} group-hover:scale-110 transition-transform duration-300`}
    >
      <Icon size={22} className={color} />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value ?? '—'}</p>
      {trend !== undefined && trend !== null && (
        <div className="flex items-center gap-1 mt-1">
          {trend >= 0 ? (
            <ArrowUpRight size={14} className="text-emerald-500" />
          ) : (
            <ArrowDownRight size={14} className="text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              trend >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {trend >= 0 ? '+' : ''}
            {trend}
          </span>
          {trendLabel && (
            <span className="text-xs text-gray-400 ml-0.5">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  </div>
);

/* ─── Chart Card wrapper ──────────────────────────────────────── */
const ChartCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="px-6 pt-5 pb-2 flex items-center gap-2">
      {Icon && <Icon size={18} className="text-indigo-500" />}
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
        {title}
      </h3>
    </div>
    <div className="px-4 pb-5">{children}</div>
  </div>
);

/* ─── Activity Item ───────────────────────────────────────────── */
const activityMeta = {
  joining: {
    icon: UserPlus,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  resignation: {
    icon: LogOut,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  leave: {
    icon: CalendarDays,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
};

const ActivityItem = ({ item, isLast }) => {
  const meta = activityMeta[item.type] || activityMeta.joining;
  const IconCmp = meta.icon;
  return (
    <div className="flex gap-3 group">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}
        >
          <IconCmp size={14} className={meta.color} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
      </div>
      {/* Content */}
      <div className={`pb-5 min-w-0 ${isLast ? '' : ''}`}>
        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{item.detail}</p>
        <p className="text-[11px] text-gray-400 mt-1">{fmtDate(item.date)}</p>
      </div>
    </div>
  );
};

/* ─── Event Card ──────────────────────────────────────────────── */
const eventTypeBadge = {
  holiday: { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Holiday' },
  meeting: { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Meeting' },
  event: { cls: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Event' },
};

const EventItem = ({ event }) => {
  const badge = eventTypeBadge[event.type] || eventTypeBadge.event;
  const eventDate = event.date ? new Date(event.date) : null;
  const isValidDate = eventDate && !isNaN(eventDate.getTime());
  const monthLabel = isValidDate ? eventDate.toLocaleDateString('en-IN', { month: 'short' }) : '—';
  const dayLabel = isValidDate ? eventDate.getDate() : '—';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
      <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
        <span className="text-[10px] font-bold text-indigo-400 uppercase leading-none">
          {monthLabel}
        </span>
        <span className="text-sm font-bold text-indigo-700 leading-tight">
          {dayLabel}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800 truncate">{event.title}</p>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.cls}`}
          >
            {badge.label}
          </span>
        </div>
        {event.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{event.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
          {event.time && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {event.time}
            </span>
          )}
          {event.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {event.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Custom Tooltip ──────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN DASHBOARD
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Dashboard = () => {
  const user = useAuthStore((state) => state.user);
  const isEmployeeOnly = useAuthStore((state) => state.isEmployeeOnly);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEmployeeOnly) {
      navigate('/my-profile', { replace: true });
    }
  }, [isEmployeeOnly, navigate]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [designationData, setDesignationData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          statsRes,
          monthlyRes,
          designationRes,
          statusRes,
          departmentRes,
          activityRes,
          eventsRes,
        ] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/monthly-hiring'),
          api.get('/dashboard/designation-distribution'),
          api.get('/dashboard/status-distribution'),
          api.get('/dashboard/department-distribution'),
          api.get('/dashboard/recent-activity'),
          api.get('/dashboard/upcoming-events'),
        ]);
        setStats(statsRes.data || {});
        setMonthlyData(monthlyRes.data || []);
        setDesignationData(designationRes.data || []);
        setStatusData(statusRes.data || []);
        setDepartmentData(departmentRes.data || []);
        setRecentActivity(activityRes.data || []);
        setUpcomingEvents(eventsRes.data || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* greeting */
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  /* ─── loading state ──────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-center">
          <Loader2
            size={44}
            className="animate-spin text-indigo-500 mx-auto mb-4"
          />
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  /* ─── error state ────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="text-center bg-red-50 border border-red-200 rounded-2xl p-10 max-w-md">
          <AlertTriangle
            size={44}
            className="text-red-400 mx-auto mb-4"
          />
          <p className="text-red-700 font-medium mb-1">
            Unable to load dashboard
          </p>
          <p className="text-red-500 text-sm mb-5">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ─── main render ────────────────────────────────────────────── */
  return (
    <div className="space-y-6 page-content p-6">
      {/* ── Welcome Banner ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 md:p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -left-8 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium">{todayStr}</p>
          <h2 className="text-2xl md:text-3xl font-bold mt-1">
            {greeting},{' '}
            <span className="text-indigo-100">
              {user?.name || user?.Name || 'Admin'}
            </span>{' '}
            👋
          </h2>
          <p className="text-indigo-200 text-sm mt-2 max-w-lg">
            Here's a quick overview of your HR operations. Track workforce metrics,
            recruitment pipeline, and upcoming events — all in one place.
          </p>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={stats.totalEmployees}
          trend={stats.hiredThisMonth}
          trendLabel="joined this month"
          color="text-indigo-600"
          bgColor="bg-indigo-50"
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={stats.activeEmployees}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard
          icon={UserX}
          label="Resigned"
          value={stats.relievedEmployees}
          trend={stats.resignedThisMonth}
          trendLabel="this month"
          color="text-red-600"
          bgColor="bg-red-50"
        />
        <StatCard
          icon={Briefcase}
          label="Open Vacancies"
          value={stats.openVacancies}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={CalendarClock}
          label="Pending Leaves"
          value={stats.pendingLeaves}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={CreditCard}
          label="Active EMIs"
          value={stats.activeEMIs}
          color="text-violet-600"
          bgColor="bg-violet-50"
        />
      </div>

      {/* ── Charts Row 1 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pie — Employee Status */}
        <ChartCard title="Employee Status" icon={Users}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', color: '#6b7280' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Bar — Monthly Hiring vs Attrition */}
        <ChartCard title="Hiring vs Attrition" icon={TrendingUp}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                />
                <Bar
                  dataKey="hired"
                  name="Hired"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="left"
                  name="Left"
                  fill="#EF4444"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Department Distribution */}
        <ChartCard title="Department Distribution" icon={Building2}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departmentData}
                layout="vertical"
                margin={{ left: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="department"
                  width={110}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {departmentData.map((_, i) => (
                    <Cell key={i} fill={DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Designation Distribution */}
        <ChartCard title="Designation Distribution" icon={UserPlus}>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={designationData}
                layout="vertical"
                margin={{ left: 20 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="designation"
                  width={120}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Employees" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {designationData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Bottom Row: Activity + Events ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <Activity size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Recent Activity
            </h3>
          </div>
          <div className="px-6 pb-5 max-h-80 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No recent activity
              </p>
            ) : (
              recentActivity.map((item, i) => (
                <ActivityItem
                  key={i}
                  item={item}
                  isLast={i === recentActivity.length - 1}
                />
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 pt-5 pb-2 flex items-center gap-2">
            <CalendarDays size={18} className="text-indigo-500" />
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Upcoming Events
            </h3>
          </div>
          <div className="px-3 pb-4 max-h-80 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No upcoming events
              </p>
            ) : (
              upcomingEvents.map((event) => (
                <EventItem key={event.id} event={event} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
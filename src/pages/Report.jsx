import React, { useEffect, useMemo, useState } from 'react';
import { Search, Calendar, Filter, Users, ClipboardList, Utensils, Clock, TrendingUp, Landmark, HeartPulse, Gift, CalendarDays, CalendarOff, AlarmClock, Timer } from 'lucide-react';
import api from '../lib/api';
import SearchableEmployeeSelect from '../components/SearchableEmployeeSelect';
import EmployeeDetailsReport from '../features/reports/EmployeeDetailsReport';
import AttendanceRegisterReport from '../features/reports/AttendanceRegisterReport';
import CanteenReport from '../features/reports/CanteenReport';
import CompensationReport from '../features/reports/CompensationReport';
import IncrementReport from '../features/reports/IncrementReport';
import StatutoryReport from '../features/reports/StatutoryReport';
import BonusReport from '../features/reports/BonusReport';
import MonthlyAttendanceReport from '../features/reports/MonthlyAttendanceReport';
import LeaveReport from '../features/reports/LeaveReport';
import DailyExceptionReport from '../features/reports/DailyExceptionReport';
import { currentMonthStr, monthStartStr, todayStr } from '../features/reports/reportUtils';

const PfReport = (props) => <StatutoryReport kind="pf" {...props} />;
const EsicReport = (props) => <StatutoryReport kind="esic" {...props} />;
const LateEarlyReport = (props) => <DailyExceptionReport kind="lateEarly" {...props} />;
const OvertimeReport = (props) => <DailyExceptionReport kind="overtime" {...props} />;

const prevMonthStr = () => {
  const [y, m] = currentMonthStr().split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};
const fyStartStr = () => {
  const [y, m] = currentMonthStr().split('-').map(Number);
  return `${m >= 4 ? y : y - 1}-04`;
};

// period: which period control the report uses ('month' | 'range' | 'monthRange' | null)
// defaultMonths: starting month range for 'monthRange' reports
const REPORTS = [
  { id: 'employees', label: 'Employee Details', icon: Users, period: null, Component: EmployeeDetailsReport },
  { id: 'attendanceRegister', label: 'Attendance Register', icon: ClipboardList, period: 'month', Component: AttendanceRegisterReport },
  { id: 'monthlyAttendance', label: 'Monthly Attendance', icon: CalendarDays, period: 'monthRange', defaultMonths: () => ({ from: currentMonthStr(), to: currentMonthStr() }), Component: MonthlyAttendanceReport },
  { id: 'leave', label: 'Leave', icon: CalendarOff, period: 'range', Component: LeaveReport },
  { id: 'lateEarly', label: 'Late / Early', icon: AlarmClock, period: 'range', Component: LateEarlyReport },
  { id: 'overtime', label: 'Overtime', icon: Timer, period: 'range', Component: OvertimeReport },
  { id: 'canteen', label: 'Canteen', icon: Utensils, period: 'range', Component: CanteenReport },
  { id: 'compensation', label: 'Compensation', icon: Clock, period: 'range', Component: CompensationReport },
  { id: 'increment', label: 'Increment', icon: TrendingUp, period: 'monthRange', defaultMonths: () => ({ from: fyStartStr(), to: currentMonthStr() }), Component: IncrementReport },
  { id: 'bonus', label: 'Bonus', icon: Gift, period: 'monthRange', defaultMonths: () => ({ from: fyStartStr(), to: currentMonthStr() }), Component: BonusReport },
  { id: 'pf', label: 'PF', icon: Landmark, period: 'monthRange', defaultMonths: () => ({ from: prevMonthStr(), to: prevMonthStr() }), Component: PfReport },
  { id: 'esic', label: 'ESIC', icon: HeartPulse, period: 'monthRange', defaultMonths: () => ({ from: prevMonthStr(), to: prevMonthStr() }), Component: EsicReport },
];

const Report = () => {
  const [activeId, setActiveId] = useState('employees');
  const [departments, setDepartments] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [departmentId, setDepartmentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(currentMonthStr());
  const [range, setRange] = useState({ from: monthStartStr(), to: todayStr() });
  // Month range kept per report, since each has its own sensible default
  const [monthRanges, setMonthRanges] = useState(() =>
    Object.fromEntries(REPORTS.filter((r) => r.defaultMonths).map((r) => [r.id, r.defaultMonths()]))
  );

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res?.data || [])).catch(() => setDepartments([]));
    api.get('/reports/employee-options').then((res) => setEmployeeOptions(res?.data || [])).catch(() => setEmployeeOptions([]));
  }, []);

  // Employee picker follows the department filter
  const visibleEmployees = useMemo(() => {
    if (!departmentId) return employeeOptions;
    const deptName = departments.find((d) => String(d.id) === String(departmentId))?.name;
    return employeeOptions.filter((e) => e.department_name === deptName);
  }, [employeeOptions, departments, departmentId]);

  const active = REPORTS.find((r) => r.id === activeId);
  const ActiveReport = active.Component;

  const handleRangeChange = (key, value) => {
    setRange((prev) => {
      const next = { ...prev, [key]: value };
      return next.from && next.to && next.from > next.to ? { from: next.to, to: next.from } : next;
    });
  };

  const monthRange = monthRanges[activeId];
  const handleMonthRangeChange = (key, value) => {
    setMonthRanges((prev) => {
      const next = { ...prev[activeId], [key]: value };
      return { ...prev, [activeId]: next.from > next.to ? { from: next.to, to: next.from } : next };
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-2 sm:p-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-xl border border-gray-200/60 w-fit max-w-full">
          {REPORTS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveId(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                activeId === id ? 'bg-white text-indigo-700 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              <Icon size={16} className={activeId === id ? 'text-indigo-600' : 'text-gray-400'} />
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.6fr] gap-3">
          <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white">
            <Search size={16} className="text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code in results..."
              className="w-full border-none focus:outline-none text-sm"
            />
          </div>

          <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white">
            <Filter size={16} className="text-gray-400 mr-2 shrink-0" />
            <select
              value={departmentId}
              onChange={(e) => { setDepartmentId(e.target.value); setEmployeeId(''); }}
              className="w-full border-none focus:outline-none text-sm bg-transparent"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <SearchableEmployeeSelect
            employees={visibleEmployees}
            selectedEmployeeId={employeeId}
            onSelect={(emp) => setEmployeeId(emp ? String(emp.employee_id) : '')}
            placeholder="All employees"
          />

          {active.period === 'month' && (
            <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white">
              <Calendar size={16} className="text-gray-400 mr-2 shrink-0" />
              <input
                type="month"
                value={month}
                max={currentMonthStr()}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="w-full border-none focus:outline-none text-sm"
              />
            </div>
          )}
          {active.period === 'range' && (
            <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white gap-1">
              <Calendar size={16} className="text-gray-400 mr-1 shrink-0" />
              <input
                type="date"
                value={range.from}
                onChange={(e) => e.target.value && handleRangeChange('from', e.target.value)}
                className="min-w-0 flex-1 border-none focus:outline-none text-sm"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={range.to}
                onChange={(e) => e.target.value && handleRangeChange('to', e.target.value)}
                className="min-w-0 flex-1 border-none focus:outline-none text-sm"
              />
            </div>
          )}
          {active.period === 'monthRange' && (
            <div className="flex items-center border border-gray-300 rounded-xl px-3 py-2 bg-white gap-1">
              <Calendar size={16} className="text-gray-400 mr-1 shrink-0" />
              <input
                type="month"
                value={monthRange.from}
                max={currentMonthStr()}
                onChange={(e) => e.target.value && handleMonthRangeChange('from', e.target.value)}
                className="min-w-0 flex-1 border-none focus:outline-none text-sm"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="month"
                value={monthRange.to}
                max={currentMonthStr()}
                onChange={(e) => e.target.value && handleMonthRangeChange('to', e.target.value)}
                className="min-w-0 flex-1 border-none focus:outline-none text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm">
        <ActiveReport
          key={activeId}
          departmentId={departmentId}
          employeeId={employeeId}
          search={search}
          month={month}
          from={range.from}
          to={range.to}
          fromMonth={monthRange?.from}
          toMonth={monthRange?.to}
        />
      </div>
    </div>
  );
};

export default Report;

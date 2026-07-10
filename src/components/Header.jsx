import { useLocation } from 'react-router-dom';
import { Bell, User, Menu } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Header = ({ onMenuClick }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const getPageInfo = (pathname) => {
    const pages = {
      '/': {
        title: 'Dashboard',
        description: 'Welcome back! Here is a summary of the system stats and hiring data.'
      },
      '/vacancy': {
        title: 'Vacancy Dashboard',
        description: 'Create, track, and manage job openings and social sharing statistics.'
      },
      '/vacancy-approval': {
        title: 'Vacancy Approval Panel',
        description: 'Review submitted vacancy indents. Approve to open postings, or reject with feedback.'
      },
      '/job-application': {
        title: 'Job Application',
        description: 'Review candidate job applications and follow up on pending hiring requests.'
      },
      '/call-tracker': {
        title: 'Call Tracker',
        description: 'Manage and track follow-up calls with candidates and applicants.'
      },
      '/joining': {
        title: 'Joining',
        description: 'Track candidates that are joining the company and manage their onboarding paperwork.'
      },
      '/after-joining-work': {
        title: 'After Joining Work',
        description: 'Track post-joining details, employee assets, and registration status.'
      },
      '/leaving': {
        title: 'Leaving',
        description: 'Manage exit requests, resignations, and employee offboarding processes.'
      },
      '/after-leaving-work': {
        title: 'After Leaving Work',
        description: 'Track post-exit status, final settlement, and handover documentation.'
      },
      '/employee': {
        title: 'Employee Database',
        description: 'View and manage employee profiles, history, and status.'
      },
      '/leave-management': {
        title: 'Leave Management',
        description: 'Approve or reject employee leave requests and track leave balances.'
      },
      '/leave-policy': {
        title: 'Leave Policy & Holidays',
        description: 'Define company leave policies and holiday calendars.'
      },
      '/emi-management': {
        title: 'EMI Management',
        description: 'Track employee loans, advances, and monthly EMI deduction schemes.'
      },
      '/attendance': {
        title: 'Daily Attendance',
        description: 'Track daily employee attendance and check-in/check-out logs.'
      },
      '/attendance-monthly': {
        title: 'Monthly Attendance',
        description: 'Review monthly attendance reports, working hours, and overtimes.'
      },
      '/attendancedaily': {
        title: 'Daily Attendance',
        description: 'Track daily employee attendance records.'
      },
      '/report': {
        title: 'Reports',
        description: 'Generate and download custom HR reports and summaries.'
      },
      '/social-site': {
        title: 'Social Site',
        description: 'Manage company social media pages and integration.'
      },
      '/payroll': {
        title: 'Payroll Management',
        description: 'Calculate monthly salaries, payslips, and payroll distributions.'
      },
      '/misreport': {
        title: 'MIS Reports',
        description: 'Management Information System reports and analytics.'
      },
      '/my-profile': {
        title: 'My Profile',
        description: 'View and edit your personal employee details.'
      },
      '/my-attendance': {
        title: 'My Attendance',
        description: 'Check your personal attendance history and monthly summary.'
      },
      '/leave-request': {
        title: 'Leave Request',
        description: 'Apply for leave and track the status of your applications.'
      },
      '/my-salary': {
        title: 'My Salary',
        description: 'View and download your monthly payslips.'
      },
      '/company-calendar': {
        title: 'Company Calendar',
        description: 'View upcoming company events, holidays, and schedules.'
      },
      '/settings': {
        title: 'Settings',
        description: 'Manage system users and administrators.'
      }
    };
    return pages[pathname] || { title: 'HR FMS', description: '' };
  };

  const pageInfo = getPageInfo(location.pathname);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="flex justify-between items-center py-3 px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-600 lg:hidden hover:bg-gray-100 focus:outline-none"
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-col ml-2">
            <h1 className="text-xl font-bold text-gray-800 leading-tight">
              {pageInfo.title}
            </h1>
            {pageInfo.description && (
              <p className="text-xs text-gray-500 font-normal mt-0.5 hidden md:block">
                {pageInfo.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Bell size={20} className="text-gray-500 cursor-pointer hover:text-indigo-600 transition-colors" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
          </div>

          <div className="flex items-center space-x-3 cursor-pointer group">
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                {user?.name || 'Guest'}
              </p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 transition-all">
              <User size={20} className="text-indigo-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
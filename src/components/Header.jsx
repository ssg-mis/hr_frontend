import { useLocation } from 'react-router-dom';
import { Bell, User, Menu } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Header = ({ onMenuClick }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const getPageTitle = (pathname) => {
    const titles = {
      '/': 'Dashboard',
      '/indent': 'Indent',
      '/find-enquiry': 'Find Enquiry',
      '/call-tracker': 'Call Tracker',
      '/joining': 'Joining',
      '/after-joining-work': 'After Joining Work',
      '/leaving': 'Leaving',
      '/after-leaving-work': 'After Leaving Work',
      '/employee': 'Employee',
      '/leave-management': 'Leave Management',
      '/leave-policy': 'Leave Policy',
      '/emi-management': 'EMI Management',
      '/attendance': 'Daily Attendance',
      '/attendance-monthly': 'Monthly Attendance',
      '/attendancedaily': 'Daily Attendance',
      '/report': 'Reports',
      '/social-site': 'Social Site',
      '/payroll': 'Payroll',
      '/misreport': 'MIS Reports',
      '/my-profile': 'My Profile',
      '/my-attendance': 'My Attendance',
      '/leave-request': 'Leave Request',
      '/my-salary': 'My Salary',
      '/company-calendar': 'Company Calendar',
    };
    return titles[pathname] || 'HR FMS';
  };

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

          <h1 className="text-xl font-bold text-gray-800 ml-2">
            {getPageTitle(location.pathname)}
          </h1>
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
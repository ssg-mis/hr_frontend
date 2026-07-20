import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Globe,
  Search,
  Phone,
  UserCheck,
  UserX,
  UserMinus,
  AlarmClockCheck,
  Users,
  Calendar,
  Clock,
  LogOut as LogOutIcon,
  X,
  User,
  Menu,
  ChevronDown,
  ChevronUp,
  NotebookPen,
  Book,
  BookPlus,
  CreditCard,
  Settings,
  ClipboardCheck,
  CalendarClock,
  ClipboardList,
  FileCheck,
  Mail,
  IndianRupee,
  Utensils,
  ShieldCheck,
} from "lucide-react";

import useAuthStore from "../store/authStore";

const Sidebar = ({ onClose }) => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [isResignationOpen, setIsResignationOpen] = useState(false);

  const user = useAuthStore(state => state.user);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const adminMenuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    {
      type: "dropdown",
      icon: NotebookPen,
      label: "Recruitment Module",
      isOpen: isRecruitmentOpen,
      toggle: () => setIsRecruitmentOpen(!isRecruitmentOpen),
      items: [
        { path: "/vacancy", label: "Vacancy" },
        { path: "/vacancy-approval", label: "Vacancy Approval" },
        { path: "/job-application", label: "Job Application" },
        { path: "/call-tracker", label: "Call Tracker" },
        { path: "/interview-management", label: "Interview Management" },
        { path: "/selection-process", label: "Selection Process" },
        { path: "/offer-management", label: "Offer Management" },
        { path: "/document-verification", label: "Document Verification" },
        { path: "/joining", label: "Joining" },
      ],
    },
    {
      type: "dropdown",
      icon: UserX,
      label: "Resignation Module",
      isOpen: isResignationOpen,
      toggle: () => setIsResignationOpen(!isResignationOpen),
      items: [
        { path: "/resignation-module", label: "Resignation Requests" },
        { path: "/after-leaving-work", label: "After Leaving Work" },
        { path: "/leaving", label: "Exit Clearance" },
      ],
    },
    {
      type: "dropdown",
      icon: Clock,
      label: "Attendance Module",
      isOpen: isAttendanceOpen,
      toggle: () => setIsAttendanceOpen(!isAttendanceOpen),
      items: [
        { path: "/attendance-dashboard", label: "Attendance Dashboard" },
        { path: "/shift-management", label: "Shift Management" },
      ],
    },
    { path: "/employee", icon: Users, label: "Employee" },
    { path: "/leave-management", icon: BookPlus, label: "Leave Management" },
    { path: "/leave-policy", icon: BookPlus, label: "Leave Record" },
    { path: "/emi-management", icon: CreditCard, label: "EMI Management" },
    { path: "/salary", icon: IndianRupee, label: "Salary" },
    { path: "/pf-management", icon: ShieldCheck, label: "PF Management" },
    { path: "/canteen", icon: Utensils, label: "Canteen Management" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const getMenuItems = () => {
    if (!user) return [];

    const roles = user.roles ?? (user.role ? [user.role] : []);

    const hasRole = (r) => roles.some(role => role.toLowerCase() === r.toLowerCase());
    const isAdmin = hasRole('admin');
    const isHR = hasRole('hr');
    const isHOD = hasRole('hod');
    const isCanteenManager = hasRole('canteenmanager');
    const isEmployeeOnly = !isAdmin && !isHR && !isHOD && !isCanteenManager;

    if (isAdmin) {
      return adminMenuItems;
    }

    const menuItems = [];
    const addedPaths = new Set();

    const addItem = (item) => {
      const key = item.path ?? item.label;
      if (!addedPaths.has(key)) {
        addedPaths.add(key);
        menuItems.push(item);
      }
    };

    // Dashboard — all privileged users see it
    if (isHR || isHOD) {
      addItem({ path: '/', icon: LayoutDashboard, label: 'Dashboard' });
    }

    // HOD Recruitment items
    if (isHOD && !isHR) {
      addItem({
        type: 'dropdown',
        icon: NotebookPen,
        label: 'Recruitment Module',
        isOpen: isRecruitmentOpen,
        toggle: () => setIsRecruitmentOpen(!isRecruitmentOpen),
        items: [{ path: '/vacancy-approval', label: 'Vacancy Approval' }],
      });
    }

    // HR Recruitment items
    if (isHR) {
      addItem({
        type: 'dropdown',
        icon: NotebookPen,
        label: 'Recruitment Module',
        isOpen: isRecruitmentOpen,
        toggle: () => setIsRecruitmentOpen(!isRecruitmentOpen),
        items: [
          { path: '/vacancy', label: 'Vacancy' },
          { path: '/job-application', label: 'Job Application' },
          { path: '/call-tracker', label: 'Call Tracker' },
          { path: '/interview-management', label: 'Interview Management' },
          { path: '/selection-process', label: 'Selection Process' },
          { path: '/offer-management', label: 'Offer Management' },
          { path: '/document-verification', label: 'Document Verification' },
          { path: '/joining', label: 'Joining' },
        ],
      });
    }

    // Resignation module
    if (isHR || isHOD) {
      const items = isHR
        ? [
            { path: '/resignation-module', label: 'Resignation Requests' },
            { path: '/after-leaving-work', label: 'After Leaving Work' },
            { path: '/leaving', label: 'Exit Clearance' },
          ]
        : [{ path: '/leaving', label: 'Exit Clearance' }];
      addItem({
        type: 'dropdown',
        icon: UserX,
        label: 'Resignation Module',
        isOpen: isResignationOpen,
        toggle: () => setIsResignationOpen(!isResignationOpen),
        items,
      });
    }

    // Attendance module
    if (isHR || isHOD) {
      addItem({
        type: 'dropdown',
        icon: Clock,
        label: 'Attendance Module',
        isOpen: isAttendanceOpen,
        toggle: () => setIsAttendanceOpen(!isAttendanceOpen),
        items: [
          { path: '/attendance-dashboard', label: 'Attendance Dashboard' },
          { path: '/shift-management', label: 'Shift Management' },
        ],
      });
    }

    if (isHR || isHOD) addItem({ path: '/employee', icon: Users, label: isHOD && !isHR ? 'Employee Info' : 'Employee' });
    if (isHR || isHOD) addItem({ path: '/leave-management', icon: BookPlus, label: 'Leave Management' });
    if (isHR) addItem({ path: '/leave-policy', icon: BookPlus, label: 'Leave Record' });
    if (isHR || isHOD) addItem({ path: '/emi-management', icon: CreditCard, label: 'EMI Management' });
    if (isHR || isHOD) addItem({ path: '/salary', icon: IndianRupee, label: 'Salary' });
    if (isHR || isHOD) addItem({ path: '/pf-management', icon: ShieldCheck, label: 'PF Management' });
    if (isHR) addItem({ path: '/canteen', icon: Utensils, label: 'Canteen Management' });

    if (menuItems.length > 0) return menuItems;

    // Canteen manager
    if (isCanteenManager) {
      return [{ path: '/canteen', icon: Utensils, label: 'Canteen Management' }];
    }

    // Pure employee
    return [
      { path: '/my-profile', icon: User, label: 'My Profile' },
      { path: '/my-attendance', icon: Clock, label: 'My Attendance' },
      { path: '/leave-request', icon: Book, label: 'Request Leave' },
      { path: '/leave-policy', icon: BookPlus, label: 'Leave Record' },
      { path: '/emi-management', icon: CreditCard, label: 'My EMI' },
      { path: '/my-salary', icon: IndianRupee, label: 'My Salary' },
      { path: '/pf-management', icon: ShieldCheck, label: 'PF Management' },
      { path: '/canteen', icon: Utensils, label: 'Canteen Info' },
      { path: '/resignation-module', icon: UserMinus, label: 'Resignation' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile menu button - visible only on mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-900 text-white rounded-md shadow-md"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Tablet menu button - visible on tablet (hidden on mobile and desktop) */}
      <button
        className="hidden md:block lg:hidden fixed top-4 left-4 z-50 p-2 bg-indigo-900 text-white rounded-md shadow-md"
        onClick={() => setIsOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Desktop Sidebar - full width on desktop */}
      <div className="hidden lg:block fixed left-0 top-0 h-full">
        <SidebarContent
          menuItems={menuItems}
          user={user}
          handleLogout={handleLogout}
        />
      </div>

      {/* Tablet Sidebar - collapsible */}
      <div
        className={`hidden md:block lg:hidden fixed inset-0 z-40 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`fixed left-0 top-0 h-full z-50 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out`}
        >
          <SidebarContent
            menuItems={menuItems}
            user={user}
            handleLogout={handleLogout}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>

      {/* Mobile Sidebar - collapsible */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        />
        <div
          className={`fixed left-0 top-0 h-full z-50 transform ${isOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out`}
        >
          <SidebarContent
            menuItems={menuItems}
            user={user}
            handleLogout={handleLogout}
            onClose={() => setIsOpen(false)}
          />
        </div>
      </div>

      {/* Add padding to main content when sidebar is open on desktop */}
      <div className="lg:pl-64"></div>
    </>
  );
};

const SidebarContent = ({
  onClose,
  isCollapsed = false,
  menuItems,
  user,
  handleLogout,
}) => (
  <div
    className={`flex flex-col h-full ${isCollapsed ? "w-16" : "w-64"} bg-indigo-900 text-white`}
  >
    {/* Header */}
    <div className="flex items-center justify-between p-5 border-b border-indigo-800 shrink-0">
      {!isCollapsed && (
        <h1 className="text-xl font-bold flex items-center gap-2 text-white">
          <Users size={24} />
          <span>HR FMS</span>
          {user?.role && (
            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded capitalize">
              {user.role}
            </span>
          )}
        </h1>
      )}
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
        >
          <span className="sr-only">Close sidebar</span>
          <X className="h-6 w-6" />
        </button>
      )}
    </div>

    {/* Menu */}
    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
      {menuItems.map((item) => {
        if (item.type === "dropdown") {
          return (
            <div key={item.label}>
              <button
                onClick={item.toggle}
                className={`flex items-center justify-between w-full py-2.5 px-4 rounded-lg transition-colors ${item.isOpen
                  ? "bg-indigo-800 text-white"
                  : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                  }`}
              >
                <div className="flex items-center">
                  <item.icon
                    className={isCollapsed ? "mx-auto" : "mr-3"}
                    size={20}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
                {!isCollapsed &&
                  (item.isOpen ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  ))}
              </button>

              {item.isOpen && !isCollapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.items.map((subItem) => (
                    <NavLink
                      key={subItem.path}
                      to={subItem.path}
                      className={({ isActive }) =>
                        `flex items-center py-2 px-4 rounded-lg transition-colors ${isActive
                          ? "bg-indigo-700 text-white"
                          : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
                        }`
                      }
                      onClick={onClose}
                    >
                      <span>{subItem.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center py-2.5 px-4 rounded-lg transition-colors ${isActive
                ? "bg-indigo-800 text-white"
                : "text-indigo-100 hover:bg-indigo-800 hover:text-white"
              }`
            }
            onClick={onClose}
          >
            <item.icon className={isCollapsed ? "mx-auto" : "mr-3"} size={20} />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>

    {/* Footer - Always visible */}
    <div className="p-4 border-t border-white border-opacity-20 shrink-0">
      <div className="flex items-center space-x-4 mb-4">
        <div className="flex items-center space-x-2 cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <User size={20} className="text-indigo-600" />
          </div>
          {/* Show user info in mobile view regardless of collapsed state */}
          <div className={`${isCollapsed ? "hidden" : "block"} md:block`}>
            <p className="text-sm font-medium text-white truncate max-w-[120px]">
              {user?.Name || user?.Username || "Guest"}
            </p>
            <p className="text-xs text-white capitalize">
              {(() => {
                const roles = user?.roles ?? (user?.role ? [user.role] : []);
                if (roles.some(r => r.toLowerCase() === 'admin')) return 'Administrator';
                const display = [];
                if (roles.some(r => r.toLowerCase() === 'hod')) display.push('Department HOD');
                if (roles.some(r => r.toLowerCase() === 'hr')) display.push('HR Specialist');
                if (display.length > 0) return display.join(' · ');
                if (roles.some(r => r.toLowerCase() === 'canteenmanager')) return 'Canteen Manager';
                return 'Employee';
              })()}
            </p>
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          handleLogout();
          onClose?.();
        }}
        className="flex items-center py-2.5 px-4 rounded-lg text-white opacity-80 hover:bg-white hover:bg-opacity-10 hover:opacity-100 cursor-pointer transition-colors w-full"
      >
        <LogOutIcon className={isCollapsed ? "mx-auto" : "mr-3"} size={20} />
        {!isCollapsed && <span>Logout</span>}
      </button>
    </div>
  </div>
);

export default Sidebar;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Indent from './pages/Indent';
import SocialSite from './pages/SocialSite';
import FindEnquiry from './pages/FindEnquiry';
import CallTracker from './pages/CallTracker';
import AfterJoiningWork from './pages/AfterJoiningWork';
import Leaving from './pages/Leaving';
import AfterLeavingWork from './pages/AfterLeavingWork';
import Employee from './pages/Employee';
import Joining from './pages/Joining';
import MyProfile from './pages/MyProfile';
import MyAttendance from './pages/MyAttendance';
import LeaveRequest from './pages/LeaveRequest';
import MySalary from './pages/MySalary';
import CompanyCalendar from './pages/CompanyCalendar';
import ProtectedRoute from './components/ProtectedRoute';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import Attendancedaily from './pages/Attendancedaily';
import AttendanceMonthly from './pages/AttendanceMonthly';
import Report from './pages/Report';
import Payroll from './pages/Payroll';
// import MisReport from './pages/MisReport';
import LeavePolicy from './pages/LeavePolicy';
import EMIManagement from './pages/EMIManagement';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="bg-white min-h-screen">
      <Router>
        <Toaster position="top-right" containerStyle={{ zIndex: 9999 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="indent" element={<Indent />} />
            {/* <Route path="social-site" element={<SocialSite />} /> */}
            <Route path="find-enquiry" element={<FindEnquiry />} />
            <Route path="call-tracker" element={<CallTracker />} />
            <Route path="after-joining-work" element={<AfterJoiningWork />} />
            <Route path="leaving" element={<Leaving />} />
            <Route path="after-leaving-work" element={<AfterLeavingWork />} />
            <Route path="employee" element={<Employee />} />
            <Route path="joining" element={<Joining />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="leave-policy" element={<LeavePolicy />} />
            <Route path="leave-request" element={<LeaveRequest />} />
            <Route path="my-salary" element={<MySalary />} />
            <Route path="company-calendar" element={<CompanyCalendar />} />
             <Route path="leave-management" element={<LeaveManagement />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="attendancedaily" element={<Attendancedaily />} />
              <Route path="attendance-monthly" element={<AttendanceMonthly />} />
              <Route path="report" element={<Report />} />
              <Route path="payroll" element={<Payroll />} />
              {/* <Route path="misreport" element={<MisReport />} /> */}
              <Route path="emi-management" element={<EMIManagement />} />
              <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
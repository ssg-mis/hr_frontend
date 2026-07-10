import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vacancy from './features/vacancy/VacancyPage';
import VacancyApproval from './features/vacancy/VacancyApprovalPage';
import SocialSite from './pages/SocialSite';
import JobApplication from './features/jobApplication/JobApplicationPage';
import PublicApply from './features/jobApplication/PublicApplyPage';
import CallTracker from './features/followUp/FollowUpPage';
import InterviewManagement from './pages/InterviewManagement';
import SelectionProcess from './pages/SelectionProcess';
import DocumentVerification from './pages/DocumentVerification';
import OfferManagement from './pages/OfferManagement';
import ResignationModule from './pages/ResignationModule';
import Leaving from './pages/Leaving';
import AfterLeavingWork from './pages/AfterLeavingWork';
import Employee from './pages/Employee';
import Joining from './pages/Joining';
import MyProfile from './pages/MyProfile';
import MyAttendance from './pages/MyAttendance';
import LeaveRequest from './pages/LeaveRequest';
import CompanyCalendar from './pages/CompanyCalendar';
import Attendance from './pages/Attendance';
import LeaveManagement from './pages/LeaveManagement';
import AttendanceMonthly from './pages/AttendanceMonthly';
import Report from './pages/Report';
// import MisReport from './pages/MisReport';
import LeavePolicy from './pages/LeavePolicy';
import EMIManagement from './pages/EMIManagement';
import Settings from './pages/Settings';

function App() {
  return (
    <div className="bg-white min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-right" containerStyle={{ zIndex: 9999 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/apply/:vacancyNumber" element={<PublicApply />} />
          
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="vacancy" element={<Vacancy />} />
            <Route path="vacancy-approval" element={<VacancyApproval />} />
            {/* <Route path="social-site" element={<SocialSite />} /> */}
            <Route path="job-application" element={<JobApplication />} />
            <Route path="call-tracker" element={<CallTracker />} />
            <Route path="interview-management" element={<InterviewManagement />} />
            <Route path="selection-process" element={<SelectionProcess />} />
            <Route path="offer-management" element={<OfferManagement />} />
            <Route path="document-verification" element={<DocumentVerification />} />
            <Route path="resignation-module" element={<ResignationModule />} />
            <Route path="leaving" element={<Leaving />} />
            <Route path="after-leaving-work" element={<AfterLeavingWork />} />
            <Route path="employee" element={<Employee />} />
            <Route path="joining" element={<Joining />} />
            <Route path="my-profile" element={<MyProfile />} />
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="leave-policy" element={<LeavePolicy />} />
            <Route path="leave-request" element={<LeaveRequest />} />
            <Route path="company-calendar" element={<CompanyCalendar />} />
            <Route path="leave-management" element={<LeaveManagement />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="attendance-monthly" element={<AttendanceMonthly />} />
            <Route path="report" element={<Report />} />
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

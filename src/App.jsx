import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
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
import PublicDocumentUpload from './pages/PublicDocumentUpload';
import OfferManagement from './pages/OfferManagement';
import ResignationModule from './pages/ResignationModule';
import Leaving from './pages/Leaving';
import AfterLeavingWork from './pages/AfterLeavingWork';
import Employee from './pages/Employee';
import Joining from './pages/Joining';
import MyProfile from './pages/MyProfile';
import MyAttendance from './pages/MyAttendance';
import MySalary from './pages/MySalary';
import LeaveRequest from './pages/LeaveRequest';
import CompanyCalendar from './pages/CompanyCalendar';
import LeaveManagement from './pages/LeaveManagement';
import Report from './pages/Report';
import LeavePolicy from './pages/LeavePolicy';
import Settings from './pages/Settings';
import AttendanceLogs from './pages/AttendanceLogs';
import AttendanceDashboard from './pages/AttendanceDashboard';
import ShiftManagement from './pages/ShiftManagement';
import CanteenDashboard from './pages/CanteenDashboard';
import CanteenScanner from './pages/CanteenScanner';
import GatePassManagement from './pages/GatePassManagement';
import PublicVisitorPassRequest from './pages/PublicVisitorPassRequest';

const SalaryManagement = lazy(() => import('./pages/SalaryManagement'));
const Payroll = lazy(() => import('./pages/Payroll'));
const EMIManagement = lazy(() => import('./pages/EMIManagement'));
const CompensationManagement = lazy(() => import('./pages/CompensationManagement'));
const PFManagement = lazy(() => import('./pages/PFManagement'));
const ESICManagement = lazy(() => import('./pages/ESICManagement'));
const MasterData = lazy(() => import('./pages/MasterData'));
const OvertimeManagement = lazy(() => import('./pages/OvertimeManagement'));

function App() {
  return (
    <div className="bg-white min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-3 text-slate-500">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                <p className="text-sm font-medium">Loading page...</p>
              </div>
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/apply/:vacancyNumber" element={<PublicApply />} />
            <Route path="/upload-documents/:token" element={<PublicDocumentUpload />} />
            <Route path="/visitor-pass-request" element={<PublicVisitorPassRequest />} />
            <Route
              path="/canteen/scan"
              element={
                <ProtectedRoute allowedRoles={['CanteenManager', 'Admin', 'HR']}>
                  <CanteenScanner />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="vacancy" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><Vacancy /></ProtectedRoute>} />
              <Route path="vacancy-approval" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><VacancyApproval /></ProtectedRoute>} />
              <Route path="job-application" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><JobApplication /></ProtectedRoute>} />
              <Route path="call-tracker" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><CallTracker /></ProtectedRoute>} />
              <Route path="interview-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><InterviewManagement /></ProtectedRoute>} />
              <Route path="selection-process" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><SelectionProcess /></ProtectedRoute>} />
              <Route path="offer-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><OfferManagement /></ProtectedRoute>} />
              <Route path="document-verification" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><DocumentVerification /></ProtectedRoute>} />
              <Route path="resignation-module" element={<ResignationModule />} />
              <Route path="leaving" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><Leaving /></ProtectedRoute>} />
              <Route path="after-leaving-work" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><AfterLeavingWork /></ProtectedRoute>} />
              <Route path="employee" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><Employee /></ProtectedRoute>} />
              <Route path="joining" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><Joining /></ProtectedRoute>} />
              <Route path="master-data" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><MasterData /></ProtectedRoute>} />
              <Route path="my-profile" element={<MyProfile />} />
              <Route path="my-attendance" element={<MyAttendance />} />
              <Route path="my-salary" element={<MySalary />} />
              <Route path="leave-policy" element={<LeavePolicy />} />
              <Route path="leave-request" element={<LeaveRequest />} />
              <Route path="company-calendar" element={<CompanyCalendar />} />
              <Route path="leave-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><LeaveManagement /></ProtectedRoute>} />
              <Route path="report" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><Report /></ProtectedRoute>} />
              <Route path="emi-management" element={<EMIManagement />} />
              <Route path="settings" element={<ProtectedRoute allowedRoles={['Admin']}><Settings /></ProtectedRoute>} />
              <Route path="salary" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><SalaryManagement /></ProtectedRoute>} />
              <Route path="payroll" element={<ProtectedRoute allowedRoles={['Admin', 'HR']}><Payroll /></ProtectedRoute>} />
              <Route path="pf-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD', 'Employee']}><PFManagement /></ProtectedRoute>} />
              <Route path="esic-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD', 'Employee']}><ESICManagement /></ProtectedRoute>} />
              <Route path="gate-pass" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD', 'Employee']}><GatePassManagement /></ProtectedRoute>} />
              <Route path="compensation" element={<CompensationManagement />} />
              <Route path="attendance-logs" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><AttendanceLogs /></ProtectedRoute>} />
              <Route path="attendance-dashboard" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><AttendanceDashboard /></ProtectedRoute>} />
              <Route path="shift-management" element={<ProtectedRoute allowedRoles={['Admin', 'HR', 'HOD']}><ShiftManagement /></ProtectedRoute>} />
              <Route path="overtime-management" element={<OvertimeManagement />} />
              <Route path="canteen" element={<CanteenDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

export default App;

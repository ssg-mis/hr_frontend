/**
 * Master definition of system page permissions.
 * STRICT RULE: Only the existing system pages/modules currently built into the application.
 */

export const SYSTEM_MODULES = [
  {
    id: 'main',
    label: 'Main Dashboard',
    description: 'Executive KPI metrics & operational dashboard',
    pages: [
      { id: '/', label: 'Executive / Department Dashboard', path: '/', description: 'Overview metrics, department strength, and attendance stats' },
    ],
  },
  {
    id: 'recruitment',
    label: 'Recruitment Module',
    description: 'Job postings, applications, interviews, offers, and hiring',
    pages: [
      { id: '/vacancy', label: 'Vacancy Requisitions', path: '/vacancy', description: 'Create and manage company job requisitions' },
      { id: '/vacancy-approval', label: 'Vacancy Approval', path: '/vacancy-approval', description: 'Approve or reject departmental staff requests' },
      { id: '/job-application', label: 'Job Applications', path: '/job-application', description: 'Candidate database and application tracking' },
      { id: '/call-tracker', label: 'Call Tracker', path: '/call-tracker', description: 'Log telephonic screening and follow-up records' },
      { id: '/interview-management', label: 'Interview Management', path: '/interview-management', description: 'Schedule rounds and record evaluation outcomes' },
      { id: '/selection-process', label: 'Selection Process', path: '/selection-process', description: 'Final selection and candidate status progression' },
      { id: '/offer-management', label: 'Offer Management', path: '/offer-management', description: 'Generate offers and collect onboarding documents' },
      { id: '/document-verification', label: 'Document Verification', path: '/document-verification', description: 'Verify Aadhaar, PAN, certificates and KYC' },
      { id: '/joining', label: 'Joining & Onboarding', path: '/joining', description: 'Generate employee code and complete onboarding' },
    ],
  },
  {
    id: 'resignation',
    label: 'Resignation & Exit Module',
    description: 'Resignation requests, asset clearance, and full & final work',
    pages: [
      { id: '/resignation-module', label: 'Resignation Requests', path: '/resignation-module', description: 'Submit and process employee resignations' },
      { id: '/leaving', label: 'Exit Clearance', path: '/leaving', description: 'Departmental asset and equipment handover checklist' },
      { id: '/after-leaving-work', label: 'After Leaving Work (FNF)', path: '/after-leaving-work', description: 'Full & final settlement and relieving letters' },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance Module',
    description: 'Biometric punches, shift rosters, and overtime tracking',
    pages: [
      { id: '/attendance-dashboard', label: 'Attendance Dashboard', path: '/attendance-dashboard', description: 'Live biometric punch monitor & attendance summary' },
      { id: '/attendance-logs', label: 'Attendance Logs', path: '/attendance-logs', description: 'Detailed daily punch-in/out records' },
      { id: '/shift-management', label: 'Shift Management', path: '/shift-management', description: 'Configure shifts and assign rosters to staff' },
      { id: '/overtime-management', label: 'Overtime (OT) Request', path: '/overtime-management', description: 'Apply, endorse, and approve overtime claims' },
      { id: '/my-attendance', label: 'My Attendance', path: '/my-attendance', description: 'Personal punch log and monthly calendar' },
    ],
  },
  {
    id: 'employee',
    label: 'Employee Management',
    description: 'Employee directory and self-service profile',
    pages: [
      { id: '/employee', label: 'Employee Directory', path: '/employee', description: 'Master employee list, profiles, and contact data' },
      { id: '/my-profile', label: 'My Profile (Self Service)', path: '/my-profile', description: 'Personal profile, KYC documents, and bank info' },
    ],
  },
  {
    id: 'leave',
    label: 'Leave Module',
    description: 'Leave applications, policies, approvals, and holiday calendar',
    pages: [
      { id: '/leave-policy', label: 'Leave Record & Balances', path: '/leave-policy', description: 'Leave balance breakdown and company policies' },
      { id: '/leave-management', label: 'Leave Management', path: '/leave-management', description: 'Review, approve, or reject employee leave requests' },
      { id: '/leave-request', label: 'Request Leave', path: '/leave-request', description: 'Apply for personal leave' },
      { id: '/company-calendar', label: 'Company Holiday Calendar', path: '/company-calendar', description: 'View annual holidays and scheduled off-days' },
    ],
  },
  {
    id: 'salary',
    label: 'Salary & Payroll Module',
    description: 'Salary master, monthly payroll runs, statutory compliance, and advances',
    pages: [
      { id: '/salary', label: 'Salary Master', path: '/salary', description: 'Employee salary structures and compensation rates' },
      { id: '/payroll', label: 'Payroll Creation', path: '/payroll', description: 'Monthly payroll calculation, import, and bank disbursement' },
      { id: '/emi-management', label: 'EMI / Advance Loans', path: '/emi-management', description: 'Company advance loans and monthly repayment tracking' },
      { id: '/compensation', label: 'Compensation & Allowances', path: '/compensation', description: 'Special incentives, overtime pay, and bonuses' },
      { id: '/pf-management', label: 'PF Management', path: '/pf-management', description: 'Provident Fund calculations, UAN, and reports' },
      { id: '/esic-management', label: 'ESIC Management', path: '/esic-management', description: 'Employee State Insurance compliance records' },
      { id: '/my-salary', label: 'My Salary & Payslips', path: '/my-salary', description: 'Personal salary breakdown and PDF payslip download' },
    ],
  },
  {
    id: 'gatepass',
    label: 'Gate Pass Management',
    description: 'Premises gate pass approvals and visitor passes',
    pages: [
      { id: '/gate-pass', label: 'Gate Pass Management', path: '/gate-pass', description: 'Apply for and authorize employee & visitor gate passes' },
    ],
  },
  {
    id: 'canteen',
    label: 'Canteen Management',
    description: 'Cafeteria meal scanner and consumption logging',
    pages: [
      { id: '/canteen', label: 'Canteen Dashboard', path: '/canteen', description: 'Daily and monthly dining consumption records' },
      { id: '/canteen/scan', label: 'Canteen QR Scanner', path: '/canteen/scan', description: 'Dining entrance live badge/QR code scanner' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'Comprehensive business reports and data exports',
    pages: [
      { id: '/report', label: 'Reports & Analytics', path: '/report', description: 'Generate consolidated attendance and HR reports' },
    ],
  },
  {
    id: 'masterdata',
    label: 'Master Data Management',
    description: 'Departments, designations, branches, and holiday settings',
    pages: [
      { id: '/master-data', label: 'Master Data Management', path: '/master-data', description: 'Configure departments, designations, branches, and calendars' },
    ],
  },
  {
    id: 'settings',
    label: 'System Settings',
    description: 'Administrator credentials, role assignments, and permissions',
    pages: [
      { id: '/settings', label: 'Settings & User Credentials', path: '/settings', description: 'Manage login credentials and dynamic page access' },
    ],
  },
];

/**
 * Returns a flat array of all existing system page paths.
 */
export const getAllPagePaths = () => {
  const paths = [];
  SYSTEM_MODULES.forEach((mod) => {
    mod.pages.forEach((p) => {
      paths.push(p.path);
    });
  });
  return paths;
};

/**
 * Default role presets reflecting standard responsibilities.
 * Selecting a role automatically checks these pages as defaults.
 */
export const ROLE_PAGE_PRESETS = {
  Admin: getAllPagePaths(), // Admin has 100% full access to everything

  HR: [
    '/',
    '/vacancy',
    '/vacancy-approval',
    '/job-application',
    '/call-tracker',
    '/interview-management',
    '/selection-process',
    '/offer-management',
    '/document-verification',
    '/joining',
    '/resignation-module',
    '/after-leaving-work',
    '/leaving',
    '/attendance-dashboard',
    '/attendance-logs',
    '/shift-management',
    '/overtime-management',
    '/my-attendance',
    '/employee',
    '/my-profile',
    '/leave-policy',
    '/leave-management',
    '/leave-request',
    '/company-calendar',
    '/salary',
    '/payroll',
    '/emi-management',
    '/compensation',
    '/pf-management',
    '/esic-management',
    '/my-salary',
    '/gate-pass',
    '/canteen',
    '/canteen/scan',
    '/report',
    '/master-data',
  ],

  HOD: [
    '/',
    '/vacancy-approval',
    '/leaving',
    '/attendance-dashboard',
    '/attendance-logs',
    '/shift-management',
    '/overtime-management',
    '/my-attendance',
    '/employee',
    '/my-profile',
    '/leave-policy',
    '/leave-management',
    '/leave-request',
    '/company-calendar',
    '/salary',
    '/emi-management',
    '/compensation',
    '/pf-management',
    '/esic-management',
    '/my-salary',
    '/gate-pass',
  ],

  Employee: [
    '/my-profile',
    '/my-attendance',
    '/overtime-management',
    '/leave-policy',
    '/leave-request',
    '/company-calendar',
    '/my-salary',
    '/emi-management',
    '/compensation',
    '/pf-management',
    '/esic-management',
    '/gate-pass',
    '/canteen',
    '/resignation-module',
  ],

  CanteenManager: [
    '/canteen',
    '/canteen/scan',
  ],
};

/**
 * Helper to get default page array for a given role name.
 */
export const getDefaultPagesForRole = (roleName) => {
  if (!roleName) return ROLE_PAGE_PRESETS.Employee;
  const key = Object.keys(ROLE_PAGE_PRESETS).find(
    (k) => k.toLowerCase() === roleName.toLowerCase().replace(/[^a-z0-9]/g, '')
  );
  return key ? [...ROLE_PAGE_PRESETS[key]] : [...ROLE_PAGE_PRESETS.Employee];
};

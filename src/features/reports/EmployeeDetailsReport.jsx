import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { useReport, StatCards, SectionHeader, ReportStatus, ReportTable, StatusBadge } from './ReportParts';
import { downloadExcel, formatDate, formatMoney, todayStr } from './reportUtils';

// Every field, grouped for the profile view; the same list drives the Excel export
const FIELD_GROUPS = [
  {
    title: 'Personal',
    fields: [
      { key: 'employeeCode', label: 'Emp Code' },
      { key: 'title', label: 'Title' },
      { key: 'name', label: 'Name', width: 26 },
      { key: 'fatherName', label: "Father's Name", width: 24 },
      { key: 'gender', label: 'Gender' },
      { key: 'dob', label: 'Date of Birth', date: true },
      { key: 'maritalStatus', label: 'Marital Status' },
      { key: 'bloodGroup', label: 'Blood Group' },
      { key: 'qualification', label: 'Qualification' },
    ],
  },
  {
    title: 'Contact',
    fields: [
      { key: 'phone', label: 'Mobile' },
      { key: 'email', label: 'Email', width: 24 },
      { key: 'presentAddress', label: 'Present Address', width: 40 },
      { key: 'permanentAddress', label: 'Permanent Address', width: 40 },
    ],
  },
  {
    title: 'Documents',
    fields: [
      { key: 'aadharNo', label: 'Aadhaar No', width: 16 },
      { key: 'panNo', label: 'PAN No' },
      { key: 'voterIdNo', label: 'Voter ID' },
      { key: 'drivingLicenseNo', label: 'Driving License', width: 18 },
      { key: 'rationCardNo', label: 'Ration Card' },
    ],
  },
  {
    title: 'Employment',
    fields: [
      { key: 'department', label: 'Department', width: 18 },
      { key: 'designation', label: 'Designation', width: 18 },
      { key: 'branch', label: 'Company / Branch', width: 30 },
      { key: 'shift', label: 'Shift' },
      { key: 'weeklyOff', label: 'Weekly Off' },
      { key: 'joiningDate', label: 'Joining Date', date: true },
      { key: 'confirmDate', label: 'Confirmation Date', date: true },
      { key: 'leftDate', label: 'Left Date', date: true },
      { key: 'status', label: 'Status' },
      { key: 'role', label: 'System Role' },
    ],
  },
  {
    title: 'Salary & Bank',
    fields: [
      { key: 'basicSalary', label: 'Basic (Monthly)', money: true },
      { key: 'allowance', label: 'Allowance (Monthly)', money: true },
      { key: 'grossSalary', label: 'Gross (Monthly)', money: true },
      { key: 'payMode', label: 'Pay Mode' },
      { key: 'bankAccountNo', label: 'Bank Account No', width: 20 },
      { key: 'ifscCode', label: 'IFSC' },
    ],
  },
  {
    title: 'PF & ESIC',
    fields: [
      { key: 'pfApplicable', label: 'PF Applicable', bool: true },
      { key: 'uanNo', label: 'UAN No', width: 16 },
      { key: 'pfNo', label: 'PF No', width: 22 },
      { key: 'esicApplicable', label: 'ESIC Applicable', bool: true },
      { key: 'esicNo', label: 'ESIC IP No', width: 18 },
    ],
  },
];
const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields);

const displayValue = (field, value) => {
  if (field.bool) return value ? 'Yes' : 'No';
  if (field.money) return formatMoney(value);
  if (field.date) return formatDate(value);
  return value === null || value === undefined || value === '' ? '—' : value;
};

const ProfileCard = ({ emp, onClose }) => (
  <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-5 space-y-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h4 className="text-lg font-black text-gray-900">{emp.name}</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          {emp.employeeCode} · {[emp.designation, emp.department].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge status={emp.status} />
        {onClose && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" title="Close">
            <X size={18} />
          </button>
        )}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {FIELD_GROUPS.map((g) => (
        <div key={g.title} className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2">{g.title}</p>
          <dl className="space-y-1.5">
            {g.fields.map((f) => (
              <div key={f.key} className="flex justify-between gap-3 text-sm">
                <dt className="text-gray-500 shrink-0">{f.label}</dt>
                <dd className="font-semibold text-gray-800 text-right break-words min-w-0">{displayValue(f, emp[f.key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  </div>
);

const EmployeeDetailsReport = ({ departmentId, employeeId, search }) => {
  const [status, setStatus] = useState('Active');
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { data, loading, error } = useReport('employees', { departmentId, employeeId, status });

  const term = search.trim().toLowerCase();
  const rows = (data || []).filter((e) =>
    !term || [e.name, e.employeeCode, e.fatherName, e.phone].some((v) => String(v || '').toLowerCase().includes(term))
  );
  const single = employeeId && rows.length === 1 ? rows[0] : null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadExcel(`Employee_Details_${todayStr()}.xlsx`, [{
        name: 'Employee Details',
        title: `Employee Details Report — ${status === 'all' ? 'All' : status} employees (${rows.length})`,
        columns: ALL_FIELDS.map((f) => ({ header: f.label, key: f.key, width: f.width || 14, numFmt: f.money ? '#,##0.00' : undefined })),
        rows: rows.map((e) => Object.fromEntries(ALL_FIELDS.map((f) => [
          f.key,
          f.bool ? (e[f.key] ? 'Yes' : 'No') : f.date ? (e[f.key] ? formatDate(e[f.key]) : '') : f.money ? Number(e[f.key] || 0) : (e[f.key] ?? ''),
        ]))),
      }]);
    } catch (err) {
      toast.error(err.message || 'Failed to download Excel');
    } finally {
      setDownloading(false);
    }
  };

  const columns = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'fatherName', label: "Father's Name" },
    { key: 'phone', label: 'Mobile' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'joiningDate', label: 'Joining', render: (r) => formatDate(r.joiningDate) },
    { key: 'grossSalary', label: 'Gross', align: 'right', render: (r) => formatMoney(r.grossSalary) },
    { key: 'uanNo', label: 'UAN' },
    { key: 'esicNo', label: 'ESIC No' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Employee Details Report"
        subtitle="Personal, contact, document, salary, bank and PF/ESIC details. Click a row to see the full profile."
        onDownload={handleDownload}
        downloading={downloading}
        downloadDisabled={loading || rows.length === 0}
      />

      <div className="flex flex-wrap gap-2">
        {['Active', 'Pending', 'Relieved', 'all'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            {s === 'all' ? 'All Statuses' : s}
          </button>
        ))}
      </div>

      {!loading && !error && rows.length > 0 && (
        <StatCards items={[
          { label: 'Employees', value: rows.length, tone: 'indigo' },
          { label: 'Male / Female', value: `${rows.filter((e) => /^m/i.test(e.gender || '')).length} / ${rows.filter((e) => /^f/i.test(e.gender || '')).length}`, tone: 'sky' },
          { label: 'PF Applicable', value: rows.filter((e) => e.pfApplicable).length, tone: 'emerald' },
          { label: 'ESIC Applicable', value: rows.filter((e) => e.esicApplicable).length, tone: 'amber' },
          { label: 'Monthly Gross', value: formatMoney(rows.reduce((s, e) => s + Number(e.grossSalary || 0), 0)), tone: 'gray' },
        ]} />
      )}

      <ReportStatus loading={loading} error={error} empty={rows.length === 0} />

      {!loading && !error && rows.length > 0 && (
        single ? (
          <ProfileCard emp={single} />
        ) : (
          <>
            {selected && <ProfileCard emp={selected} onClose={() => setSelected(null)} />}
            <ReportTable columns={columns} rows={rows} onRowClick={setSelected} />
          </>
        )
      )}
    </div>
  );
};

export default EmployeeDetailsReport;

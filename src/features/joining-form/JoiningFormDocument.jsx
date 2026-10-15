import React, { forwardRef } from 'react';

// No letter-spacing anywhere: html2canvas draws per-glyph then, breaking Hindi conjuncts.
const FONT = "'Segoe UI', 'Nirmala UI', 'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mangal', Arial, sans-serif";
const C = { text: '#1f2937', muted: '#4b5563', line: '#d1d5db', accent: '#1e3a8a', head: '#eff6ff' };

const L = {
  en: {
    title: 'EMPLOYEE JOINING FORM', ref: 'Application No.', date: 'Date',
    job: 'Job Details', personal: 'Personal Details', contact: 'Contact & Address', ids: 'Identity Documents',
    bank: 'Bank Details', statutory: 'PF / ESIC', salary: 'Salary (Monthly)', emergency: 'Emergency Contact',
    nominee: 'Nominee / Family', previous: 'Previous Employment',
    employeeCode: 'Employee Code', joiningDate: 'Date of Joining', company: 'Company', department: 'Department',
    designation: 'Designation', shift: 'Shift', weeklyOff: 'Weekly Off', payMode: 'Pay Mode',
    name: 'Full Name', fatherName: "Father's Name", dob: 'Date of Birth', gender: 'Gender', marital: 'Marital Status',
    blood: 'Blood Group', qualification: 'Qualification',
    mobile: 'Mobile', altMobile: 'Alternate Mobile', email: 'Email', present: 'Present Address', permanent: 'Permanent Address',
    aadhaar: 'Aadhaar No.', pan: 'PAN No.', voter: 'Voter ID', dl: 'Driving Licence', ration: 'Ration Card',
    bankName: 'Bank Name', account: 'Account No.', ifsc: 'IFSC',
    pf: 'PF Applicable', uan: 'UAN No.', pfId: 'PF Member ID', esic: 'ESIC Applicable', esicNo: 'ESIC / IP No.',
    basic: 'Basic + DA', allowance: 'Allowance', gross: 'Gross Salary',
    relation: 'Relation', share: 'Share %', yes: 'Yes', no: 'No',
    prevCompany: 'Company', prevPosition: 'Position', experience: 'Experience', lastSalary: 'Last Salary', reason: 'Reason for Leaving',
    declaration: 'Declaration',
    declText: 'I hereby declare that the information given above is true and correct to the best of my knowledge. I understand that any false information may lead to termination of my employment. I agree to abide by the rules and regulations of the company.',
    empSign: 'Employee Signature', hrSign: 'HR Signature', hodSign: 'HOD Signature', photo: 'Photo',
  },
  hi: {
    title: 'कर्मचारी कार्यभार ग्रहण प्रपत्र', ref: 'आवेदन क्रमांक', date: 'दिनांक',
    job: 'कार्य विवरण', personal: 'व्यक्तिगत विवरण', contact: 'संपर्क एवं पता', ids: 'पहचान दस्तावेज़',
    bank: 'बैंक विवरण', statutory: 'पीएफ / ईएसआईसी', salary: 'वेतन (मासिक)', emergency: 'आपातकालीन संपर्क',
    nominee: 'नामांकित व्यक्ति / परिवार', previous: 'पिछला रोज़गार',
    employeeCode: 'कर्मचारी कोड', joiningDate: 'कार्यभार ग्रहण तिथि', company: 'कंपनी', department: 'विभाग',
    designation: 'पद', shift: 'शिफ्ट', weeklyOff: 'साप्ताहिक अवकाश', payMode: 'भुगतान माध्यम',
    name: 'पूरा नाम', fatherName: 'पिता का नाम', dob: 'जन्म तिथि', gender: 'लिंग', marital: 'वैवाहिक स्थिति',
    blood: 'रक्त समूह', qualification: 'शैक्षणिक योग्यता',
    mobile: 'मोबाइल', altMobile: 'वैकल्पिक मोबाइल', email: 'ईमेल', present: 'वर्तमान पता', permanent: 'स्थायी पता',
    aadhaar: 'आधार क्रमांक', pan: 'पैन क्रमांक', voter: 'मतदाता पहचान पत्र', dl: 'ड्राइविंग लाइसेंस', ration: 'राशन कार्ड',
    bankName: 'बैंक का नाम', account: 'खाता क्रमांक', ifsc: 'आईएफएससी',
    pf: 'पीएफ लागू', uan: 'यूएएन क्रमांक', pfId: 'पीएफ सदस्य आईडी', esic: 'ईएसआईसी लागू', esicNo: 'ईएसआईसी / आईपी क्रमांक',
    basic: 'मूल वेतन + डीए', allowance: 'भत्ता', gross: 'कुल वेतन',
    relation: 'संबंध', share: 'हिस्सा %', yes: 'हाँ', no: 'नहीं',
    prevCompany: 'कंपनी', prevPosition: 'पद', experience: 'अनुभव', lastSalary: 'अंतिम वेतन', reason: 'छोड़ने का कारण',
    declaration: 'घोषणा',
    declText: 'मैं घोषणा करता/करती हूँ कि ऊपर दी गई सभी जानकारी मेरी जानकारी के अनुसार सत्य एवं सही है। किसी भी जानकारी के असत्य पाए जाने पर मेरी सेवा समाप्त की जा सकती है। मैं कंपनी के सभी नियमों एवं विनियमों का पालन करने के लिए सहमत हूँ।',
    empSign: 'कर्मचारी के हस्ताक्षर', hrSign: 'एचआर के हस्ताक्षर', hodSign: 'विभागाध्यक्ष के हस्ताक्षर', photo: 'फोटो',
  },
};

const fmtDate = (d, lang) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A4-width (794px) joining form rendered from a snapshot. `images` may carry data URLs for PDF rendering. */
const JoiningFormDocument = forwardRef(({ snapshot: s, images = {} }, ref) => {
  const t = L[s.language] || L.en;
  const yn = (b) => (b ? t.yes : t.no);
  const logo = images.logoUrl ?? s.company.logoUrl;
  const letterhead = images.letterheadUrl ?? s.company.letterheadUrl;
  const photo = images.photo ?? s.photo;
  const cell = { padding: '5px 8px', borderBottom: `1px solid ${C.line}`, verticalAlign: 'top' };
  const lab = { ...cell, color: C.muted, width: '22%', background: '#fafafa' };

  // Two label/value pairs per row.
  const Grid = ({ title, rows }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ background: C.head, color: C.accent, fontWeight: 700, padding: '4px 8px', border: `1px solid ${C.line}`, borderBottom: 'none' }}>{title}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.line}` }}>
        <tbody>
          {Array.from({ length: Math.ceil(rows.length / 2) }).map((_, i) => {
            const a = rows[i * 2];
            const b = rows[i * 2 + 1];
            return (
              <tr key={i}>
                <td style={lab}>{a[0]}</td>
                <td style={{ ...cell, width: b ? '28%' : '78%', whiteSpace: 'pre-line' }} colSpan={b ? 1 : 3}>{a[1] || '—'}</td>
                {b && <><td style={lab}>{b[0]}</td><td style={{ ...cell, width: '28%', whiteSpace: 'pre-line' }}>{b[1] || '—'}</td></>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const v = s.values;
  return (
    <div ref={ref} style={{ width: 794, background: '#fff', color: C.text, fontFamily: FONT, fontSize: 11.5, lineHeight: 1.45, boxSizing: 'border-box' }}>
      {letterhead ? (
        <img src={letterhead} alt="" style={{ width: '100%', display: 'block' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '22px 40px 12px', borderBottom: `3px solid ${C.accent}` }}>
          {logo && <img src={logo} alt="" style={{ height: 54, maxWidth: 140, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.accent }}>{s.company.name}</div>
            {s.company.address && <div style={{ color: C.muted, fontSize: 11, whiteSpace: 'pre-line' }}>{s.company.address}</div>}
            {s.company.contactLine && <div style={{ color: C.muted, fontSize: 11 }}>{s.company.contactLine}</div>}
          </div>
        </div>
      )}

      <div style={{ padding: '14px 40px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.accent }}>{t.title}</div>
            <div style={{ marginTop: 4, color: C.muted }}>{t.ref}: <b style={{ color: C.text }}>{s.applicationNumber}</b> · {t.date}: {fmtDate(s.date, s.language)}</div>
            <div style={{ marginTop: 2, color: C.muted }}>{t.employeeCode}: <b style={{ color: C.text, fontSize: 13 }}>{v.employeeCode}</b></div>
          </div>
          <div style={{ width: 92, height: 110, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: C.muted, fontSize: 10 }}>
            {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : t.photo}
          </div>
        </div>

        <Grid title={t.job} rows={[
          [t.employeeCode, v.employeeCode], [t.joiningDate, fmtDate(v.joiningDate, s.language)],
          [t.company, s.names.company], [t.department, s.names.department],
          [t.designation, s.names.designation], [t.shift, s.names.shift],
          [t.weeklyOff, s.names.weeklyOff], [t.payMode, v.payMode],
        ]} />
        <Grid title={t.personal} rows={[
          [t.name, [v.title, v.candidateName].filter(Boolean).join(' ')], [t.fatherName, v.fatherName],
          [t.dob, fmtDate(v.dob, s.language)], [t.gender, v.gender],
          [t.marital, v.maritalStatus], [t.blood, v.bloodGroup],
          [t.qualification, v.qualification],
        ]} />
        <Grid title={t.contact} rows={[
          [t.mobile, v.candidatePhone], [t.altMobile, v.alternateMobile],
          [t.email, v.candidateEmail],
          [t.present, v.presentAddress],
          [t.permanent, v.permanentAddress],
        ]} />
        <Grid title={t.ids} rows={[
          [t.aadhaar, v.aadharNo], [t.pan, v.panNo],
          [t.voter, v.voterIdNo], [t.dl, v.drivingLicenseNo],
          [t.ration, v.rashanCardNo],
        ]} />
        <Grid title={t.bank} rows={[[t.bankName, v.bankName], [t.account, v.bankAccountNo], [t.ifsc, v.ifscCode]]} />
        <Grid title={t.statutory} rows={[
          [t.pf, yn(v.pfApplicable)], [t.uan, v.pfApplicable ? v.uanNumber : '—'],
          [t.pfId, v.pfApplicable ? v.pfNumber : '—'], [t.esic, yn(v.esicApplicable)],
          [t.esicNo, v.esicApplicable ? v.esicNumber : '—'],
        ]} />
        <Grid title={t.salary} rows={[[t.basic, rupees(s.salary.base)], [t.allowance, rupees(s.salary.allowance)], [t.gross, rupees(s.salary.gross)]]} />
        <Grid title={t.emergency} rows={[[t.name, v.emergencyName], [t.relation, v.emergencyRelation], [t.mobile, v.emergencyPhone]]} />

        <div style={{ marginTop: 12 }}>
          <div style={{ background: C.head, color: C.accent, fontWeight: 700, padding: '4px 8px', border: `1px solid ${C.line}`, borderBottom: 'none' }}>{t.nominee}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.line}` }}>
            <thead>
              <tr style={{ background: '#fafafa', color: C.muted }}>
                {['#', t.name, t.relation, t.dob, t.share].map((h) => <td key={h} style={{ ...cell, fontWeight: 600 }}>{h}</td>)}
              </tr>
            </thead>
            <tbody>
              {(v.nominees?.length ? v.nominees : [{}]).map((n, i) => (
                <tr key={i}>
                  <td style={cell}>{n.name ? i + 1 : '—'}</td>
                  <td style={cell}>{n.name || '—'}</td>
                  <td style={cell}>{n.relation || '—'}</td>
                  <td style={cell}>{n.dob ? fmtDate(n.dob, s.language) : '—'}</td>
                  <td style={cell}>{n.name ? `${n.share}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Grid title={t.previous} rows={[
          [t.prevCompany, s.previous.company], [t.prevPosition, s.previous.position],
          [t.experience, s.previous.experience], [t.lastSalary, s.previous.lastSalary],
          [t.reason, s.previous.reasonForLeaving],
        ]} />

        <div style={{ marginTop: 14, border: `1px solid ${C.line}`, padding: '8px 12px' }}>
          <div style={{ fontWeight: 700 }}>{t.declaration}</div>
          <p style={{ marginTop: 4, textAlign: 'justify' }}>{t.declText}</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 46 }}>
          {[t.empSign, t.hrSign, t.hodSign].map((label) => (
            <div key={label} style={{ flex: 1, borderTop: `1px solid ${C.text}`, paddingTop: 4, textAlign: 'center' }}>{label}</div>
          ))}
        </div>

        {s.company.footerText && (
          <div style={{ marginTop: 18, paddingTop: 6, borderTop: `1px solid ${C.line}`, fontSize: 10, color: C.muted, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {s.company.footerText}
          </div>
        )}
      </div>
    </div>
  );
});

JoiningFormDocument.displayName = 'JoiningFormDocument';
export default JoiningFormDocument;

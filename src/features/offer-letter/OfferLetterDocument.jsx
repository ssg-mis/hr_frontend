import React, { forwardRef } from 'react';

// Fixed captions only (per language). Every company/candidate value and every sentence
// comes from the snapshot: offer data + Master Data → Letters & Documents templates.
const T = {
  en: { to: 'To,', date: 'Date :-', subject: 'Subject -', dear: 'Dear –', salary: 'SALARY DETAIL –', head: 'Earning Head', amount: 'Amount', basic: 'Basic', total: 'TOTAL SALARY', terms: 'Terms and Conditions:-', pin: 'Pin No -' },
  hi: { to: 'प्रति,', date: 'दिनांक :-', subject: 'विषय -', dear: 'प्रिय –', salary: 'वेतन विवरण –', head: 'आय मद', amount: 'राशि', basic: 'मूल वेतन', total: 'कुल वेतन', terms: 'नियम एवं शर्तें:-', pin: 'पिन नं. -' },
};

// No letter-spacing anywhere: html2canvas draws per-glyph then, breaking Hindi conjuncts.
const FONT = "'Times New Roman', 'Nirmala UI', 'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mangal', serif";
const C = { text: '#111827', line: '#374151', muted: '#4b5563' };
const amt = (n) => Number(n || 0).toFixed(2);

/** A4-width (794px) offer letter in the company format, rendered purely from a snapshot. */
const OfferLetterDocument = forwardRef(({ snapshot: s, images = {} }, ref) => {
  const t = T[s.language] || T.en;
  const logo = images.logoUrl ?? s.company.logoUrl;
  const letterhead = images.letterheadUrl ?? s.company.letterheadUrl;
  const signature = images.signatureUrl ?? s.signatory.signatureUrl;
  const footerImage = images.footerImageUrl ?? s.company.footerImageUrl;
  const c = s.candidate;
  const cell = { padding: '4px 8px', border: `1px solid ${C.line}` };
  const P = { margin: 0 };

  return (
    <div ref={ref} style={{ width: 794, background: '#fff', color: C.text, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.45, boxSizing: 'border-box' }}>
      {/* Letterhead (Master Data) */}
      {letterhead ? (
        <img src={letterhead} alt="" style={{ width: '100%', display: 'block' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '24px 56px 12px', borderBottom: `2px solid ${C.text}` }}>
          {logo && <img src={logo} alt="" style={{ height: 60, maxWidth: 150, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontSize: 21, fontWeight: 700 }}>{s.company.name}</div>
            {s.company.address && <div style={{ color: C.muted, fontSize: 12, whiteSpace: 'pre-line' }}>{s.company.address}</div>}
            {s.company.contactLine && <div style={{ color: C.muted, fontSize: 12 }}>{s.company.contactLine}</div>}
          </div>
        </div>
      )}

      <div style={{ padding: '18px 64px 34px' }}>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, textDecoration: 'underline', margin: '4px 0 14px' }}>{s.texts.title}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={P}>{t.to}</p>
            <p style={{ ...P, fontWeight: 700 }}>{[c.title, c.name].filter(Boolean).join(' ')}</p>
            {c.fatherName && <p style={P}>{c.relation}- {c.fatherName}</p>}
            {c.addressLines.map((l, i) => <p key={i} style={P}>{i === 0 ? `At/- ${l}` : l}</p>)}
            {c.pin && <p style={P}>{t.pin} {c.pin}</p>}
          </div>
          <div style={{ whiteSpace: 'nowrap' }}>{t.date} {s.dateText}</div>
        </div>

        <p style={{ ...P, marginTop: 10 }}><b>{t.subject}</b> {s.texts.subject}</p>
        <p style={{ ...P, marginTop: 8 }}>{t.dear} {[c.title, c.name].filter(Boolean).join(' ')}</p>
        <p style={{ ...P, marginTop: 8, textAlign: 'justify', textIndent: 40 }}>{s.texts.intro}</p>

        <p style={{ ...P, marginTop: 12, fontWeight: 700 }}>{t.salary}</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 6 }}>
          <tbody>
            <tr><td style={{ ...cell, fontWeight: 700 }}>{t.head}</td><td style={{ ...cell, fontWeight: 700, textAlign: 'right', width: 120 }}>{t.amount}</td></tr>
            <tr><td style={cell}>{t.basic}</td><td style={{ ...cell, textAlign: 'right' }}>{amt(s.salary.base)}</td></tr>
            <tr><td style={cell}>{s.texts.allowanceLabel}</td><td style={{ ...cell, textAlign: 'right' }}>{amt(s.salary.allowance)}</td></tr>
            {s.salary.showPf && <tr><td style={cell}>{s.texts.pfLabel}</td><td style={{ ...cell, textAlign: 'right' }}>{amt(s.salary.pf)}</td></tr>}
            <tr><td style={{ ...cell, fontWeight: 700 }}>{t.total}</td><td style={{ ...cell, textAlign: 'right', fontWeight: 700 }}>{amt(s.salary.total)}</td></tr>
          </tbody>
        </table>

        <p style={{ ...P, marginTop: 14, fontWeight: 700 }}>{t.terms}</p>
        {s.texts.joinLine && <p style={{ ...P, marginTop: 4 }}>{s.texts.joinLine}</p>}
        <ul style={{ margin: '4px 0 0', paddingLeft: 24, listStyle: 'disc' }}>
          {s.terms.map((term, i) => <li key={i} style={{ marginBottom: 3, textAlign: 'justify' }}>{term}</li>)}
        </ul>

        <div style={{ marginTop: 16 }}>
          {s.texts.closing.map((l, i) => <p key={i} style={P}>{l}</p>)}
          <p style={{ ...P, fontWeight: 700 }}>{s.company.name}</p>
          <div style={{ height: 62, display: 'flex', alignItems: 'flex-end' }}>
            {signature && <img src={signature} alt="" style={{ maxHeight: 56, maxWidth: 190, objectFit: 'contain' }} />}
          </div>
          {s.signatory.name && <p style={{ ...P, fontWeight: 700 }}>{s.signatory.name}</p>}
          <p style={P}>{s.signatory.designation}</p>
        </div>

        {s.texts.acceptance.length > 0 && (
          <ul style={{ margin: '18px 0 0', paddingLeft: 24, listStyle: 'disc' }}>
            {s.texts.acceptance.map((l, i) => (
              <li key={i} style={{ marginBottom: 8 }}>{l}{i === s.texts.acceptance.length - 1 ? ' ____________________________' : ''}</li>
            ))}
          </ul>
        )}

        {s.company.footerText && (
          <div style={{ marginTop: 20, paddingTop: 6, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.muted, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {s.company.footerText}
          </div>
        )}
      </div>
      {/* Footer image (Master Data letterhead footer) */}
      {footerImage && <img src={footerImage} alt="" style={{ width: '100%', display: 'block' }} />}
    </div>
  );
});

OfferLetterDocument.displayName = 'OfferLetterDocument';
export default OfferLetterDocument;

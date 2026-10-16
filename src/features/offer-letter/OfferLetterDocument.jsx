import React, { forwardRef } from 'react';
import { fmtLetterDate, fmtRupees } from './offerLetter.utils';

const T = {
  en: {
    ref: 'Ref', date: 'Date', to: 'To,', mobile: 'Mobile', email: 'Email',
    subject: (d) => `Subject: Offer of Employment – ${d}`,
    dear: (n) => `Dear ${n},`,
    intro: (o, company) => (
      <>
        We are pleased to offer you the position of <b>{o.designation}</b>
        {o.department ? <> in the <b>{o.department}</b> department</> : null}
        {company ? <> at <b>{company}</b></> : null}. Your date of joining will be <b>{fmtLetterDate(o.joiningDate, 'en')}</b>.
        The terms of this offer are given below.
      </>
    ),
    compensation: '1. Compensation (Monthly)',
    basic: 'Basic + DA', allowance: 'Allowance', gross: 'Gross Monthly Salary', annual: 'Annual CTC',
    inWords: (w) => `In words: Rupees ${w} Only per month`,
    terms: '2. Terms & Conditions',
    closing: 'Please sign the duplicate copy of this letter as a token of your acceptance and return it to us. We look forward to welcoming you to our team.',
    forCompany: (c) => `For ${c}`,
    signatory: 'Authorised Signatory',
    acceptance: 'ACCEPTANCE',
    acceptText: 'I have read and understood the above terms and conditions and accept this offer. I will join on ____________________.',
    candSign: 'Candidate Signature', name: 'Name',
  },
  hi: {
    ref: 'संदर्भ', date: 'दिनांक', to: 'प्रति,', mobile: 'मोबाइल', email: 'ईमेल',
    subject: (d) => `विषय: नियुक्ति प्रस्ताव – ${d}`,
    dear: (n) => `प्रिय ${n},`,
    intro: (o, company) => (
      <>
        हमें आपको {company ? <><b>{company}</b> में </> : null}
        {o.department ? <><b>{o.department}</b> विभाग के अंतर्गत </> : null}
        <b>{o.designation}</b> पद पर नियुक्ति का प्रस्ताव देते हुए प्रसन्नता हो रही है। आपकी कार्यभार ग्रहण करने की तिथि <b>{fmtLetterDate(o.joiningDate, 'hi')}</b> होगी।
        इस प्रस्ताव की शर्तें नीचे दी गई हैं।
      </>
    ),
    compensation: '1. वेतन (मासिक)',
    basic: 'मूल वेतन + डीए', allowance: 'भत्ता', gross: 'कुल मासिक वेतन', annual: 'वार्षिक सीटीसी',
    inWords: (w) => `शब्दों में: ${w} रुपये मात्र प्रति माह`,
    terms: '2. नियम एवं शर्तें',
    closing: 'कृपया अपनी स्वीकृति के प्रतीक स्वरूप इस पत्र की प्रति पर हस्ताक्षर कर हमें लौटाएँ। हम आपका अपनी टीम में स्वागत करने के लिए उत्सुक हैं।',
    forCompany: (c) => `${c} की ओर से`,
    signatory: 'अधिकृत हस्ताक्षरकर्ता',
    acceptance: 'स्वीकृति',
    acceptText: 'मैंने उपरोक्त नियम एवं शर्तें पढ़ एवं समझ ली हैं तथा यह प्रस्ताव स्वीकार करता/करती हूँ। मैं दिनांक ____________________ को कार्यभार ग्रहण करूँगा/करूँगी।',
    candSign: 'उम्मीदवार के हस्ताक्षर', name: 'नाम',
  },
};

// No letter-spacing anywhere: html2canvas draws per-glyph then, breaking Hindi conjuncts.
const FONT = "'Segoe UI', 'Nirmala UI', 'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Mangal', Arial, sans-serif";
const C = { text: '#1f2937', muted: '#4b5563', line: '#d1d5db', accent: '#1e3a8a' };

/**
 * A4-width (794px) offer letter rendered purely from a snapshot.
 * `images` may carry data-URL versions of logo/letterhead/signature for PDF rendering.
 */
const OfferLetterDocument = forwardRef(({ snapshot: s, images = {} }, ref) => {
  const t = T[s.language] || T.en;
  const logo = images.logoUrl ?? s.company.logoUrl;
  const letterhead = images.letterheadUrl ?? s.company.letterheadUrl;
  const signature = images.signatureUrl ?? s.signatory.signatureUrl;
  const td = { padding: '7px 12px', borderBottom: `1px solid ${C.line}` };

  return (
    <div ref={ref} style={{ width: 794, background: '#fff', color: C.text, fontFamily: FONT, fontSize: 13, lineHeight: 1.55, boxSizing: 'border-box' }}>
      {/* Letterhead */}
      {letterhead ? (
        <img src={letterhead} alt="" style={{ width: '100%', display: 'block' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '28px 56px 16px', borderBottom: `3px solid ${C.accent}` }}>
          {logo && <img src={logo} alt="" style={{ height: 64, maxWidth: 160, objectFit: 'contain' }} />}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{s.company.name}</div>
            {s.company.address && <div style={{ color: C.muted, fontSize: 12, whiteSpace: 'pre-line' }}>{s.company.address}</div>}
            {s.company.contactLine && <div style={{ color: C.muted, fontSize: 12 }}>{s.company.contactLine}</div>}
          </div>
        </div>
      )}

      <div style={{ padding: '22px 56px 36px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
          <span><b>{t.ref}:</b> {s.refNo}</span>
          <span><b>{t.date}:</b> {fmtLetterDate(s.date, s.language)}</span>
        </div>

        <div style={{ marginTop: 18 }}>
          <div>{t.to}</div>
          <div style={{ fontWeight: 700 }}>{s.candidate.name}</div>
          {s.candidate.address && <div style={{ whiteSpace: 'pre-line', color: C.muted }}>{s.candidate.address}</div>}
          <div style={{ color: C.muted }}>
            {s.candidate.phone && <>{t.mobile}: {s.candidate.phone}</>}
            {s.candidate.phone && s.candidate.email && ' · '}
            {s.candidate.email && <>{t.email}: {s.candidate.email}</>}
          </div>
        </div>

        <div style={{ marginTop: 16, fontWeight: 700, textDecoration: 'underline' }}>{t.subject(s.offer.designation)}</div>

        <p style={{ marginTop: 14 }}>{t.dear(s.candidate.name)}</p>
        <p style={{ marginTop: 6, textAlign: 'justify' }}>{t.intro(s.offer, s.company.name)}</p>

        <div style={{ marginTop: 16, fontWeight: 700, color: C.accent }}>{t.compensation}</div>
        <table style={{ marginTop: 8, borderCollapse: 'collapse', width: 420, border: `1px solid ${C.line}` }}>
          <tbody>
            <tr><td style={td}>{t.basic}</td><td style={{ ...td, textAlign: 'right' }}>{fmtRupees(s.offer.base)}</td></tr>
            <tr><td style={td}>{t.allowance}</td><td style={{ ...td, textAlign: 'right' }}>{fmtRupees(s.offer.allowance)}</td></tr>
            <tr style={{ background: '#eff6ff' }}><td style={{ ...td, fontWeight: 700 }}>{t.gross}</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{fmtRupees(s.offer.gross)}</td></tr>
            <tr><td style={{ ...td, borderBottom: 'none' }}>{t.annual}</td><td style={{ ...td, textAlign: 'right', borderBottom: 'none' }}>{fmtRupees(s.offer.annual)}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 6, fontStyle: 'italic', color: C.muted }}>{t.inWords(s.offer.grossWords)}</div>

        {s.terms.length > 0 && (
          <>
            <div style={{ marginTop: 18, fontWeight: 700, color: C.accent }}>{t.terms}</div>
            <ol style={{ marginTop: 6, paddingLeft: 22, listStyle: 'decimal' }}>
              {s.terms.map((term, i) => <li key={i} style={{ marginBottom: 5, textAlign: 'justify' }}>{term}</li>)}
            </ol>
          </>
        )}

        <p style={{ marginTop: 14, textAlign: 'justify' }}>{t.closing}</p>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontWeight: 700 }}>{t.forCompany(s.company.name)}</div>
          <div style={{ height: 64, display: 'flex', alignItems: 'flex-end' }}>
            {signature && <img src={signature} alt="" style={{ maxHeight: 58, maxWidth: 200, objectFit: 'contain' }} />}
          </div>
          <div style={{ borderTop: `1px solid ${C.text}`, width: 220, paddingTop: 4 }}>
            {s.signatory.name && <div style={{ fontWeight: 700 }}>{s.signatory.name}</div>}
            <div style={{ color: C.muted }}>{s.signatory.designation || t.signatory}</div>
          </div>
        </div>

        <div style={{ marginTop: 26, border: `1px dashed ${C.muted}`, borderRadius: 6, padding: '14px 18px' }}>
          <div style={{ fontWeight: 700 }}>{t.acceptance}</div>
          <p style={{ marginTop: 6 }}>{t.acceptText}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, gap: 24 }}>
            <span>{t.candSign}: ____________________</span>
            <span>{t.date}: ______________</span>
          </div>
          <div style={{ marginTop: 10 }}>{t.name}: {s.candidate.name}</div>
        </div>

        {s.company.footerText && (
          <div style={{ marginTop: 24, paddingTop: 8, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.muted, textAlign: 'center', whiteSpace: 'pre-line' }}>
            {s.company.footerText}
          </div>
        )}
      </div>
    </div>
  );
});

OfferLetterDocument.displayName = 'OfferLetterDocument';
export default OfferLetterDocument;

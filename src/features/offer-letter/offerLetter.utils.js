// Offer letter helpers: amount in words (EN/HI), dates, placeholders and the stored snapshot.

const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const HI_0_99 = [
  'शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ',
  'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस',
  'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस',
  'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस',
  'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास',
  'पचास', 'इक्यावन', 'बावन', 'तिरेपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ',
  'साठ', 'इकसठ', 'बासठ', 'तिरेसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर',
  'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उन्यासी',
  'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी',
  'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पंचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे',
];

const en0to99 = (n) => (n < 20 ? EN_ONES[n] : `${EN_TENS[Math.floor(n / 10)]}${n % 10 ? ` ${EN_ONES[n % 10]}` : ''}`);

// Indian system: crore, lakh, thousand, hundred.
const indianParts = (n) => ({
  crore: Math.floor(n / 1e7),
  lakh: Math.floor((n % 1e7) / 1e5),
  thousand: Math.floor((n % 1e5) / 1e3),
  hundred: Math.floor((n % 1e3) / 100),
  rest: n % 100,
});

export const amountInWords = (amount, lang = 'en') => {
  const n = Math.round(Number(amount) || 0);
  if (n === 0) return lang === 'hi' ? 'शून्य' : 'Zero';
  const p = indianParts(n);
  const words = [];
  if (lang === 'hi') {
    const w = (x) => HI_0_99[x];
    if (p.crore) words.push(`${p.crore > 99 ? amountInWords(p.crore, 'hi') : w(p.crore)} करोड़`);
    if (p.lakh) words.push(`${w(p.lakh)} लाख`);
    if (p.thousand) words.push(`${w(p.thousand)} हज़ार`);
    if (p.hundred) words.push(`${w(p.hundred)} सौ`);
    if (p.rest) words.push(w(p.rest));
  } else {
    if (p.crore) words.push(`${p.crore > 99 ? amountInWords(p.crore, 'en') : en0to99(p.crore)} Crore`);
    if (p.lakh) words.push(`${en0to99(p.lakh)} Lakh`);
    if (p.thousand) words.push(`${en0to99(p.thousand)} Thousand`);
    if (p.hundred) words.push(`${EN_ONES[p.hundred]} Hundred`);
    if (p.rest) words.push(en0to99(p.rest));
  }
  return words.join(' ');
};

export const fmtLetterDate = (d, lang = 'en') => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

export const fmtRupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fillPlaceholders = (text, values) =>
  String(text || '').replace(/\{(\w+)\}/g, (m, key) => (values[key] !== undefined && values[key] !== null ? String(values[key]) : m));

// dd/mm/yyyy (letter date) and dd-mm-yyyy (joining date) like the company format.
const fmtSlash = (d) => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`; };
const fmtDash = (d) => fmtSlash(d).replace(/\//g, '-');
const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);

// Candidate fields typed in the Letter popup (father's name, address lines, pin) — pre-filled from the application.
export const defaultLetterDetails = (a) => ({
  title: 'Mr.',
  relation: 'S/O',
  fatherName: a?.fatherName || '',
  address: a?.presentAddress || '',
  pin: (String(a?.presentAddress || '').match(/\b\d{6}\b/) || [''])[0],
});

// Everything printed on the letter, frozen at generation time (stored with the PDF).
// Candidate/offer values come from the application, texts from Master Data templates — nothing hard-coded.
export const buildSnapshot = ({ application: a, settings: s, nextRefNo }, lang, details = defaultLetterDetails(a)) => {
  const L = lang === 'hi' ? 'Hi' : 'En';
  const t = (key) => s[`${key}${L}`] || '';
  const today = new Date();
  const validity = new Date(today);
  validity.setDate(validity.getDate() + (Number(s.validityDays) || 0));

  const base = Number(a.offeredBaseSalary) || 0;
  const allowance = Number(a.offeredAllowanceSalary) || 0;
  const pfPercent = Number(s.pfPercent ?? 12) || 0;
  const pfCap = Number(s.pfCap) || 0;
  const showPf = s.showPf !== false && pfPercent > 0;
  const pf = showPf ? Math.round(((pfCap ? Math.min(base, pfCap) : base) * pfPercent) / 100) : 0;
  const total = base + allowance + pf;

  const company = {
    name: s.companyName || a.branchName || '',
    address: s.companyAddress || a.branchAddress || '',
    contactLine: s.contactLine || '',
    logoUrl: s.logoUrl || '',
    letterheadUrl: s.letterheadUrl || '',
    footerImageUrl: s.footerImageUrl || '',
    footerText: s.footerText || '',
  };
  const ph = {
    name: a.candidateName || '',
    designation: a.offeredDesignation || a.applyingForPost || '',
    department: a.departmentName || '',
    company: company.name,
    company_address: company.address,
    joining_date: a.offeredJoiningDate ? fmtDash(a.offeredJoiningDate) : '',
    validity_date: fmtDash(validity),
    probation: s.probationMonths ?? '',
    notice: s.noticeDays ?? '',
    pf_percent: pfPercent,
  };
  const fill = (x) => fillPlaceholders(x, ph);

  return {
    language: lang,
    refNo: nextRefNo,
    date: today.toISOString(),
    dateText: fmtSlash(today),
    company,
    signatory: { name: s.signatoryName || '', designation: s.signatoryDesignation || '', signatureUrl: s.signatureUrl || '' },
    candidate: {
      title: details.title || '',
      name: a.candidateName || '',
      relation: details.relation || '',
      fatherName: details.fatherName || '',
      addressLines: lines(details.address),
      pin: details.pin || '',
      applicationNumber: a.applicationNumber || '',
    },
    texts: {
      title: fill(t('offerTitle')),
      subject: fill(t('offerSubject')),
      intro: fill(t('offerIntro')),
      joinLine: fill(t('offerJoinLine')),
      allowanceLabel: fill(t('offerAllowanceLabel')),
      pfLabel: fill(t('offerPfLabel')),
      closing: lines(fill(t('offerClosing'))),
      acceptance: lines(fill(t('offerAcceptance'))),
    },
    salary: { base, allowance, pf, showPf, total },
    // kept for the popup's checks
    offer: { designation: ph.designation, department: ph.department, gross: base + allowance, joiningDate: a.offeredJoiningDate || null },
    terms: lines(lang === 'hi' ? s.termsHi : s.termsEn).map(fill),
  };
};

// Fetch an image as a data URL so html2canvas can draw it without CORS taint. Returns '' on failure.
export const toDataUrl = async (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve('');
      r.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

// Built-in defaults ⊕ saved "default" settings row (same rule as the server).
// Used by the sample "Preview Format" screens.
export const resolveDefaultSettings = ({ rows = [], defaults = {} }) => {
  const out = { ...defaults };
  const row = rows.find((r) => r.scopeKey === 'default');
  if (row) for (const [k, v] of Object.entries(row)) if (k in defaults && v !== null && v !== '') out[k] = v;
  return out;
};

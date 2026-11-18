// PF wage cap by payroll month. Months before Nov 2026 keep the old 15,000 cap (and their old behaviour);
// from 2026-11 the cap is 25,000. Keep in sync with hr_backend/src/modules/pf/pf.service.ts.
export const PF_CAP_OLD = 15000;
export const PF_CAP_NEW = 25000;
export const PF_CAP_NEW_FROM_MONTH = '2026-11';

/** PF wage cap for a "YYYY-MM" payroll month (missing/invalid = current month). */
export const pfCapForMonth = (month) => {
  const m = typeof month === 'string' && /^\d{4}-\d{2}/.test(month) ? month.slice(0, 7) : new Date().toISOString().slice(0, 7);
  return m >= PF_CAP_NEW_FROM_MONTH ? PF_CAP_NEW : PF_CAP_OLD;
};

/**
 * Whether PF is deducted for the month. `legacy` is the old decision (stored opt-in flag, or the
 * salary-based fallback). From Nov 2026 basic up to 25,000 is mandatory; above it the stored opt-in decides.
 */
export const isPfOptedInForMonth = (month, basicRate, legacy) => {
  if (pfCapForMonth(month) === PF_CAP_OLD) return legacy;
  return Number(basicRate) <= PF_CAP_NEW ? true : Boolean(legacy);
};

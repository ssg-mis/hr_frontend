import { api } from '../../lib/api';

const qs = (period, type = 'Monthly') => new URLSearchParams({ period, type }).toString();

export const adjustmentPayrollApi = {
  // { exists, rowCount, editedRows, sourceSyncedAt, lastAdjustedAt, originalUpdatedAt, outdated }
  status: (period, type) => api.get(`/adjustment-payrolls/status?${qs(period, type)}`).then((r) => r.data),

  // Full response: { success, data: rows[], meta }
  list: (period, type) => api.get(`/adjustment-payrolls?${qs(period, type)}`),

  // Replaces the whole set for the period. markSynced=true when copied/synced from payroll.
  save: (period, rows, { markSynced = false, type = 'Monthly', source } = {}) =>
    api.put('/adjustment-payrolls', { period, type, rows, markSynced, source }),

  // Insert employees missing from the adjustment (all of them the first time). Never updates existing rows.
  append: (period, rows, type = 'Monthly') => api.post('/adjustment-payrolls/append', { period, type, rows }).then((r) => r),

  remove: (period, type) => api.delete(`/adjustment-payrolls?${qs(period, type)}`),
};

export default adjustmentPayrollApi;

import { api } from '../../lib/api';

const qs = (period, type = 'Monthly') => new URLSearchParams({ period, type }).toString();

export const adjustmentPayrollApi = {
  // { exists, rowCount, editedRows, sourceSyncedAt, lastAdjustedAt, originalUpdatedAt, outdated }
  status: (period, type) => api.get(`/adjustment-payrolls/status?${qs(period, type)}`).then((r) => r.data),

  // Full response: { success, data: rows[], meta }
  list: (period, type) => api.get(`/adjustment-payrolls?${qs(period, type)}`),

  // Replaces the whole set for the period. markSynced=true when copied/synced from payroll.
  save: (period, rows, { markSynced = false, type = 'Monthly' } = {}) =>
    api.put('/adjustment-payrolls', { period, type, rows, markSynced }),

  remove: (period, type) => api.delete(`/adjustment-payrolls?${qs(period, type)}`),
};

export default adjustmentPayrollApi;

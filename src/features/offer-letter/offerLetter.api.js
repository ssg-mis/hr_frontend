import { api } from '../../lib/api';

export const offerLetterApi = {
  // { rows, branches, defaults }
  getSettings: () => api.get('/offer-letters/settings').then((r) => r.data),
  saveSettings: (payload) => api.put('/offer-letters/settings', payload).then((r) => r.data),
  removeBranchOverride: (branchId) => api.delete(`/offer-letters/settings/branch/${branchId}`),

  // { application, settings, nextRefNo }
  prepare: (applicationId) => api.get(`/offer-letters/prepare/${applicationId}`).then((r) => r.data),
  list: (applicationId) => api.get(`/offer-letters?applicationId=${applicationId}`).then((r) => r.data || []),
  create: (payload) => api.post('/offer-letters', payload).then((r) => r.data),
};

export default offerLetterApi;

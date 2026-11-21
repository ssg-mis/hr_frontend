import { api } from '../../lib/api';

export const resignationApi = {
  // Returns full response: { success, data: [...] }
  // Optional filters: stage (single or CSV), search
  list: ({ search = '', stage = '' } = {}) => {
    const qs = new URLSearchParams({ search });
    if (stage) qs.set('stage', stage);
    return api.get(`/resignations?${qs.toString()}`);
  },

  getById: (id) => api.get(`/resignations/${id}`).then((r) => r.data),

  create: (payload) => api.post('/resignations', payload).then((r) => r.data),

  // Generic patch — stage + any of the stage-specific fields.
  update: (id, patch) => api.patch(`/resignations/${id}`, patch).then((r) => r.data),

  // Accept directly without a retention meeting -> Notice Period.
  approve: (id, payload = {}) => api.post(`/resignations/${id}/approve`, payload).then((r) => r.data),

  scheduleMeeting: (id, meetingDate) =>
    api.post(`/resignations/${id}/meetings`, { meetingDate }).then((r) => r.data),

  listMeetings: (id) => api.get(`/resignations/${id}/meetings`).then((r) => r.data),

  recordMeetingOutcome: (id, meetingId, payload) =>
    api.patch(`/resignations/${id}/meetings/${meetingId}`, payload).then((r) => r.data),

  // No Dues Clearance — section: canteen | accounts | store | hr
  noDuesInbox: (section) => api.get(`/resignations/no-dues?section=${section}`).then((r) => r.data || []),
  // body: { status: 'NoDue' | 'Due' | 'Approved', amount?, remark? }
  noDuesRespond: (id, section, body) => api.post(`/resignations/${id}/no-dues/${section}`, body),
  // Live pull from the separate Store app: items this employee hasn't returned yet.
  // Resolves to { data: [...], unavailable? } — unavailable means Store couldn't be reached.
  storePending: (id) => api.get(`/resignations/${id}/store-pending`),
};

export default resignationApi;

import { api } from '../../lib/api';

export const jobApplicationApi = {
  // Returns full response: { success, data: [...], pagination }
  // Optional filters: vacancyNumber, source ('Internal'|'External'), stage (single or CSV)
  list: ({ page = 1, limit = 10, search = '', vacancyNumber = '', source = '', stage = '' } = {}) => {
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
    });
    if (vacancyNumber) qs.set('vacancyNumber', vacancyNumber);
    if (source) qs.set('source', source);
    if (stage) qs.set('stage', stage);
    return api.get(`/job-applications?${qs.toString()}`);
  },

  create: (payload) =>
    api.post('/job-applications', payload).then((r) => r.data),

  getByNumber: (applicationNumber) =>
    api.get(`/job-applications/${applicationNumber}`).then((r) => r.data),

  // --- Follow-up / pipeline (stage d) ---
  listFollowUps: (applicationNumber) =>
    api.get(`/job-applications/${applicationNumber}/follow-ups`).then((r) => r.data),

  addFollowUp: (applicationNumber, { notes, outcome, nextDate = null }) =>
    api
      .post(`/job-applications/${applicationNumber}/follow-ups`, { notes, outcome, nextDate })
      .then((r) => r.data),

  // Advance stage (e.g. schedule interview, reject, hold).
  updateStage: (applicationNumber, patch) =>
    api.patch(`/job-applications/${applicationNumber}/stage`, patch).then((r) => r.data),

  // --- Interview outcome history (append-only — every reschedule kept) ---
  listInterviewOutcomes: (applicationNumber) =>
    api.get(`/job-applications/${applicationNumber}/interview-outcomes`).then((r) => r.data),

  addInterviewOutcome: (applicationNumber, { interviewDate, interviewMode, result, remark = null }) =>
    api
      .post(`/job-applications/${applicationNumber}/interview-outcomes`, { interviewDate, interviewMode, result, remark })
      .then((r) => r.data),
};

export default jobApplicationApi;

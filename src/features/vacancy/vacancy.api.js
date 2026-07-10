import { api } from "../../lib/api";

// All calls hit /api/v1/vacancies (base URL lives in lib/api.js).
// The backend contract is camelCase throughout.
export const vacancyApi = {
  // Returns the full response: { success, message, data: [...], pagination }
  list: ({ page = 1, limit = 10, search = "", excludeRejected = false } = {}) => {
    const params = {
      page: String(page),
      limit: String(limit),
      search,
    };
    if (excludeRejected) {
      params.excludeRejected = "true";
    }
    const qs = new URLSearchParams(params);
    return api.get(`/vacancies?${qs.toString()}`);
  },

  // Single vacancy by its VAC code (used by the public apply page).
  getByNumber: (vacancyNumber) =>
    api.get(`/vacancies/${vacancyNumber}`).then((r) => r.data),

  create: (payload) => api.post("/vacancies", payload).then((r) => r.data),

  update: (vacancyNumber, payload) =>
    api.patch(`/vacancies/${vacancyNumber}`, payload).then((r) => r.data),

  remove: (vacancyNumber) => api.delete(`/vacancies/${vacancyNumber}`),

  // Approval workflow: approvalStatus is Pending | Approved | Rejected.
  // rejectionRemark is required when rejecting.
  setApproval: (vacancyNumber, { approvalStatus, rejectionRemark = null }) =>
    api
      .patch(`/vacancies/${vacancyNumber}/approval`, {
        approvalStatus,
        rejectionRemark,
      })
      .then((r) => r.data),
};

export default vacancyApi;

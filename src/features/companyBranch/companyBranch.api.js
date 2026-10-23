import { api } from "../../lib/api";

export const companyBranchApi = {
  // api.get returns the JSON body { success, data }, so the list is r.data.
  list: () => api.get("/company-branches").then((r) => (Array.isArray(r?.data) ? r.data : r?.data?.data || [])),
  getById: (id) => api.get(`/company-branches/${id}`).then((r) => r?.data?.data ?? r?.data),
  create: (payload) => api.post("/company-branches", payload).then((r) => r.data),
  update: (id, payload) => api.put(`/company-branches/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/company-branches/${id}`).then((r) => r.data),
};

export default companyBranchApi;

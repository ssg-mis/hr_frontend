import { api } from "../../lib/api";

export const designationApi = {
  // -> [{ id, name, createdAt }]
  list: () => api.get("/designations").then((r) => r.data),
  create: (payload) => api.post("/designations", payload).then((r) => r.data),
};

export default designationApi;

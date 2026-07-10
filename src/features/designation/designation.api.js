import { api } from "../../lib/api";

export const designationApi = {
  // -> [{ id, name, createdAt }]
  list: () => api.get("/designations").then((r) => r.data),
  create: (name) => api.post("/designations", { name }).then((r) => r.data),
};

export default designationApi;

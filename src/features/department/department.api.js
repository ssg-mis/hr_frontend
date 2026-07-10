import { api } from "../../lib/api";

export const departmentApi = {
  // -> [{ id, name, createdAt }]
  list: () => api.get("/departments").then((r) => r.data),
  create: (name) => api.post("/departments", { name }).then((r) => r.data),
};

export default departmentApi;

import { api } from '../../lib/api';

export const employeeApi = {
  list: ({ status = '' } = {}) => {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    return api.get(`/employees?${qs.toString()}`);
  },
};

export default employeeApi;

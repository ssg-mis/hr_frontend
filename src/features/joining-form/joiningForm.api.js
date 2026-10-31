import { api } from '../../lib/api';

export const joiningFormApi = {
  // { form, values, info, options, letterhead }
  get: (applicationId) => api.get(`/joining-forms/${applicationId}`).then((r) => r.data),

  // Save draft. validateForComplete=true -> rejects with { errors } when required fields are missing.
  save: (applicationId, values, validateForComplete = false) =>
    api.put(`/joining-forms/${applicationId}`, { values, validateForComplete }),

  // Apply the form to the employee (after the existing "Hired" step created it).
  complete: (applicationId, values) => api.post(`/joining-forms/${applicationId}/complete`, { values }),

  savePdf: (applicationId, pdfUrl, language) => api.post(`/joining-forms/${applicationId}/pdf`, { pdfUrl, language }),

  // Direct Joining Form (no application) — filled by management, completed by HR
  directList: () => api.get('/joining-forms/direct').then((r) => r.data),
  // applicationId 'new' -> blank form; returns { values, options, form }
  directGet: (applicationId = 'new') => api.get(`/joining-forms/direct/${applicationId}`).then((r) => r.data),
  directCreate: (values) => api.post('/joining-forms/direct', { values }),
  directUpdate: (applicationId, values) => api.put(`/joining-forms/direct/${applicationId}`, { values }),
};

export default joiningFormApi;

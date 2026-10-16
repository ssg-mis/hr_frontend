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
};

export default joiningFormApi;

import { api } from '../../lib/api';

export const DOC_TYPES = [
  'Aadhaar Card', 'PAN Card', 'Voter ID', 'Driving License', 'Passport Photo',
  'Bank Passbook / Cancelled Cheque', 'PF / UAN Card', 'ESIC Card',
  'Education Certificate', 'Experience Letter', 'Relieving Letter', 'Salary Slip',
  'Medical Certificate', 'Other',
];

export const employeeDocumentApi = {
  // Employee self-service
  listMine: () => api.get('/employee-documents/my').then((r) => r.data || []),
  addMine: (payload) => api.post('/employee-documents/my', payload).then((r) => r.data),
  removeMine: (id) => api.delete(`/employee-documents/my/${id}`),

  // HR / Admin
  listForEmployee: (employeeId) => api.get(`/employee-documents/employee/${employeeId}`).then((r) => r.data || []),
  addForEmployee: (employeeId, payload) => api.post(`/employee-documents/employee/${employeeId}`, payload).then((r) => r.data),
  review: (id, { status, remark = null }) => api.patch(`/employee-documents/${id}/review`, { status, remark }).then((r) => r.data),
  remove: (id) => api.delete(`/employee-documents/${id}`),
};

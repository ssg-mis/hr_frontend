import { api } from '../../lib/api';

// The number always comes from the system (application / joining form), never typed here.
export const whatsappApi = {
  sendOfferLetter: (applicationId) => api.post(`/whatsapp/applications/${applicationId}/offer-letter`),
  sendJoiningForm: (applicationId) => api.post(`/whatsapp/applications/${applicationId}/joining-form`),
};

export default whatsappApi;

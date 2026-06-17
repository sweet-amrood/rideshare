import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const driverService = {
  getSetupStatus: () => api.get(endpoints.users.driverSetupStatus).then((r) => r.data),

  completeSetup: (payload) => api.post(endpoints.users.driverSetup, payload).then((r) => r.data),

  resubmitDocuments: (documents) =>
    api.post(endpoints.users.driverDocumentsResubmit, { documents }).then((r) => r.data)
};

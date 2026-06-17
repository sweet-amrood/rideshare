import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

export const profileService = {
  getMyProfile: () => api.get(endpoints.users.profile).then((r) => r.data),

  updateProfile: (payload) => api.put(endpoints.users.profile, payload).then((r) => r.data),

  getAvatarPresets: () => api.get(endpoints.users.avatarPresets).then((r) => r.data),

  setAvatar: (payload) => api.patch(endpoints.users.avatar, payload).then((r) => r.data),

  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return api.post(endpoints.users.avatarUpload, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then((r) => r.data);
  },

  updateDriverStatus: (payload) =>
    api.patch(endpoints.users.driverStatus, payload).then((r) => r.data),

  getDriverStatus: () => api.get(endpoints.users.driverStatus).then((r) => r.data),

  updatePrivacy: (privacy) =>
    api.patch(endpoints.users.profilePrivacy, privacy).then((r) => r.data),

  verifyPhone: () => api.post(endpoints.users.verifyPhone).then((r) => r.data),

  getVerificationArchitecture: () =>
    api.get(endpoints.users.verificationArchitecture).then((r) => r.data),

  getPublicProfile: (userId) => api.get(endpoints.users.public(userId)).then((r) => r.data),

  getReviews: (userId) => api.get(endpoints.users.reviews(userId)).then((r) => r.data),

  createReview: (userId, body) => api.post(endpoints.users.reviews(userId), body).then((r) => r.data)
};

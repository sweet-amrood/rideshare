import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

const unwrap = (promise) =>
  promise.then((res) => res.data).catch((err) => {
    const data = err.response?.data || {};
    const error = new Error(data.message || err.message);
    error.status = err.response?.status;
    error.data = data;
    throw error;
  });

export const authService = {
  login: (email, password) =>
    unwrap(api.post(endpoints.auth.login, { email, password })),

  register: ({ name, email, password, phoneNumber, phone }) =>
    unwrap(
      api.post(endpoints.auth.register, {
        name,
        email,
        password,
        phoneNumber: phoneNumber || phone
      })
    ),

  verifyEmail: (email, code) =>
    unwrap(api.post(endpoints.auth.verifyEmail, { email, code })),

  resendVerification: (email) =>
    unwrap(api.post(endpoints.auth.resendVerification, { email })),

  forgotPassword: (email) =>
    unwrap(api.post(endpoints.auth.forgotPassword, { email })),

  resetPassword: (email, code, newPassword) =>
    unwrap(api.post(endpoints.auth.resetPassword, { email, code, newPassword })),

  googleLogin: (credential) =>
    unwrap(api.post(endpoints.auth.googleLogin, { credential })),

  uploadDocuments: (payload) => unwrap(api.post(endpoints.auth.uploadDocuments, payload))
};

export default authService;

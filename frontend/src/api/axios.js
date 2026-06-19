import axios from 'axios';
import toast from 'react-hot-toast';
import { env } from '@/config/env';
import { paths } from '@/app/router/paths';

const UPLOAD_PATHS = [
  '/documents/upload',
  '/documents/upload-batch',
  '/users/vehicle/upload-media'
];

const api = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const url = config.url || '';
    if (UPLOAD_PATHS.some((p) => url.includes(p))) {
      config.timeout = config.timeout || 180000;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong. Please try again.';

    const isAuthRoute = error.config?.url?.includes('/auth/');

    const status = error.response?.status;

    if (status === 401 && !isAuthRoute) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith(paths.login)) {
        toast.error('Session expired. Please sign in again.');
        window.location.href = paths.login;
      }
    } else if (status === 429) {
      const isPublicPage = /^\/app\/(login|register|verify-email|forgot-password|reset-password)/.test(
        window.location.pathname
      );
      if (!isPublicPage) {
        toast.error(message);
      }
    } else if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      /timeout/i.test(message) ||
      /network error/i.test(message)
    ) {
      const now = Date.now();
      if (!window.__rsTimeoutToastAt || now - window.__rsTimeoutToastAt > 4000) {
        window.__rsTimeoutToastAt = now;
        toast.error(
          'Request timed out. Large uploads can take a minute — try again with smaller images or fewer files at once.'
        );
      }
    } else if (!isAuthRoute && status !== 403) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  FIND: '/find',
  OFFER: '/offer',
  PROFILE: '/profile',
  CHAT: (rideId) => `/chat/${rideId}`,
  MAP: '/map'
};

export const AUTH_STORAGE_KEY = 'token';

import { paths } from '@/app/router/paths';

export const ROUTES = {
  HOME: paths.home,
  APP: paths.app,
  ABOUT: paths.about,
  CONTACT: paths.contact,
  LOGIN: paths.login,
  REGISTER: paths.register,
  VERIFY_EMAIL: paths.verifyEmail,
  FORGOT_PASSWORD: paths.forgotPassword,
  RESET_PASSWORD: paths.resetPassword,
  ONBOARDING: paths.onboarding,
  DASHBOARD: paths.dashboard,
  FIND: paths.find,
  OFFER: paths.offer,
  PROFILE: paths.profile,
  CARPOOLING: paths.carpooling,
  BOOKINGS: paths.bookings,
  CHAT: paths.chat,
  MAP: paths.map
};

export const AUTH_STORAGE_KEY = 'token';

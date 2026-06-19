/** App shell lives under /app; marketing pages at site root. */
export const APP_BASE = '/app';
export const MOBILE_BREAKPOINT_PX = 768;

export function appPath(segment = '') {
  if (!segment || segment === '/') return APP_BASE;
  const normalized = segment.startsWith('/') ? segment : `/${segment}`;
  return `${APP_BASE}${normalized}`;
}

export const paths = {
  home: '/',
  about: '/about',
  contact: '/contact',
  app: APP_BASE,
  login: appPath('/login'),
  register: appPath('/register'),
  verifyEmail: appPath('/verify-email'),
  forgotPassword: appPath('/forgot-password'),
  resetPassword: appPath('/reset-password'),
  completeProfile: appPath('/complete-profile'),
  onboarding: appPath('/onboarding'),
  driverSetup: appPath('/onboarding/driver-setup'),
  dashboard: appPath('/dashboard'),
  find: appPath('/find'),
  carpooling: appPath('/carpooling'),
  bookings: appPath('/bookings'),
  offer: appPath('/offer'),
  profile: appPath('/profile'),
  driverResubmit: appPath('/driver/resubmit-documents'),
  map: appPath('/map'),
  chat: (rideId) => appPath(`/chat/${rideId}`),
  rideRequestChat: (requestId) => appPath(`/ride-request/${requestId}/chat`),
  userProfile: (userId) => appPath(`/users/${userId}`)
};

export function isAppPath(pathname = '') {
  return pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`);
}

export function isMarketingPath(pathname = '') {
  return pathname === paths.home || pathname === paths.about || pathname === paths.contact;
}

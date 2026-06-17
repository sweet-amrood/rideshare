import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_LIBRARIES } from '@/features/maps/constants';

export const DEMO_TOKEN = 'demo-portfolio-token';
export const DEMO_EMAIL = 'demo@rideshare.app';
export const DEMO_PASSWORD = 'demo123';
const RUNTIME_DEMO_KEY = 'portfolio-demo-mode';

export const DEMO_USER = {
  _id: 'demo-portfolio-user',
  name: 'Alex Demo',
  email: DEMO_EMAIL,
  phoneNumber: '+923001234567',
  roles: ['RIDER', 'DRIVER'],
  profileCompleted: true,
  onboardingComplete: true,
  driverSetupComplete: true,
  commuterRole: 'RIDER',
  rating: 4.8,
  verification: { status: 'APPROVED' },
  profile: { avatarUrl: null },
  driverApplicant: null
};

export function isDemoActive() {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(RUNTIME_DEMO_KEY) === '1') return true;

  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  const relativeApi = !/^https?:\/\//i.test(apiBase);
  const explicitNoDemo = import.meta.env.VITE_DEMO_MODE === 'false';

  return (
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_APP_ENV === 'demo' ||
    (import.meta.env.PROD && !explicitNoDemo && relativeApi)
  );
}

export function enableRuntimeDemo() {
  localStorage.setItem(RUNTIME_DEMO_KEY, '1');
}

export function clearRuntimeDemo() {
  localStorage.removeItem(RUNTIME_DEMO_KEY);
}

export function isDemoCredentialLogin(email, password) {
  return (
    String(email || '').trim().toLowerCase() === DEMO_EMAIL &&
    String(password || '') === DEMO_PASSWORD
  );
}

const emptyList = { success: true, data: [] };
const emptyPage = { success: true, data: { rides: [], pagination: { page: 1, total: 0 } } };

function normalizePath(url = '') {
  const path = url.split('?')[0];
  if (path.startsWith('http')) {
    try {
      return new URL(path).pathname.replace(/^\/api\/v1/, '') || '/';
    } catch {
      return path;
    }
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function getDemoApiResponse(config) {
  const method = (config.method || 'get').toLowerCase();
  const path = normalizePath(config.url || '');

  if (method === 'post' && path.includes('/auth/login')) {
    return { success: true, data: { user: DEMO_USER, token: DEMO_TOKEN } };
  }

  if (method === 'post' && path.includes('/auth/google-login')) {
    return { success: true, data: { user: DEMO_USER, token: DEMO_TOKEN } };
  }

  if (method === 'get') {
    if (path === '/users/profile' || path.endsWith('/users/profile')) {
      return { success: true, data: { user: DEMO_USER } };
    }
    if (path.includes('/bookings/my-trips')) {
      return { success: true, data: { passengerTrips: [], driverTrips: [] } };
    }
    if (path.includes('/bookings/active-commitment')) {
      return { success: true, data: null };
    }
    if (path.includes('/bookings/history')) {
      return { success: true, data: { bookings: [], pagination: { page: 1, total: 0 } } };
    }
    if (path.includes('/bookings/incoming')) {
      return emptyList;
    }
    if (path.includes('/ride-requests/active') || path.includes('/ride-requests/current')) {
      return { success: true, data: null };
    }
    if (path.includes('/ride-requests/incoming')) {
      return emptyList;
    }
    if (path.includes('/rides/search')) {
      return emptyPage;
    }
    if (path.includes('/rides/my-offers')) {
      return emptyList;
    }
    if (path.includes('/users/avatars/presets')) {
      return { success: true, data: { presets: [] } };
    }
    if (path.includes('/users/driver/status')) {
      return { success: true, data: { isOnline: false, activeVehicleId: null } };
    }
    if (path.includes('/users/vehicle')) {
      return { success: true, data: { vehicles: [] } };
    }
    if (path.includes('/users/verification/architecture')) {
      return { success: true, data: {} };
    }
    if (path.includes('/users/driver-setup/status')) {
      return { success: true, data: { complete: true } };
    }
    if (path.includes('/communities')) {
      return emptyList;
    }
    if (path.includes('/maps/bootstrap')) {
      return { success: false, message: 'Use VITE_GOOGLE_MAPS_API_KEY in demo' };
    }
  }

  return { success: true, data: null, message: 'Demo mode — UI preview only' };
}

export function getDemoMapsConfig(googleMapsApiKey) {
  if (!googleMapsApiKey) return null;
  return {
    googleMapsApiKey,
    libraries: MAP_LIBRARIES,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM
  };
}

/**
 * Typed access to Vite environment variables (must be prefixed with VITE_)
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const isRelativeApi = !/^https?:\/\//i.test(apiBaseUrl);
const explicitNoDemo = import.meta.env.VITE_DEMO_MODE === 'false';

/** Frontend-only Netlify deploy: no absolute API URL configured at build time */
const autoPortfolioDemo =
  import.meta.env.PROD && !explicitNoDemo && isRelativeApi;

export const env = {
  apiBaseUrl,
  appName: import.meta.env.VITE_APP_NAME || 'Ride Share',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  demoMode:
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    import.meta.env.VITE_APP_ENV === 'demo' ||
    autoPortfolioDemo,
  /** Hash URLs (/#/dashboard) work on static hosts without Netlify redirect rules */
  useHashRouter:
    import.meta.env.VITE_HASH_ROUTER === 'true' ||
    (import.meta.env.PROD && isRelativeApi && import.meta.env.VITE_HASH_ROUTER !== 'false'),
  googleClientId:
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD
};

export default env;

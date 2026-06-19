/**
 * Typed access to Vite environment variables (must be prefixed with VITE_)
 */
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const env = {
  apiBaseUrl,
  appName: import.meta.env.VITE_APP_NAME || 'Ride Share',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  /** Set VITE_HASH_ROUTER=true only if your static host lacks SPA fallback rules */
  useHashRouter: import.meta.env.VITE_HASH_ROUTER === 'true',
  googleClientId:
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com',
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD
};

export default env;

/**
 * Typed access to Vite environment variables (must be prefixed with VITE_)
 */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'Ride Share',
  appEnv: import.meta.env.VITE_APP_ENV || 'development',
  googleClientId:
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com',
  socketUrl: import.meta.env.VITE_SOCKET_URL || '',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD
};

export default env;

const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';
const disabled = process.env.DISABLE_RATE_LIMIT === 'true';

const shouldSkip = (req) => {
  if (disabled) return true;
  const url = req.originalUrl || req.url || '';
  if (url.includes('/health')) return true;
  // Admin dashboard polls every 10s — do not burn the shared dev quota
  if (isDev && url.includes('/admin/realtime')) return true;
  return false;
};

const devMax = parseInt(process.env.RATE_LIMIT_MAX_DEV || '10000', 10);
const prodMax = parseInt(process.env.RATE_LIMIT_MAX || '400', 10);

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? devMax : prodMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: shouldSkip,
  message: {
    success: false,
    message: isDev
      ? 'Too many API requests. Set DISABLE_RATE_LIMIT=true in backend .env for local dev, or restart the backend to reset the counter.'
      : 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Authentication rate limiter (login / register only)
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 200 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => disabled,
  message: {
    success: false,
    message: 'Too many login or registration attempts. Please wait 10 minutes'
  }
});

module.exports = { generalLimiter, authLimiter };

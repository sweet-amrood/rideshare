const rateLimit = require('express-rate-limit');

/** Stricter limit for Google Maps proxy (cost control). */
const mapsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many map requests. Please wait a minute.'
  }
});

module.exports = { mapsLimiter };

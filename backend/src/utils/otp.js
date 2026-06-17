const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getOTPExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);

const isOTPExpired = (expiresAt) => !expiresAt || new Date() > expiresAt;

module.exports = { OTP_EXPIRY_MS, generateOTP, getOTPExpiry, isOTPExpired };

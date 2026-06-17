const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{10,15}$/;

export const validateEmail = (value) => {
  if (!value?.trim()) return 'Email is required';
  if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address';
  return '';
};

export const validatePassword = (value, { min = 6 } = {}) => {
  if (!value) return 'Password is required';
  if (value.length < min) return `Password must be at least ${min} characters`;
  return '';
};

export const validateConfirmPassword = (password, confirm) => {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return '';
};

export const validateName = (value) => {
  if (!value?.trim()) return 'Full name is required';
  if (value.trim().length < 2) return 'Name must be at least 2 characters';
  return '';
};

export const validatePhone = (value) => {
  if (!value?.trim()) return 'Phone number is required';
  const normalized = value.replace(/[\s-]/g, '');
  if (!PHONE_RE.test(normalized)) return 'Enter a valid phone number (10–15 digits)';
  return '';
};

export const validateUsername = (value) => {
  const v = value?.trim();
  if (!v) return '';
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(v)) {
    return 'Username must be 3–20 characters (letters, numbers, underscore only)';
  }
  return '';
};

export const validateOtp = (value) => {
  if (!value?.trim()) return 'Verification code is required';
  if (!/^\d{6}$/.test(value.trim())) return 'Enter the 6-digit code';
  return '';
};

export const runValidators = (fields) => {
  const errors = {};
  Object.entries(fields).forEach(([key, err]) => {
    if (err) errors[key] = err;
  });
  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;

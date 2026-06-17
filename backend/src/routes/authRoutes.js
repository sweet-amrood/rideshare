const express = require('express');
const {
  register,
  verifyEmail,
  resendEmailVerification,
  login,
  forgotPassword,
  resetPassword,
  googleLogin,
  uploadKYCDocuments
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/verify-email', authLimiter, verifyEmail);
router.post('/resend-verification', authLimiter, resendEmailVerification);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/google-login', authLimiter, googleLogin);

router.post('/upload-documents', protect, uploadKYCDocuments);

module.exports = router;

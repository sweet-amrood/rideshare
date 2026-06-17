const Admin = require('../../models/Admin');
const User = require('../../models/User');
const { verifyAdminToken } = require('../utils/adminToken');

/**
 * Admin-only JWT — rejects normal user tokens (no Admin document).
 */
const adminProtect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Admin authentication required' });
  }

  try {
    const decoded = verifyAdminToken(token);
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Invalid admin token' });
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin account not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired admin session' });
  }
};

/** Block if a regular user token is mistakenly used on admin login-only paths */
const rejectUserToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_123!@#'
    );
    const user = await User.findById(decoded.id);
    if (user && !req.admin) {
      return res.status(403).json({
        success: false,
        message: 'User accounts cannot access the admin API'
      });
    }
  } catch {
    /* not a user token */
  }
  next();
};

module.exports = { adminProtect, rejectUserToken };

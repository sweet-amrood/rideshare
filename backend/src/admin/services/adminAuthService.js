const Admin = require('../../models/Admin');
const { signAdminToken } = require('../utils/adminToken');
const login = async (email, password) => {
  const normalized = (email || '').toLowerCase().trim();
  const admin = await Admin.findOne({ email: normalized }).select('+password');
  if (!admin || !(await admin.matchPassword(password))) {
    const err = new Error('Invalid admin credentials');
    err.statusCode = 401;
    throw err;
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  const token = signAdminToken(admin._id);
  return {
    token,
    admin: {
      _id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      lastLoginAt: admin.lastLoginAt
    }
  };
};

const getProfile = async (adminId) => {
  const admin = await Admin.findById(adminId).select('-password');
  if (!admin) {
    const err = new Error('Admin not found');
    err.statusCode = 404;
    throw err;
  }
  return admin;
};

module.exports = { login, getProfile };

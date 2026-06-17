const jwt = require('jsonwebtoken');

const getAdminSecret = () =>
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'admin_super_secret_change_in_prod';

const signAdminToken = (adminId) =>
  jwt.sign({ id: adminId, role: 'ADMIN' }, getAdminSecret(), { expiresIn: '7d' });

const verifyAdminToken = (token) => jwt.verify(token, getAdminSecret());

module.exports = { signAdminToken, verifyAdminToken, getAdminSecret };

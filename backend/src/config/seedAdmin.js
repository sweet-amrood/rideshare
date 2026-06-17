const Admin = require('../models/Admin');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Ensures exactly one platform admin exists. No public registration.
 */
const ensureSingleAdmin = async () => {
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: 'Ride Share Admin'
    });
    console.log(`[ADMIN] Singleton admin seeded: ${ADMIN_EMAIL}`);
    return;
  }

  const admin = await Admin.findOne().select('+password');
  if (count > 1) {
    await Admin.deleteMany({ _id: { $ne: admin._id } });
    console.warn('[ADMIN] Removed duplicate admin accounts — only one allowed');
  }

  if (admin) {
    let changed = false;
    if (admin.email !== ADMIN_EMAIL) {
      admin.email = ADMIN_EMAIL;
      changed = true;
    }
    const passwordOk = await admin.matchPassword(ADMIN_PASSWORD);
    if (!passwordOk) {
      admin.password = ADMIN_PASSWORD;
      changed = true;
      console.log('[ADMIN] Password reset to configured ADMIN_PASSWORD');
    }
    if (changed) await admin.save();
  }
};

module.exports = { ensureSingleAdmin, ADMIN_EMAIL, ADMIN_PASSWORD };

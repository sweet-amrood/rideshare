const Vehicle = require('../models/Vehicle');
const {
  hasDriverDocuments,
  markDriverSetupComplete
} = require('./driverSetupHelpers');

/**
 * When verification + vehicle are approved, clear driver for hub access.
 */
const syncDriverSetupAfterApproval = async (user) => {
  if (!user) return false;
  const isDriver =
    user.roles?.includes('DRIVER') || user.driverApplicant === true;
  if (!isDriver) return false;
  if (user.verification?.status !== 'APPROVED') return false;
  if (!hasDriverDocuments(user.verification)) return false;

  const approvedVehicle = await Vehicle.findOne({
    ownerId: user._id,
    verificationStatus: 'APPROVED'
  }).lean();

  if (!approvedVehicle) return false;

  if (user.driverSetupComplete === true) {
    if (!user.roles.includes('DRIVER')) {
      user.roles.push('DRIVER');
      await user.save();
    }
    return true;
  }

  markDriverSetupComplete(user);
  if (!user.roles.includes('DRIVER')) user.roles.push('DRIVER');
  await user.save();
  return true;
};

module.exports = { syncDriverSetupAfterApproval };

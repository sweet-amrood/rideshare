const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { sanitizeDriverAvailability } = require('../utils/userGeo');

const resolveActiveVehicle = async (user, activeVehicleId) => {
  if (!activeVehicleId) return null;
  const vehicle = await Vehicle.findOne({
    _id: activeVehicleId,
    ownerId: user._id,
    verificationStatus: 'APPROVED'
  }).lean();
  if (!vehicle) {
    const err = new Error('Selected vehicle is not approved or does not belong to you');
    err.statusCode = 400;
    throw err;
  }
  return vehicle;
};

const loadApprovedVehicles = (userId) =>
  Vehicle.find({
    ownerId: userId,
    verificationStatus: 'APPROVED'
  })
    .select('vehicleType licensePlate make model company')
    .lean();

/** Auto-select when the driver only has one approved vehicle. */
const ensureSingleActiveVehicle = async (user, approved) => {
  if (!user.roles?.includes('DRIVER') || approved.length !== 1) return false;
  const only = approved[0];
  user.driverAvailability = user.driverAvailability || {};
  const currentId = user.driverAvailability.activeVehicleId?.toString();
  if (currentId === String(only._id) && user.driverAvailability.activeVehicleType) {
    return false;
  }
  user.driverAvailability.activeVehicleId = only._id;
  user.driverAvailability.activeVehicleType = only.vehicleType;
  user.driverAvailability.updatedAt = new Date();
  return true;
};

const requireActiveVehicleForOnline = async (user) => {
  if (user.driverAvailability?.activeVehicleType) return;

  const approved = await loadApprovedVehicles(user._id);
  if (approved.length === 1) {
    user.driverAvailability = user.driverAvailability || {};
    user.driverAvailability.activeVehicleId = approved[0]._id;
    user.driverAvailability.activeVehicleType = approved[0].vehicleType;
    user.driverAvailability.updatedAt = new Date();
    return;
  }
  if (approved.length > 1) {
    const err = new Error('Choose which vehicle you are driving before going online');
    err.statusCode = 400;
    throw err;
  }
  const err = new Error('Register and get a vehicle approved before going online');
  err.statusCode = 400;
  throw err;
};

const formatDriverStatus = (user) => ({
  isOnline: user.driverAvailability?.isOnline ?? false,
  activeVehicleId: user.driverAvailability?.activeVehicleId ?? null,
  activeVehicleType: user.driverAvailability?.activeVehicleType || '',
  location: user.driverAvailability?.location,
  updatedAt: user.driverAvailability?.updatedAt
});

const updateDriverStatus = async (req, res, next) => {
  try {
    const { isOnline, lat, lng, activeVehicleId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.roles?.includes('DRIVER')) {
      res.status(403);
      throw new Error('Driver role required — switch to Driver mode first');
    }

    user.driverAvailability = user.driverAvailability || {};

    if (activeVehicleId !== undefined) {
      if (!activeVehicleId) {
        user.driverAvailability.activeVehicleId = null;
        user.driverAvailability.activeVehicleType = '';
      } else {
        const vehicle = await resolveActiveVehicle(user, activeVehicleId);
        user.driverAvailability.activeVehicleId = vehicle._id;
        user.driverAvailability.activeVehicleType = vehicle.vehicleType;
      }
      user.driverAvailability.updatedAt = new Date();
    }

    if (isOnline !== undefined) {
      if (isOnline) {
        await requireActiveVehicleForOnline(user);
      }
      user.driverAvailability.isOnline = !!isOnline;
      user.driverAvailability.updatedAt = new Date();
    }

    if (lat != null && lng != null) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
        user.driverAvailability.location = {
          type: 'Point',
          coordinates: [parsedLng, parsedLat]
        };
        user.driverAvailability.updatedAt = new Date();
      }
    }

    sanitizeDriverAvailability(user);
    await user.save();

    return res.json({
      success: true,
      data: formatDriverStatus(user)
    });
  } catch (e) {
    next(e);
  }
};

const getDriverStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('driverAvailability roles');
    const approved = await loadApprovedVehicles(req.user._id);

    if (user?.roles?.includes('DRIVER')) {
      const changed = await ensureSingleActiveVehicle(user, approved);
      if (changed) {
        sanitizeDriverAvailability(user);
        await user.save();
      }
    }

    return res.json({
      success: true,
      data: {
        ...formatDriverStatus(user),
        approvedVehicles: approved
      }
    });
  } catch (e) {
    next(e);
  }
};

module.exports = { updateDriverStatus, getDriverStatus };

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

const updateDriverStatus = async (req, res, next) => {
  try {
    const { isOnline, lat, lng, activeVehicleId } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.roles?.includes('DRIVER')) {
      res.status(403);
      throw new Error('Driver role required');
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
      if (isOnline && !user.driverAvailability.activeVehicleType) {
        const approved = await Vehicle.find({
          ownerId: user._id,
          verificationStatus: 'APPROVED'
        }).lean();
        if (approved.length === 1) {
          user.driverAvailability.activeVehicleId = approved[0]._id;
          user.driverAvailability.activeVehicleType = approved[0].vehicleType;
        } else if (approved.length > 1) {
          res.status(400);
          throw new Error('Choose which vehicle you are driving before going online');
        } else {
          res.status(400);
          throw new Error('Register and get a vehicle approved before going online');
        }
      }
      user.driverAvailability.isOnline = !!isOnline;
      user.driverAvailability.updatedAt = new Date();
    }

    if (lat != null && lng != null) {
      user.driverAvailability.location = {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      };
      user.driverAvailability.updatedAt = new Date();
    }

    sanitizeDriverAvailability(user);
    await user.save();

    return res.json({
      success: true,
      data: {
        isOnline: user.driverAvailability?.isOnline ?? false,
        activeVehicleId: user.driverAvailability?.activeVehicleId ?? null,
        activeVehicleType: user.driverAvailability?.activeVehicleType || '',
        location: user.driverAvailability?.location,
        updatedAt: user.driverAvailability?.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

const getDriverStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('driverAvailability roles');
    const approved = await Vehicle.find({
      ownerId: req.user._id,
      verificationStatus: 'APPROVED'
    })
      .select('vehicleType licensePlate make model company')
      .lean();

    return res.json({
      success: true,
      data: {
        isOnline: user?.driverAvailability?.isOnline ?? false,
        activeVehicleId: user?.driverAvailability?.activeVehicleId ?? null,
        activeVehicleType: user?.driverAvailability?.activeVehicleType || '',
        location: user?.driverAvailability?.location,
        updatedAt: user?.driverAvailability?.updatedAt,
        approvedVehicles: approved
      }
    });
  } catch (e) {
    next(e);
  }
};

module.exports = { updateDriverStatus, getDriverStatus };

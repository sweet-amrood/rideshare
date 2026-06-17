const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const {
  applyVehicleMediaToPayload,
  vehicleHasRequiredMedia
} = require('../utils/vehicleMedia');

/**
 * @desc    Add Vehicle to Profile
 * @route   POST /api/v1/users/vehicle
 * @access  Private
 */
const addVehicle = async (req, res, next) => {
  try {
    const {
      make,
      model,
      year,
      color,
      licensePlate,
      totalSeats,
      imageUrl,
      vehicleType,
      company,
      photoUrls,
      photoPublicIds,
      registrationDocUrl,
      registrationDocPublicId
    } = req.body;

    if (!vehicleHasRequiredMedia({ photoUrls, imageUrl, registrationDocUrl })) {
      res.status(400);
      throw new Error(
        'Upload at least one vehicle photo and your registration card (papers) before saving'
      );
    }

    const plate = licensePlate.trim();
    const existingPlate = await Vehicle.findOne({ licensePlate: plate });
    const brand = (company || make || '').trim();
    const wasRejected = existingPlate?.verificationStatus === 'REJECTED';

    let vehicle;

    if (existingPlate && existingPlate.ownerId.toString() === req.user._id.toString()) {
      Object.assign(
        existingPlate,
        applyVehicleMediaToPayload(
          {
            vehicleType: vehicleType || existingPlate.vehicleType,
            company: brand,
            make: brand,
            model,
            year,
            color,
            totalSeats
          },
          {
            photoUrls: photoUrls || (imageUrl ? [imageUrl] : []),
            photoPublicIds,
            registrationDocUrl,
            registrationDocPublicId,
            imageUrl
          }
        )
      );
      existingPlate.rejectionReason = '';
      await existingPlate.save();
      vehicle = existingPlate;
    } else if (existingPlate) {
      res.status(400);
      throw new Error('This license plate is registered to another account');
    } else {
      vehicle = await Vehicle.create(
        applyVehicleMediaToPayload(
          {
            ownerId: req.user._id,
            vehicleType: vehicleType || 'CAR',
            company: brand,
            make: brand,
            model,
            year,
            color,
            licensePlate: plate,
            totalSeats
          },
          {
            photoUrls: photoUrls || (imageUrl ? [imageUrl] : []),
            photoPublicIds,
            registrationDocUrl,
            registrationDocPublicId,
            imageUrl
          }
        )
      );
    }

    const user = await User.findById(req.user._id);
    if (!user.roles.includes('DRIVER')) {
      user.roles.push('DRIVER');
      await user.save();
    }

    const updated = Boolean(existingPlate);

    return res.status(updated ? 200 : 201).json({
      success: true,
      message: wasRejected
        ? 'Vehicle updated and resubmitted for admin review.'
        : updated
          ? 'Vehicle updated. Pending admin review.'
          : 'Vehicle added successfully. Pending admin review.',
      vehicle
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addVehicle
};

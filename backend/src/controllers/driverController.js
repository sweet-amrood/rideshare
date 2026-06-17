const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { buildProfileResponse } = require('../utils/profileHelpers');
const {
  hasDriverDocuments,
  markDriverApplicationSubmitted
} = require('../utils/driverSetupHelpers');
const { ensureDocumentsFromUrls } = require('../services/userDocumentService');
const {
  applyVehicleMediaToPayload,
  vehicleHasRequiredMedia,
  vehicleRecordHasRequiredMedia,
  vehicleRecordToSetupPayload
} = require('../utils/vehicleMedia');

const SEAT_DEFAULTS = { CAR: 4, BIKE: 1, RICKSHAW: 3 };

/**
 * @route POST /api/v1/users/driver-setup
 * @body vehicle, documents: { cnicUrl, selfieUrl, licenseUrl }
 */
const finalizeDriverDocuments = async (user, documents, ownedVehicle) => {
  await ensureDocumentsFromUrls(user._id, {
    cnicUrl: documents.cnicUrl,
    selfieUrl: documents.selfieUrl,
    licenseUrl: documents.licenseUrl
  });

  user.verification.cnicUrl = documents.cnicUrl.trim();
  user.verification.selfieUrl = documents.selfieUrl.trim();
  user.verification.licenseUrl = documents.licenseUrl.trim();
  user.verification.documentUrl = documents.licenseUrl.trim();
  user.verification.status = 'PENDING';
  user.verification.rejectionReason = '';
  if (ownedVehicle?.vehicleType) {
    user.driverSetup.primaryVehicleType = ownedVehicle.vehicleType;
  }
  markDriverApplicationSubmitted(user);

  if (!user.roles.includes('DRIVER')) user.roles.push('DRIVER');
  await user.save();
};

const completeDriverSetup = async (req, res, next) => {
  try {
    const { vehicle, documents, skipVehicle } = req.body;

    if (!req.user.roles?.includes('DRIVER')) {
      const user = await User.findById(req.user._id);
      if (!user.roles.includes('DRIVER')) user.roles.push('DRIVER');
      await user.save();
    }

    const docs = documents || {};
    if (!docs.cnicUrl?.trim() || !docs.selfieUrl?.trim() || !docs.licenseUrl?.trim()) {
      res.status(400);
      throw new Error('CNIC, selfie, and driving license documents are all required');
    }

    const user = await User.findById(req.user._id);
    let ownedVehicle;

    if (skipVehicle === true) {
      const vehicles = await Vehicle.find({ ownerId: user._id });
      ownedVehicle = vehicles.find(vehicleRecordHasRequiredMedia);
      if (!ownedVehicle) {
        res.status(400);
        throw new Error(
          'Add your vehicle details (photos and registration) before submitting personal documents'
        );
      }
    } else {
      if (!vehicle?.vehicleType || !vehicle?.company || !vehicle?.model) {
        res.status(400);
        throw new Error('Vehicle type, company, and model are required');
      }

      if (!vehicleHasRequiredMedia(vehicle)) {
        res.status(400);
        throw new Error(
          'Upload at least one vehicle photo and your registration card before submitting'
        );
      }

      const plate = (vehicle.licensePlate || '').trim();
      if (!plate) {
        res.status(400);
        throw new Error('Registration / plate number is required');
      }

      const existingPlate = await Vehicle.findOne({ licensePlate: plate });
      if (existingPlate && existingPlate.ownerId.toString() !== req.user._id.toString()) {
        res.status(400);
        throw new Error('This registration number is already registered');
      }

      const seats =
        parseInt(vehicle.totalSeats, 10) ||
        SEAT_DEFAULTS[vehicle.vehicleType] ||
        4;

      ownedVehicle = await Vehicle.findOne({ ownerId: user._id, licensePlate: plate });
      const vehiclePayload = applyVehicleMediaToPayload(
        {
          ownerId: user._id,
          vehicleType: vehicle.vehicleType,
          company: vehicle.company.trim(),
          make: vehicle.company.trim(),
          model: vehicle.model.trim(),
          year: parseInt(vehicle.year, 10) || new Date().getFullYear(),
          color: (vehicle.color || '—').trim(),
          licensePlate: plate,
          totalSeats: Math.min(8, Math.max(1, seats)),
          hasAC: vehicle.hasAC !== false
        },
        vehicle
      );

      if (ownedVehicle) {
        Object.assign(ownedVehicle, vehiclePayload);
        await ownedVehicle.save();
      } else {
        ownedVehicle = await Vehicle.create(vehiclePayload);
      }
    }

    await finalizeDriverDocuments(user, docs, ownedVehicle);

    const vehicles = await Vehicle.find({ ownerId: user._id });

    return res.status(200).json({
      success: true,
      message:
        'Your driver application has been submitted. We will review it within 2–4 business days and notify you by email.',
      applicationSubmitted: true,
      data: await buildProfileResponse(user, vehicles),
      driverSetupComplete: false
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/users/driver-setup/status
 */
const getDriverSetupStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const vehicles = await Vehicle.find({ ownerId: req.user._id });
    const docsOk = hasDriverDocuments(user.verification);
    const approved =
      user.driverSetupComplete === true && user.verification?.status === 'APPROVED';
    const applicationPending =
      user.driverApplicant && user.verification?.status === 'PENDING' && docsOk;
    const completeVehicle = vehicles.find(vehicleRecordHasRequiredMedia) || null;
    const vehicleComplete = Boolean(completeVehicle);
    const needsDocumentsOnly = vehicleComplete && !docsOk;

    return res.status(200).json({
      success: true,
      data: {
        isDriver: user.roles.includes('DRIVER'),
        driverSetupComplete: approved,
        applicationPending,
        hasVehicle: vehicles.length > 0,
        vehicleComplete,
        documentsComplete: docsOk,
        needsDocumentsOnly,
        vehicle: vehicleRecordToSetupPayload(completeVehicle),
        documents: {
          cnic: !!user.verification?.cnicUrl,
          selfie: !!user.verification?.selfieUrl,
          license: !!user.verification?.licenseUrl
        },
        verificationStatus: user.verification?.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/users/driver-documents/resubmit
 * @body documents: { cnicUrl, selfieUrl, licenseUrl }
 */
const resubmitDriverDocuments = async (req, res, next) => {
  try {
    const docs = req.body.documents || req.body;
    if (!docs.cnicUrl?.trim() || !docs.selfieUrl?.trim() || !docs.licenseUrl?.trim()) {
      res.status(400);
      throw new Error('CNIC, selfie, and driving license are all required');
    }

    const user = await User.findById(req.user._id);
    if (!user.roles.includes('DRIVER')) {
      res.status(403);
      throw new Error('Driver role required');
    }

    await ensureDocumentsFromUrls(user._id, {
      cnicUrl: docs.cnicUrl,
      selfieUrl: docs.selfieUrl,
      licenseUrl: docs.licenseUrl
    });

    user.verification.cnicUrl = docs.cnicUrl.trim();
    user.verification.selfieUrl = docs.selfieUrl.trim();
    user.verification.licenseUrl = docs.licenseUrl.trim();
    user.verification.documentUrl = docs.licenseUrl.trim();
    user.verification.status = 'PENDING';
    user.verification.rejectionReason = '';
    markDriverApplicationSubmitted(user);
    await user.save();

    const vehicles = await Vehicle.find({ ownerId: user._id });

    return res.status(200).json({
      success: true,
      message:
        'Documents resubmitted. Your application will be reviewed within 2–4 business days.',
      applicationSubmitted: true,
      data: await buildProfileResponse(user, vehicles)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { completeDriverSetup, getDriverSetupStatus, resubmitDriverDocuments };

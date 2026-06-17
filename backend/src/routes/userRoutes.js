const express = require('express');
const { addVehicle } = require('../controllers/userController');
const { uploadVehicleMedia } = require('../controllers/vehicleMediaController');
const { uploadVehicleMediaFields, uploadAvatarImage, handleMulterError } = require('../middlewares/uploadMiddleware');
const {
  completeDriverSetup,
  getDriverSetupStatus,
  resubmitDriverDocuments
} = require('../controllers/driverController');
const {
  getMyProfile,
  updateMyProfile,
  updatePrivacy,
  getPublicProfile,
  getUserReviews,
  createReview,
  getVerificationArchitecture,
  verifyPhone
} = require('../controllers/profileController');
const { protect } = require('../middlewares/authMiddleware');
const { listPresets, setAvatar, uploadAvatar } = require('../controllers/avatarController');
const { updateDriverStatus, getDriverStatus } = require('../controllers/driverStatusController');
const router = express.Router();

router.use(protect);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.patch('/profile/privacy', updatePrivacy);
router.post('/profile/verify-phone', verifyPhone);
router.get('/verification/architecture', getVerificationArchitecture);
router.post('/vehicle/upload-media', (req, res, next) => {
  uploadVehicleMediaFields(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    uploadVehicleMedia(req, res, next);
  });
});
router.post('/vehicle', addVehicle);
router.post('/driver-setup', completeDriverSetup);
router.get('/driver-setup/status', getDriverSetupStatus);
router.post('/driver-documents/resubmit', resubmitDriverDocuments);
router.get('/avatars/presets', listPresets);
router.patch('/profile/avatar', setAvatar);
router.post('/profile/avatar/upload', (req, res, next) => {
  uploadAvatarImage(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    uploadAvatar(req, res, next);
  });
});
router.get('/driver/status', getDriverStatus);
router.patch('/driver/status', updateDriverStatus);

router.get('/:id/public', getPublicProfile);
router.get('/:id/reviews', getUserReviews);
router.post('/:id/reviews', createReview);

module.exports = router;

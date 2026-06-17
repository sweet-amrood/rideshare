const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype) || file.mimetype === 'application/pdf';
    if (!ok) {
      return cb(new Error('Only images (JPEG, PNG, WebP, GIF) or PDF allowed'));
    }
    cb(null, true);
  }
});

const uploadSingleDocument = upload.single('file');

const uploadVerificationFields = upload.fields([
  { name: 'cnic', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
  { name: 'license', maxCount: 1 }
]);

const uploadVehicleMediaFields = upload.fields([
  { name: 'photos', maxCount: 4 },
  { name: 'registration', maxCount: 1 }
]);

const handleMulterError = (err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large (max 8MB)' });
  }
  return res.status(400).json({ success: false, message: err.message });
};

const uploadAvatarImage = upload.single('avatar');

module.exports = {
  uploadSingleDocument,
  uploadAvatarImage,
  uploadVerificationFields,
  uploadVehicleMediaFields,
  handleMulterError
};

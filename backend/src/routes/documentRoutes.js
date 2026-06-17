const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  uploadDocument,
  uploadDocumentsBatch,
  getMyDocuments,
  prepareResubmit
} = require('../controllers/documentController');
const {
  uploadSingleDocument,
  uploadVerificationFields,
  handleMulterError
} = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(protect);

router.get('/me', getMyDocuments);
router.post('/prepare-resubmit', prepareResubmit);
router.post('/upload', (req, res, next) => {
  uploadSingleDocument(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    uploadDocument(req, res, next);
  });
});

router.post('/upload-batch', (req, res, next) => {
  uploadVerificationFields(req, res, (err) => {
    if (err) return handleMulterError(err, req, res, next);
    uploadDocumentsBatch(req, res, next);
  });
});

module.exports = router;

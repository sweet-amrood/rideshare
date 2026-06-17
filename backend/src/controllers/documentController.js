const User = require('../models/User');
const userDocumentService = require('../services/userDocumentService');

const VALID_TYPES = [
  'CNIC',
  'SELFIE',
  'DRIVING_LICENSE',
  'DOMAIN',
  'PASSPORT',
  'STUDENT_ID',
  'COMPANY_ID',
  'VEHICLE_REGISTRATION',
  'INSURANCE'
];

/**
 * POST /api/v1/documents/upload
 * multipart: file, type (CNIC | SELFIE | DRIVING_LICENSE | ...)
 */
const uploadDocument = async (req, res, next) => {
  try {
    const type = (req.body.type || '').toUpperCase();
    if (!VALID_TYPES.includes(type)) {
      res.status(400);
      throw new Error(`Invalid document type. Use one of: ${VALID_TYPES.join(', ')}`);
    }
    if (!req.file) {
      res.status(400);
      throw new Error('File is required (field name: file)');
    }

    const { bundle, file } = await userDocumentService.uploadAndSave(req.user._id, type, req.file);

    const user = await User.findById(req.user._id).select('verification');
    const summary = userDocumentService.envelopeFromBundle(bundle, user);

    return res.status(201).json({
      success: true,
      message: 'Document saved to your verification request',
      data: {
        requestId: bundle._id,
        links: bundle.links,
        file: {
          _id: file._id,
          type: file.type,
          label: file.label || type,
          url: file.url,
          status: file.status
        },
        ...summary
      },
      verification: user?.verification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/documents/me
 */
const getMyDocuments = async (req, res, next) => {
  try {
    const data = await userDocumentService.getDocumentsByUserId(req.user._id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/documents/prepare-resubmit
 * Clears rejected flags so re-upload is allowed (optional before replacing files)
 */
const prepareResubmit = async (req, res, next) => {
  try {
    const documents = await userDocumentService.resetRejectedForResubmit(req.user._id);
    const user = await User.findById(req.user._id).select('verification');

    return res.status(200).json({
      success: true,
      message: 'You can re-upload your documents now',
      data: { documents, verification: user?.verification }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/documents/upload-batch
 * multipart fields: cnic, selfie, license (each optional file)
 */
const uploadDocumentsBatch = async (req, res, next) => {
  try {
    const fileEntries = [];
    for (const [kind, docType] of Object.entries(userDocumentService.BATCH_KIND_TO_TYPE)) {
      const arr = req.files?.[kind];
      if (arr?.[0]) {
        fileEntries.push({ type: docType, file: arr[0] });
      }
    }

    if (!fileEntries.length) {
      res.status(400);
      throw new Error('Attach at least one file (field names: cnic, selfie, or license)');
    }

    const { bundle, files } = await userDocumentService.uploadManyAndSave(
      req.user._id,
      fileEntries
    );

    const user = await User.findById(req.user._id).select('verification');
    const summary = userDocumentService.envelopeFromBundle(bundle, user);

    return res.status(201).json({
      success: true,
      message: `${files.length} document(s) saved for admin review`,
      data: {
        requestId: bundle._id,
        links: bundle.links,
        files: files.map((f) => ({
          _id: f._id,
          type: f.type,
          label: f.label,
          url: f.url,
          status: f.status
        })),
        ...summary
      },
      verification: user?.verification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  uploadDocumentsBatch,
  getMyDocuments,
  prepareResubmit
};

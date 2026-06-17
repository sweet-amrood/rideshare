const mongoose = require('mongoose');

const DOC_TYPES = [
  'CNIC',
  'PASSPORT',
  'STUDENT_ID',
  'COMPANY_ID',
  'DRIVING_LICENSE',
  'VEHICLE_REGISTRATION',
  'INSURANCE',
  'SELFIE',
  'DOMAIN'
];

const DOC_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT'];

const VerificationFileSchema = new mongoose.Schema(
  {
    type: { type: String, enum: DOC_TYPES, required: true },
    label: { type: String, default: '' },
    url: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: '' },
    fileName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    status: { type: String, enum: DOC_STATUSES, default: 'PENDING' },
    reviewedAt: { type: Date, default: null }
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: true } }
);

/**
 * One verification request per user — all Cloudinary files in `documents` + quick `links` map.
 */
const UserDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'UNVERIFIED'],
      default: 'PENDING',
      index: true
    },
    rejectionReason: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    /** All uploaded files with metadata */
    documents: { type: [VerificationFileSchema], default: [] },
    /** Denormalized Cloudinary URLs — readable in one query without iterating */
    links: {
      cnicUrl: { type: String, default: '' },
      selfieUrl: { type: String, default: '' },
      licenseUrl: { type: String, default: '' },
      documentUrl: { type: String, default: '' },
      domainUrl: { type: String, default: '' }
    },
    history: [
      {
        status: String,
        note: String,
        at: { type: Date, default: Date.now },
        by: String
      }
    ]
  },
  { timestamps: true }
);

/** Drop corrupt subdocs (missing type/url) before validation — fixes legacy DB rows */
UserDocumentSchema.pre('validate', function stripInvalidDocuments(next) {
  if (!Array.isArray(this.documents)) {
    this.documents = [];
    return next();
  }
  this.documents = this.documents.filter(
    (d) => d && d.type && String(d.url || '').trim()
  );
  next();
});

module.exports = mongoose.model('UserDocument', UserDocumentSchema);
module.exports.DOC_TYPES = DOC_TYPES;

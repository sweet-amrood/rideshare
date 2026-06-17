const User = require('../models/User');
const UserDocument = require('../models/UserDocument');
const VerificationRequest = require('../models/VerificationRequest');
const { uploadDocumentFile, deleteFromCloudinary } = require('./cloudinaryService');
const { isValidStoredDocumentUrl } = require('../utils/documentUrl');

const DOC_LABELS = {
  CNIC: 'CNIC / National ID',
  SELFIE: 'Selfie verification',
  DRIVING_LICENSE: 'Driving license',
  DOMAIN: 'Student / Company ID',
  PASSPORT: 'Passport',
  STUDENT_ID: 'Student ID',
  COMPANY_ID: 'Company ID',
  VEHICLE_REGISTRATION: 'Vehicle registration',
  INSURANCE: 'Insurance'
};

const LINK_KEYS = {
  CNIC: 'cnicUrl',
  SELFIE: 'selfieUrl',
  DRIVING_LICENSE: 'licenseUrl',
  DOMAIN: 'domainUrl'
};

const normalizeDocumentType = (documentType) =>
  String(documentType || '')
    .toUpperCase()
    .replace(/-/g, '_');

const isCompleteDocumentEntry = (d) =>
  Boolean(d?.type && String(d.url || '').trim());

const bundleNeedsRepair = (bundle) => {
  if (!bundle) return false;
  const docs = bundle.documents || [];
  if (!docs.length) return true;
  return docs.some((d) => !isCompleteDocumentEntry(d));
};

const sanitizeBundleDocuments = (bundle) => {
  if (!bundle) return false;
  const before = bundle.documents?.length || 0;
  bundle.documents = (bundle.documents || []).filter(isCompleteDocumentEntry);
  if (before !== bundle.documents.length) {
    bundle.markModified('documents');
    return true;
  }
  return false;
};

const buildDocumentsFromUserVerification = (user) => {
  const documents = [];
  for (const [type, linkKey] of Object.entries(LINK_KEYS)) {
    const legacyKey = linkKey === 'domainUrl' ? 'documentUrl' : linkKey;
    const url = user?.verification?.[legacyKey]?.trim();
    if (url) {
      documents.push({
        type,
        label: DOC_LABELS[type],
        url,
        status: user.verification?.status === 'APPROVED' ? 'APPROVED' : 'PENDING'
      });
    }
  }
  return documents;
};

const buildDocumentsFromLinks = (bundle) => {
  const documents = [];
  const links = bundle?.links || {};
  for (const [type, linkKey] of Object.entries(LINK_KEYS)) {
    const url = links[linkKey]?.trim();
    if (url) {
      const existing = (bundle.documents || []).find((d) => d.type === type);
      documents.push({
        type,
        label: DOC_LABELS[type],
        url,
        cloudinaryPublicId: existing?.cloudinaryPublicId || '',
        fileName: existing?.fileName || '',
        mimeType: existing?.mimeType || '',
        fileSize: existing?.fileSize || 0,
        status: existing?.status || bundle.status || 'PENDING',
        reviewedAt: existing?.reviewedAt || null
      });
    }
  }
  return documents;
};

/** Fix empty/corrupt `documents[]` and merge leftover per-type rows */
const repairBundle = async (bundle, userId) => {
  if (!bundle) return null;

  let dirty = sanitizeBundleDocuments(bundle);

  if (!bundle.documents.length) {
    const fromLinks = buildDocumentsFromLinks(bundle);
    if (fromLinks.length) {
      bundle.documents = fromLinks;
      bundle.markModified('documents');
      dirty = true;
    }
  }

  if (!bundle.documents.length) {
    const legacyRows = await UserDocument.find({
      userId,
      type: { $exists: true },
      url: { $exists: true, $ne: '' }
    });

    if (legacyRows.length) {
      await UserDocument.deleteOne({ _id: bundle._id });
      return migrateLegacyRows(userId, legacyRows);
    }

    const user = await User.findById(userId);
    const rebuilt = buildDocumentsFromUserVerification(user);
    if (rebuilt.length) {
      bundle.documents = rebuilt;
      bundle.markModified('documents');
      dirty = true;
    }
  }

  if (dirty && bundle.documents.length) {
    syncLinksFromDocuments(bundle);
    recomputeBundleStatus(bundle);
    try {
      await bundle.save();
    } catch (saveErr) {
      console.error('[UserDocument] repairBundle save failed:', saveErr.message);
    }
  }

  return bundle;
};

const recomputeBundleStatus = (bundle) => {
  const docs = bundle.documents || [];
  if (!docs.length) {
    bundle.status = 'UNVERIFIED';
    return bundle;
  }
  const pending = docs.some((d) => d.status === 'PENDING');
  const rejected = docs.some((d) => d.status === 'REJECTED');
  if (pending) bundle.status = 'PENDING';
  else if (rejected) bundle.status = 'REJECTED';
  else if (docs.every((d) => d.status === 'APPROVED')) bundle.status = 'APPROVED';
  else bundle.status = 'PENDING';
  return bundle;
};

const syncLinksFromDocuments = (bundle) => {
  if (!bundle.links) bundle.links = {};
  for (const key of Object.values(LINK_KEYS)) {
    bundle.links[key] = bundle.links[key] || '';
  }
  for (const doc of bundle.documents || []) {
    const key = LINK_KEYS[doc.type];
    if (key && doc.url) bundle.links[key] = doc.url;
  }
  if (bundle.links.licenseUrl) {
    bundle.links.documentUrl = bundle.links.licenseUrl;
  }
  return bundle;
};

const inferMimeType = (url, mime = '') => {
  if (mime) return mime;
  const u = String(url || '');
  if (/\.pdf(\?|$)/i.test(u) || /\/raw\/upload\//i.test(u)) return 'application/pdf';
  if (/res\.cloudinary\.com/i.test(u) && /\/image\/upload\//i.test(u)) return 'image/jpeg';
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return 'image/jpeg';
  return '';
};

const toPlainFile = (d) => {
  const url = d.url || '';
  const mimeType = inferMimeType(url, d.mimeType || '');
  return {
  _id: d._id?.toString?.() || d._id,
  type: d.type,
  label: d.label || DOC_LABELS[d.type] || d.type,
  url,
  mimeType,
  previewable:
    isValidStoredDocumentUrl(url) || /res\.cloudinary\.com/i.test(url),
  cloudinaryPublicId: d.cloudinaryPublicId || '',
  fileName: d.fileName || '',
  fileSize: d.fileSize || 0,
  status: d.status || 'PENDING',
  rejectionReason: '',
  reviewedAt: d.reviewedAt || null,
  uploadedAt: d.createdAt || d.uploadedAt || null
};
};

const envelopeFromBundle = (bundle, user) => {
  const items = (bundle?.documents || []).map(toPlainFile);
  const rejected = items.filter((i) => i.status === 'REJECTED');
  const approved = items.filter((i) => i.status === 'APPROVED');
  const pending = items.filter((i) => i.status === 'PENDING');

  return {
    requestId: bundle?._id?.toString(),
    userId: bundle?.userId?.toString(),
    status: bundle?.status || 'UNVERIFIED',
    rejectionReason: bundle?.rejectionReason || user?.verification?.rejectionReason || '',
    reviewedAt: bundle?.reviewedAt || user?.verification?.reviewedAt || null,
    links: bundle?.links || {},
    items,
    summary:
      items.length === 0
        ? 'No documents uploaded'
        : `${items.length} file(s): ${items.map((d) => d.type).join(', ')}`,
    approvedCount: approved.length,
    rejectedCount: rejected.length,
    pendingCount: pending.length,
    combinedRejectionReason: bundle?.rejectionReason || '',
    allReviewed: items.length > 0 && pending.length === 0
  };
};

/** Migrate old schema (one Mongo doc per file type) into single bundle */
const migrateLegacyRows = async (userId, legacyRows) => {
  const documents = legacyRows
    .filter((row) => row.type && String(row.url || '').trim())
    .map((row) => ({
    type: row.type,
    label: row.label || DOC_LABELS[row.type],
    url: row.url,
    cloudinaryPublicId: row.cloudinaryPublicId || '',
    fileName: row.fileName || '',
    mimeType: row.mimeType || '',
    fileSize: row.fileSize || 0,
    status: row.status || 'PENDING',
    reviewedAt: row.reviewedAt || null
  }));

  if (!documents.length) {
    return null;
  }

  const bundle = await UserDocument.create({
    userId,
    documents,
    history: [{ status: 'MIGRATED', note: 'Consolidated legacy per-type records', by: 'SYSTEM' }]
  });
  syncLinksFromDocuments(bundle);
  recomputeBundleStatus(bundle);
  await bundle.save();

  for (const row of legacyRows) {
    if (row._id) await UserDocument.deleteOne({ _id: row._id });
  }

  return bundle;
};

/**
 * Single query: one document per user with all Cloudinary links.
 */
const getOrCreateRequest = async (userId) => {
  // New schema: one row per user, no root-level `type` field
  let bundle = await UserDocument.findOne({ userId, type: { $exists: false } });

  if (bundle) {
    return bundleNeedsRepair(bundle) ? repairBundle(bundle, userId) : bundle;
  }

  // Old schema: one row per file type (root-level `type`)
  const legacyRows = await UserDocument.find({
    userId,
    type: { $exists: true }
  });

  if (legacyRows.length) {
    return migrateLegacyRows(userId, legacyRows);
  }

  const user = await User.findById(userId);
  const documents = buildDocumentsFromUserVerification(user);

  if (!documents.length) {
    return null;
  }

  bundle = await UserDocument.create({
    userId,
    documents,
    status: user.verification?.status || 'PENDING',
    rejectionReason: user.verification?.rejectionReason || ''
  });
  syncLinksFromDocuments(bundle);
  await bundle.save();
  return bundle;
};

const syncLegacyUserUrls = async (user, bundle) => {
  if (!bundle) return;
  const links = bundle.links || {};
  if (links.cnicUrl) user.verification.cnicUrl = links.cnicUrl;
  if (links.selfieUrl) user.verification.selfieUrl = links.selfieUrl;
  if (links.licenseUrl) {
    user.verification.licenseUrl = links.licenseUrl;
    user.verification.documentUrl = links.licenseUrl;
  }
  if (links.domainUrl) user.verification.documentUrl = links.domainUrl;
  user.verification.status = bundle.status || user.verification.status;
  await user.save();
};

const syncVerificationQueueDoc = async (userId, doc) => {
  if (!doc?.type || !doc?.url) return;
  await VerificationRequest.findOneAndUpdate(
    { userId, type: doc.type },
    {
      userId,
      type: doc.type,
      documentUrl: doc.url,
      status: doc.status || 'PENDING',
      rejectionReason: ''
    },
    { upsert: true, new: true }
  );
};

const syncVerificationQueue = async (userId, bundle) => {
  for (const doc of bundle.documents || []) {
    await syncVerificationQueueDoc(userId, doc);
  }
};

const upsertFileInBundle = async (userId, type, payload) => {
  let bundle = await getOrCreateRequest(userId);
  if (!bundle) {
    bundle = new UserDocument({ userId, documents: [], links: {} });
  }

  const idx = bundle.documents.findIndex((d) => d.type === type);
  const existing = idx >= 0 ? bundle.documents[idx] : null;

  if (existing?.cloudinaryPublicId && payload.cloudinaryPublicId !== existing.cloudinaryPublicId) {
    await deleteFromCloudinary(existing.cloudinaryPublicId);
  }

  const url = String(payload.url || existing?.url || '').trim();
  if (!url) {
    const err = new Error('Document URL is required');
    err.statusCode = 400;
    throw err;
  }

  if (!isValidStoredDocumentUrl(url)) {
    const err = new Error(
      'Document URL is not a valid uploaded file. Ask the user to re-upload via the app.'
    );
    err.statusCode = 400;
    throw err;
  }

  const fileEntry = {
    type,
    label: DOC_LABELS[type] || type,
    url,
    cloudinaryPublicId: payload.cloudinaryPublicId || '',
    fileName: payload.fileName || '',
    mimeType: payload.mimeType || '',
    fileSize: payload.fileSize || 0,
    status: payload.status || 'PENDING',
    reviewedAt: null
  };

  if (idx >= 0) {
    Object.assign(bundle.documents[idx], fileEntry);
    bundle.markModified('documents');
  } else {
    bundle.documents.push(fileEntry);
  }

  sanitizeBundleDocuments(bundle);
  syncLinksFromDocuments(bundle);
  recomputeBundleStatus(bundle);
  bundle.history.push({ status: 'UPLOADED', note: `${type} file updated`, by: 'USER' });
  await bundle.save();

  const file = bundle.documents.find((d) => d.type === type);
  const user = await User.findById(userId);
  if (user) {
    await syncLegacyUserUrls(user, bundle);
    await syncVerificationQueueDoc(userId, file);
  }

  return { bundle, file };
};

const uploadAndSave = async (userId, type, file) => {
  const uploaded = await uploadDocumentFile(file, userId, type);
  const { bundle, file: docFile } = await upsertFileInBundle(userId, type, {
    url: uploaded.url,
    cloudinaryPublicId: uploaded.publicId,
    fileName: file.originalname,
    mimeType: file.mimetype,
    fileSize: uploaded.bytes,
    status: 'PENDING'
  });

  const user = await User.findById(userId);
  if (user && user.verification.status !== 'APPROVED') {
    user.verification.status = 'PENDING';
    user.verification.rejectionReason = '';
    await user.save();
  }

  return { bundle, file: docFile };
};

const BATCH_KIND_TO_TYPE = {
  cnic: 'CNIC',
  selfie: 'SELFIE',
  license: 'DRIVING_LICENSE',
  domain: 'DOMAIN'
};

/** Upload multiple verification files in one request (sequential Cloudinary, one HTTP round-trip). */
const uploadManyAndSave = async (userId, fileEntries) => {
  const uploaded = [];
  let bundle = null;

  for (const { type, file } of fileEntries) {
    const result = await uploadAndSave(userId, type, file);
    bundle = result.bundle;
    uploaded.push(result.file);
  }

  return { bundle, files: uploaded };
};

const getDocumentsByUserId = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    return { items: [], summary: 'No documents uploaded', status: 'UNVERIFIED', links: {} };
  }

  const bundle = await getOrCreateRequest(userId);
  if (!bundle) {
    return envelopeFromBundle(null, user);
  }

  return envelopeFromBundle(bundle, user);
};

const updateDocumentReview = async (userId, documentType, { decision }) => {
  const allowed = ['APPROVED', 'REJECTED'];
  if (!allowed.includes(decision)) {
    const err = new Error('decision must be APPROVED or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  const type = normalizeDocumentType(documentType);
  const bundle = await getOrCreateRequest(userId);
  if (!bundle) {
    const err = new Error('Document not found for this user');
    err.statusCode = 404;
    throw err;
  }

  const idx = bundle.documents.findIndex((d) => d.type === type);
  if (idx < 0) {
    const err = new Error('Document not found for this user');
    err.statusCode = 404;
    throw err;
  }

  bundle.documents[idx].status = decision;
  bundle.documents[idx].reviewedAt = new Date();
  sanitizeBundleDocuments(bundle);
  recomputeBundleStatus(bundle);
  syncLinksFromDocuments(bundle);
  bundle.history.push({
    status: decision,
    note: `${type} ${decision}`,
    by: 'ADMIN'
  });
  await bundle.save();

  await syncVerificationQueue(userId, bundle);

  const user = await User.findById(userId);
  const envelope = envelopeFromBundle(bundle, user);
  if (user) await syncLegacyUserUrls(user, bundle);

  return { bundle, file: bundle.documents[idx], envelope };
};

const ensureDocumentsFromUrls = async (userId, { cnicUrl, selfieUrl, licenseUrl } = {}) => {
  const pairs = [
    ['CNIC', cnicUrl],
    ['SELFIE', selfieUrl],
    ['DRIVING_LICENSE', licenseUrl]
  ].filter(([, url]) => url?.trim());

  for (const [type, url] of pairs) {
    await upsertFileInBundle(userId, type, { url: url.trim(), status: 'PENDING' });
  }

  if (pairs.length) {
    const user = await User.findById(userId);
    if (user && user.verification.status !== 'APPROVED') {
      user.verification.status = 'PENDING';
      user.verification.rejectionReason = '';
      await user.save();
    }
  }
};

const resetRejectedForResubmit = async (userId) => {
  const bundle = await getOrCreateRequest(userId);
  if (!bundle) return getDocumentsByUserId(userId);

  for (const doc of bundle.documents) {
    if (doc.status === 'REJECTED') {
      doc.status = 'PENDING';
      doc.reviewedAt = null;
    }
  }
  recomputeBundleStatus(bundle);
  bundle.rejectionReason = '';
  bundle.history.push({ status: 'RESUBMIT', note: 'User requested resubmission', by: 'USER' });
  await bundle.save();

  const user = await User.findById(userId);
  if (user) await syncLegacyUserUrls(user, bundle);

  return getDocumentsByUserId(userId);
};

module.exports = {
  DOC_LABELS,
  normalizeDocumentType,
  getOrCreateRequest,
  uploadAndSave,
  uploadManyAndSave,
  BATCH_KIND_TO_TYPE,
  envelopeFromBundle,
  getDocumentsByUserId,
  updateDocumentReview,
  upsertFileInBundle,
  ensureDocumentsFromUrls,
  resetRejectedForResubmit,
  /** @deprecated use upsertFileInBundle */
  upsertUserDocument: upsertFileInBundle,
  ensureUserDocumentRecord: async (userId, documentType) => {
    const bundle = await getOrCreateRequest(userId);
    const type = normalizeDocumentType(documentType);
    const file = bundle?.documents?.find((d) => d.type === type);
    if (file) return file;
    const user = await User.findById(userId);
    const key = LINK_KEYS[type] === 'domainUrl' ? 'documentUrl' : LINK_KEYS[type];
    const url = user?.verification?.[key]?.trim();
    if (!url) {
      const err = new Error('Document not found for this user');
      err.statusCode = 404;
      throw err;
    }
    const { file: created } = await upsertFileInBundle(userId, type, { url, status: 'PENDING' });
    return created;
  }
};

const User = require('../../models/User');
const Ride = require('../../models/Ride');
const Booking = require('../../models/Booking');
const Vehicle = require('../../models/Vehicle');
const Report = require('../../models/Report');
const Review = require('../../models/Review');
const VerificationRequest = require('../../models/VerificationRequest');
const Notification = require('../../models/Notification');
const { sendVerificationDecisionEmail } = require('../../services/mailer');
const { emitToAdmin } = require('./adminRealtime');
const {
  getAutoRejectReason,
  buildCombinedRejectionReason
} = require('../utils/documentReviewReasons');
const userDocumentService = require('../../services/userDocumentService');
const UserDocument = require('../../models/UserDocument');

const DOC_DEFS = [
  { type: 'CNIC', label: 'CNIC / National ID', urlKey: 'cnicUrl' },
  { type: 'SELFIE', label: 'Selfie verification', urlKey: 'selfieUrl' },
  { type: 'DRIVING_LICENSE', label: 'Driving license', urlKey: 'licenseUrl' },
  { type: 'DOMAIN', label: 'Student / Company ID', urlKey: 'documentUrl' }
];

const buildUserDocuments = (user) => {
  const v = user.verification || {};
  const docs = DOC_DEFS.map((d) => ({
    type: d.type,
    label: d.label,
    url: v[d.urlKey] || ''
  })).filter((d) => d.url);

  return {
    status: v.status || 'UNVERIFIED',
    rejectionReason: v.rejectionReason || '',
    reviewedAt: v.reviewedAt,
    items: docs,
    summary:
      docs.length === 0
        ? 'No documents uploaded'
        : `${docs.length} file(s): ${docs.map((d) => d.type).join(', ')}`
  };
};

const enrichDocumentsForUser = async (user) => {
  const docs = await userDocumentService.getDocumentsByUserId(user._id);
  const requests = await VerificationRequest.find({ userId: user._id });
  const byType = Object.fromEntries(requests.map((r) => [r.type, r]));

  const items = docs.items.map((d) => ({
    ...d,
    requestId: byType[d.type]?._id?.toString() || null,
    reviewedAt: d.reviewedAt || byType[d.type]?.reviewedAt || null
  }));

  return {
    requestId: docs.requestId,
    links: docs.links || {},
    status: docs.status,
    rejectionReason: docs.rejectionReason,
    reviewedAt: user.verification?.reviewedAt,
    items,
    summary: docs.summary,
    approvedCount: docs.approvedCount,
    rejectedCount: docs.rejectedCount,
    pendingCount: docs.pendingCount,
    combinedRejectionReason: docs.combinedRejectionReason,
    allReviewed: docs.allReviewed
  };
};

const recomputeUserVerificationStatus = async (user) => {
  const docs = await enrichDocumentsForUser(user);
  if (!docs.items.length) return docs;

  if (docs.pendingCount > 0) {
    user.verification.status = 'PENDING';
  } else if (docs.rejectedCount > 0) {
    user.verification.status = 'REJECTED';
    user.verification.domainVerified = false;
  } else {
    user.verification.status = 'APPROVED';
    user.verification.rejectionReason = '';
    user.verification.domainVerified = true;
    const { syncDriverSetupAfterApproval } = require('../../utils/driverApprovalSync');
    await syncDriverSetupAfterApproval(user);
  }
  user.verification.reviewedAt = new Date();
  await user.save();
  return docs;
};

const buildUserQuery = (filters) => {
  const q = {};
  if (filters.search) {
    const s = filters.search.trim();
    q.$or = [
      { name: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { phoneNumber: new RegExp(s, 'i') }
    ];
  }
  if (filters.role) q.roles = filters.role;
  if (filters.accountStatus) q.accountStatus = filters.accountStatus;
  if (filters.verificationStatus) q['verification.status'] = filters.verificationStatus;
  return q;
};

const listUsers = async ({ page = 1, limit = 20, ...filters }) => {
  const query = buildUserQuery(filters);
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(query)
  ]);
  const items = rows.map((u) => {
    const doc = buildUserDocuments(u);
    return {
      ...u.toObject(),
      documentsSummary: doc.summary,
      documentsCount: doc.items.length
    };
  });
  return { items, total, page, limit };
};

const getUserDetail = async (userId) => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('communities', 'name')
    .lean();
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [ridesOffered, bookingsAsPassenger, vehicles, reportsAgainst, reviews] =
    await Promise.all([
      Ride.countDocuments({ driverId: userId }),
      Booking.countDocuments({ passengerId: userId }),
      Vehicle.find({ ownerId: userId }).lean(),
      Report.find({ reportedUserId: userId }).sort({ createdAt: -1 }).limit(10).lean(),
      Review.find({ revieweeId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('reviewerId', 'name')
        .lean()
    ]);

  const documents = await enrichDocumentsForUser(user);
  const verificationHistory = await VerificationRequest.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    user,
    documents,
    verificationHistory,
    stats: {
      ridesOffered,
      bookingsAsPassenger,
      vehicles: vehicles.length
    },
    vehicles,
    reportsAgainst,
    reviews
  };
};

/**
 * Approve / reject / request resubmission — updates profile + queue + email + in-app notification
 */
const reviewUserDocuments = async (userId, { decision, reason = '' }) => {
  const allowed = ['APPROVED', 'REJECTED', 'RESUBMIT'];
  if (!allowed.includes(decision)) {
    const err = new Error('decision must be APPROVED, REJECTED, or RESUBMIT');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (decision === 'APPROVED') {
    user.verification.status = 'APPROVED';
    user.verification.domainVerified = true;
    user.verification.rejectionReason = '';
    const { syncDriverSetupAfterApproval } = require('../../utils/driverApprovalSync');
    await syncDriverSetupAfterApproval(user);
  } else if (decision === 'REJECTED') {
    user.verification.status = 'REJECTED';
    user.verification.rejectionReason = reason || 'Documents did not meet requirements';
  } else {
    user.verification.status = 'PENDING';
    user.verification.rejectionReason = reason || 'Please resubmit clearer documents';
  }

  user.verification.reviewedAt = new Date();
  if (reason) user.adminNotes = reason;
  await user.save();

  await VerificationRequest.updateMany(
    { userId, status: 'PENDING' },
    {
      $set: {
        status: decision === 'RESUBMIT' ? 'RESUBMIT' : decision,
        rejectionReason: reason,
        reviewedAt: new Date()
      },
      $push: { history: { status: decision, note: reason, by: 'ADMIN' } }
    }
  );

  await sendVerificationDecisionEmail(user.email, user.name, decision, reason);

  await Notification.create({
    userId: user._id,
    type: 'VERIFICATION',
    title: `Verification ${decision}`,
    body: reason || `Your documents were marked as ${decision}.`,
    data: {}
  });

  emitToAdmin('user-verification-reviewed', { userId, decision });
  return getUserDetail(userId);
};

/**
 * Per-document accept / reject with auto rejection reasoning
 */
const reviewSingleDocument = async (userId, documentType, { decision, reason = '' }, adminId) => {
  const allowed = ['APPROVED', 'REJECTED'];
  if (!allowed.includes(decision)) {
    const err = new Error('decision must be APPROVED or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  await userDocumentService.updateDocumentReview(userId, documentType, { decision });

  await recomputeUserVerificationStatus(user);

  emitToAdmin('document-reviewed', { userId, documentType, decision });
  return getUserDetail(userId);
};

/** Email + in-app notification after all per-document reviews are done */
const finalizeVerificationNotify = async (userId, { note = '' } = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const docs = await enrichDocumentsForUser(user);
  if (!docs.allReviewed) {
    const err = new Error('Review every document before notifying the user');
    err.statusCode = 400;
    throw err;
  }

  await recomputeUserVerificationStatus(user);

  const freshUser = await User.findById(userId);
  if (!freshUser) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const decision = freshUser.verification.status;
  const reason =
    decision === 'REJECTED'
      ? note.trim() ||
        'Your verification was not approved. Please re-upload clearer documents.'
      : note.trim() || 'All submitted documents have been approved.';

  freshUser.verification.rejectionReason = reason;
  if (note) freshUser.adminNotes = note;
  await freshUser.save();

  await sendVerificationDecisionEmail(freshUser.email, freshUser.name, decision, reason);

  try {
    await Notification.create({
      userId: freshUser._id,
      type: 'VERIFICATION',
      title: `Verification ${decision}`,
      body: reason
    });
  } catch (notifErr) {
    console.error('[Notification] VERIFICATION create failed:', notifErr.message);
  }

  return getUserDetail(userId);
};

const updateAccountStatus = async (userId, accountStatus, adminNotes = '') => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.accountStatus = accountStatus;
  if (adminNotes) user.adminNotes = adminNotes;
  await user.save();
  emitToAdmin('user-status-changed', { userId, accountStatus });
  return user;
};

const addWarning = async (userId, reason) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.warnings.push({ reason, issuedBy: 'ADMIN' });
  user.trustScore = Math.max(0, (user.trustScore || 100) - 15);
  await user.save();
  return user;
};

const verifyUserManually = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.verification.status = 'APPROVED';
  user.verification.domainVerified = true;
  await user.save();
  emitToAdmin('user-verified', { userId });
  return user;
};

const setTrustedRider = async (userId, enabled) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.badges.trustedRiderOverride = !!enabled;
  user.badges.trustedRiderGrantedAt = enabled ? new Date() : null;
  await user.save();
  return user;
};

const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  emitToAdmin('user-deleted', { userId });
  return { deleted: true };
};

const listDrivers = async ({ status, page = 1, limit = 20 }) => {
  const q = { roles: { $in: ['DRIVER'] } };
  if (status === 'pending') q.driverSetupComplete = false;
  if (status === 'active') {
    q.driverSetupComplete = true;
    q.accountStatus = 'ACTIVE';
  }
  if (status === 'blocked') q.accountStatus = { $in: ['SUSPENDED', 'BANNED'] };

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(q)
  ]);
  return { items, total, page, limit };
};

const approveDriver = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  if (!user.roles.includes('DRIVER')) user.roles.push('DRIVER');
  user.driverApplicant = true;
  user.driverSetupComplete = true;
  if (!user.driverSetup) user.driverSetup = {};
  user.driverSetup.completedAt = new Date();
  user.verification.status = 'APPROVED';
  await user.save();
  emitToAdmin('driver-approved', { userId });
  return user;
};

const rejectDriver = async (userId, reason) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  user.driverSetupComplete = false;
  user.verification.status = 'REJECTED';
  user.adminNotes = reason || 'Driver application rejected';
  await user.save();
  return user;
};

const listVerificationUsers = async ({ status = 'PENDING', page = 1, limit = 20, search = '' }) => {
  try {
    const { syncVerificationQueue } = require('./adminOperationsService');
    await syncVerificationQueue();
  } catch {
    /* queue sync optional */
  }
  const [bundleUserIds, legacyUserIds] = await Promise.all([
    UserDocument.distinct('userId', { type: { $exists: false } }),
    UserDocument.distinct('userId', { type: { $exists: true } })
  ]);
  const userIdsWithDocs = [...new Set([...bundleUserIds, ...legacyUserIds].map(String))];
  const hasDoc = {
    $or: [
      { 'verification.cnicUrl': { $ne: '' } },
      { 'verification.licenseUrl': { $ne: '' } },
      { 'verification.documentUrl': { $ne: '' } },
      { 'verification.selfieUrl': { $ne: '' } },
      ...(userIdsWithDocs.length ? [{ _id: { $in: userIdsWithDocs } }] : [])
    ]
  };

  const q = { $and: [hasDoc] };
  if (status) {
    if (status === 'PENDING') {
      q.$and.push({ 'verification.status': { $in: ['PENDING', 'UNVERIFIED'] } });
    } else {
      q.$and.push({ 'verification.status': status });
    }
  }
  if (search?.trim()) {
    const s = search.trim();
    q.$and.push({
      $or: [
        { name: new RegExp(s, 'i') },
        { email: new RegExp(s, 'i') }
      ]
    });
  }

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password'),
    User.countDocuments(q)
  ]);

  const items = rows.map((u) => {
    const doc = buildUserDocuments(u);
    return {
      _id: u._id,
      name: u.name,
      email: u.email,
      phoneNumber: u.phoneNumber,
      roles: u.roles,
      verificationStatus: u.verification?.status || 'UNVERIFIED',
      documentsSummary: doc.summary,
      documentsCount: doc.items.length,
      submittedAt: u.verification?.reviewedAt || u.createdAt
    };
  });

  return { items, total, page, limit };
};

module.exports = {
  buildUserDocuments,
  enrichDocumentsForUser,
  listUsers,
  listVerificationUsers,
  getUserDetail,
  reviewUserDocuments,
  reviewSingleDocument,
  finalizeVerificationNotify,
  updateAccountStatus,
  addWarning,
  verifyUserManually,
  setTrustedRider,
  deleteUser,
  listDrivers,
  approveDriver,
  rejectDriver
};

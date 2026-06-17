const Ride = require('../../models/Ride');
const Booking = require('../../models/Booking');
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');
const Report = require('../../models/Report');
const VerificationRequest = require('../../models/VerificationRequest');
const UserDocument = require('../../models/UserDocument');
const PlatformAnnouncement = require('../../models/PlatformAnnouncement');
const Notification = require('../../models/Notification');
const { reconcileRideSeats } = require('../../services/seatSyncService');
const { releaseSeats } = require('../../utils/rideSeats');
const { emitToAdmin } = require('./adminRealtime');

// ——— Vehicles ———
const listVehicles = async ({ page = 1, limit = 50, status, search }) => {
  const q = {};
  if (status) q.verificationStatus = status;

  const term = search?.trim();
  if (term) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const owners = await User.find({
      $or: [{ name: re }, { email: re }, { phoneNumber: re }]
    })
      .select('_id')
      .limit(50);
    const ownerIds = owners.map((o) => o._id);
    q.$or = [
      { licensePlate: re },
      { company: re },
      { model: re },
      { make: re },
      ...(ownerIds.length ? [{ ownerId: { $in: ownerIds } }] : [])
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Vehicle.find(q)
      .populate('ownerId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Vehicle.countDocuments(q)
  ]);
  return { items, total, page, limit };
};

const getVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId)
    .populate('ownerId', 'name email phoneNumber verification')
    .lean();
  if (!vehicle) {
    const err = new Error('Vehicle not found');
    err.statusCode = 404;
    throw err;
  }
  return vehicle;
};

const reviewVehicle = async (vehicleId, status, rejectionReason = '') => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) {
    const err = new Error('Vehicle not found');
    err.statusCode = 404;
    throw err;
  }
  vehicle.verificationStatus = status;
  vehicle.isVerified = status === 'APPROVED';
  vehicle.rejectionReason = rejectionReason;
  await vehicle.save();
  emitToAdmin('vehicle-reviewed', { vehicleId, status });
  return vehicle;
};

// ——— Verifications ———
const syncVerificationQueue = async () => {
  const legacyUsers = await User.find({
    $or: [
      { 'verification.cnicUrl': { $ne: '' } },
      { 'verification.licenseUrl': { $ne: '' } },
      { 'verification.documentUrl': { $ne: '' } },
      { 'verification.selfieUrl': { $ne: '' } }
    ]
  });

  const bundles = await UserDocument.find({ type: { $exists: false } }).select(
    'userId documents links status rejectionReason'
  );
  const legacyRows = await UserDocument.find({ type: { $exists: true } }).select(
    'userId type url status rejectionReason'
  );

  const queueEntries = [];

  for (const user of legacyUsers) {
    [
      { type: 'CNIC', url: user.verification.cnicUrl },
      { type: 'DRIVING_LICENSE', url: user.verification.licenseUrl },
      { type: 'DOMAIN', url: user.verification.documentUrl },
      { type: 'SELFIE', url: user.verification.selfieUrl }
    ]
      .filter((d) => d.url)
      .forEach((d) => queueEntries.push({ userId: user._id, ...d, status: user.verification.status }));
  }

  for (const bundle of bundles) {
    for (const doc of bundle.documents || []) {
      if (!doc.url) continue;
      queueEntries.push({
        userId: bundle.userId,
        type: doc.type,
        url: doc.url,
        status: doc.status || bundle.status,
        rejectionReason: bundle.rejectionReason
      });
    }
  }

  for (const row of legacyRows) {
    queueEntries.push({
      userId: row.userId,
      type: row.type,
      url: row.url,
      status: row.status,
      rejectionReason: row.rejectionReason
    });
  }

  for (const d of queueEntries) {
    if (!d.url) continue;
    await VerificationRequest.findOneAndUpdate(
      { userId: d.userId, type: d.type },
      {
        userId: d.userId,
        type: d.type,
        documentUrl: d.url,
        status: d.status === 'APPROVED' ? 'APPROVED' : d.status || 'PENDING',
        rejectionReason: d.rejectionReason || ''
      },
      { upsert: true, new: true }
    );
  }
};

const listVerifications = async ({ status = 'PENDING', page = 1, limit = 20 }) => {
  await syncVerificationQueue();
  const q = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    VerificationRequest.find(q)
      .populate('userId', 'name email verification profile')
      .populate('vehicleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    VerificationRequest.countDocuments(q)
  ]);
  return { items, total, page, limit };
};

const reviewVerification = async (id, status, rejectionReason, adminId) => {
  const req = await VerificationRequest.findById(id).populate('userId');
  if (!req) {
    const err = new Error('Verification request not found');
    err.statusCode = 404;
    throw err;
  }
  req.status = status === 'RESUBMIT' ? 'RESUBMIT' : status;
  req.rejectionReason = rejectionReason || '';
  req.reviewedBy = adminId;
  req.reviewedAt = new Date();
  req.history.push({ status, note: rejectionReason, by: 'ADMIN' });
  await req.save();

  if (req.userId && status === 'APPROVED') {
    req.userId.verification.status = 'APPROVED';
    const { syncDriverSetupAfterApproval } = require('../../utils/driverApprovalSync');
    await syncDriverSetupAfterApproval(req.userId);
    await req.userId.save();
  }
  if (req.userId && status === 'REJECTED') {
    req.userId.verification.status = 'REJECTED';
    await req.userId.save();
  }

  emitToAdmin('verification-reviewed', { id, status });
  return req;
};

// ——— Rides ———
const listRides = async ({ page = 1, limit = 20, status, filter }) => {
  const q = {};
  if (status) q.status = status;
  if (filter === 'women') q['restrictions.womenOnly'] = true;
  if (filter === 'university') q['restrictions.universityOnly'] = true;
  if (filter === 'office') q['restrictions.officeOnly'] = true;
  if (filter === 'recurring') q.rideType = 'RECURRING';

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Ride.find(q)
      .populate('driverId', 'name email phoneNumber accountStatus')
      .populate('vehicleId')
      .sort({ departureDate: -1 })
      .skip(skip)
      .limit(limit),
    Ride.countDocuments(q)
  ]);
  return { items, total, page, limit };
};

const getRideDetail = async (rideId) => {
  const ride = await Ride.findById(rideId)
    .populate('driverId', 'name email phoneNumber rating')
    .populate('vehicleId');
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  const bookings = await Booking.find({ rideId })
    .populate('passengerId', 'name email phoneNumber');
  return { ride, bookings };
};

const adminCancelRide = async (rideId, reason) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  ride.status = 'CANCELLED';
  ride.notes = (ride.notes || '') + ` [Admin cancelled: ${reason || 'policy'}]`;
  await ride.save();

  await Booking.updateMany(
    { rideId, status: { $in: ['PENDING', 'CONFIRMED'] } },
    { $set: { status: 'CANCELLED' } }
  );
  emitToAdmin('ride-cancelled', { rideId });
  return ride;
};

const suspendRide = async (rideId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  ride.status = 'CANCELLED';
  await ride.save();
  return ride;
};

// ——— Bookings ———
const listBookings = async ({ page = 1, limit = 20, status }) => {
  const q = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Booking.find(q)
      .populate('passengerId', 'name email')
      .populate({
        path: 'rideId',
        populate: { path: 'driverId', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(q)
  ]);
  return { items, total, page, limit };
};

const adminCancelBooking = async (bookingId, reason) => {
  const booking = await Booking.findById(bookingId).populate('rideId');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  if (booking.status === 'CONFIRMED' && booking.rideId) {
    const ride = await Ride.findById(booking.rideId._id);
    releaseSeats(ride, booking.seatsBooked);
    await ride.save();
    await reconcileRideSeats(ride._id);
    booking.paymentStatus = 'REFUND_PENDING';
    booking.refund = {
      amount: booking.farePaid,
      reason: reason || 'Admin cancellation',
      status: 'PENDING',
      preparedAt: new Date()
    };
  }
  booking.status = 'CANCELLED';
  booking.cancellation = { by: 'SYSTEM', reason, at: new Date() };
  await booking.save();
  emitToAdmin('booking-cancelled', { bookingId });
  return booking;
};

const prepareBookingRefund = async (bookingId, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }
  booking.paymentStatus = 'REFUND_PENDING';
  booking.refund = {
    amount: booking.farePaid,
    reason: reason || 'Admin refund prep',
    status: 'PENDING',
    preparedAt: new Date()
  };
  await booking.save();
  return booking;
};

// ——— Reports ———
const listReports = async ({ page = 1, limit = 20, status }) => {
  const q = status ? { status } : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Report.find(q)
      .populate('reporterId reportedUserId', 'name email accountStatus trustScore')
      .populate('rideRequestId', 'requestRef status vehicleType agreedFare')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Report.countDocuments(q)
  ]);

  const repeatOffenders = await Report.aggregate([
    { $match: { status: { $ne: 'DISMISSED' } } },
    { $group: { _id: '$reportedUserId', count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return { items, total, page, limit, repeatOffenders };
};

const resolveReport = async (reportId, { status, adminAction, adminNotes }, adminId) => {
  const report = await Report.findById(reportId).populate('reportedUserId');
  if (!report) {
    const err = new Error('Report not found');
    err.statusCode = 404;
    throw err;
  }
  report.status = status;
  report.adminAction = adminAction;
  report.adminNotes = adminNotes || '';
  report.resolvedAt = new Date();
  report.resolvedBy = adminId;
  await report.save();

  if (adminAction === 'SUSPEND' && report.reportedUserId) {
    report.reportedUserId.accountStatus = 'SUSPENDED';
    await report.reportedUserId.save();
  }
  if (adminAction === 'BAN' && report.reportedUserId) {
    report.reportedUserId.accountStatus = 'BANNED';
    await report.reportedUserId.save();
  }
  if (adminAction === 'WARNING' && report.reportedUserId) {
    report.reportedUserId.warnings.push({ reason: adminNotes || report.category });
    report.reportedUserId.trustScore = Math.max(0, report.reportedUserId.trustScore - 10);
    await report.reportedUserId.save();
  }

  emitToAdmin('report-resolved', { reportId, adminAction });
  return report;
};

// ——— Notifications / announcements ———
const sendAnnouncement = async (adminId, payload) => {
  const announcement = await PlatformAnnouncement.create({
    ...payload,
    sentBy: adminId
  });

  const roleFilter =
    payload.targetRoles?.includes('ALL') || !payload.targetRoles?.length
      ? {}
      : { roles: { $in: payload.targetRoles } };

  const users = await User.find(roleFilter).select('_id');
  const notifications = users.map((u) => ({
    userId: u._id,
    type: 'ANNOUNCEMENT',
    title: payload.title,
    body: payload.body,
    data: { announcementId: announcement._id }
  }));
  if (notifications.length) {
    await Notification.insertMany(notifications.slice(0, 500));
  }

  emitToAdmin('announcement-sent', { id: announcement._id });
  return announcement;
};

const getRealtimeSnapshot = async () => {
  const [activeRides, activeBookings, onlineUsers] = await Promise.all([
    Ride.countDocuments({ status: 'ACTIVE' }),
    Booking.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] } }),
    Promise.resolve(0)
  ]);
  return { activeRides, activeBookings, onlineUsers };
};

const getAnalytics = async () => {
  const { getChartData } = require('./adminDashboardService');
  const charts = await getChartData();
  const dau = await User.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  const monthlyRides = await Ride.countDocuments({
    createdAt: { $gte: new Date(new Date().setDate(1)) }
  });
  return { ...charts, dau, monthlyRides };
};

module.exports = {
  listVehicles,
  getVehicleById,
  reviewVehicle,
  listVerifications,
  reviewVerification,
  listRides,
  getRideDetail,
  adminCancelRide,
  suspendRide,
  listBookings,
  adminCancelBooking,
  prepareBookingRefund,
  listReports,
  resolveReport,
  sendAnnouncement,
  getRealtimeSnapshot,
  getAnalytics
};

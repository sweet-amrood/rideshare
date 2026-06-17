const adminAuthService = require('../services/adminAuthService');
const adminDashboardService = require('../services/adminDashboardService');
const adminUsersService = require('../services/adminUsersService');
const adminOperationsService = require('../services/adminOperationsService');
const adminRideRequestService = require('../services/adminRideRequestService');
const adminFareService = require('../services/adminFareService');

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    const err =
      error instanceof Error
        ? error
        : new Error(error?.message || String(error || 'Request failed'));
    err.statusCode = err.statusCode || error?.statusCode || 500;
    next(err);
  }
};

// Auth
exports.login = wrap(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password required');
  }
  const data = await adminAuthService.login(email, password);
  res.json({ success: true, data });
});

exports.me = wrap(async (req, res) => {
  const admin = await adminAuthService.getProfile(req.admin._id);
  res.json({ success: true, data: admin });
});

exports.logout = wrap(async (req, res) => {
  res.json({ success: true, message: 'Logged out. Clear token on client.' });
});

// Dashboard
exports.dashboardOverview = wrap(async (req, res) => {
  const data = await adminDashboardService.getOverview();
  res.json({ success: true, data });
});

exports.dashboardActivity = wrap(async (req, res) => {
  const data = await adminDashboardService.getRecentActivity();
  res.json({ success: true, data });
});

exports.dashboardCharts = wrap(async (req, res) => {
  const data = await adminDashboardService.getChartData();
  res.json({ success: true, data });
});

// Users
exports.listUsers = wrap(async (req, res) => {
  const data = await adminUsersService.listUsers(req.query);
  res.json({ success: true, ...data });
});

exports.getUser = wrap(async (req, res) => {
  const data = await adminUsersService.getUserDetail(req.params.id);
  res.json({ success: true, data });
});

/** One MongoDB document per user — all Cloudinary links in `links` + `documents` */
exports.getUserVerificationRequest = wrap(async (req, res) => {
  const userDocumentService = require('../../services/userDocumentService');
  const bundle = await userDocumentService.getOrCreateRequest(req.params.id);
  const summary = await userDocumentService.getDocumentsByUserId(req.params.id);
  res.json({
    success: true,
    data: {
      request: bundle
        ? {
            _id: bundle._id,
            userId: bundle.userId,
            status: bundle.status,
            rejectionReason: bundle.rejectionReason,
            links: bundle.links,
            documents: bundle.documents,
            createdAt: bundle.createdAt,
            updatedAt: bundle.updatedAt
          }
        : null,
      ...summary
    }
  });
});

exports.updateUserStatus = wrap(async (req, res) => {
  const user = await adminUsersService.updateAccountStatus(
    req.params.id,
    req.body.accountStatus,
    req.body.adminNotes
  );
  res.json({ success: true, data: user });
});

exports.warnUser = wrap(async (req, res) => {
  const user = await adminUsersService.addWarning(req.params.id, req.body.reason);
  res.json({ success: true, data: user });
});

exports.verifyUser = wrap(async (req, res) => {
  const user = await adminUsersService.verifyUserManually(req.params.id);
  res.json({ success: true, data: user });
});

exports.reviewUserDocuments = wrap(async (req, res) => {
  const data = await adminUsersService.reviewUserDocuments(req.params.id, {
    decision: req.body.decision,
    reason: req.body.reason
  });
  res.json({
    success: true,
    message: 'User notified by email and in-app notification. Profile updated.',
    data
  });
});

exports.reviewSingleDocument = wrap(async (req, res) => {
  const data = await adminUsersService.reviewSingleDocument(
    req.params.id,
    req.params.documentType,
    { decision: req.body.decision, reason: req.body.reason },
    req.admin._id
  );
  res.json({
    success: true,
    message: req.body.decision === 'REJECTED' ? 'Document rejected.' : 'Document approved.',
    data
  });
});

exports.finalizeVerificationNotify = wrap(async (req, res) => {
  const data = await adminUsersService.finalizeVerificationNotify(req.params.id, {
    note: req.body.note
  });
  res.json({
    success: true,
    message: 'User notified by email and in-app notification.',
    data
  });
});

exports.trustedRider = wrap(async (req, res) => {
  const user = await adminUsersService.setTrustedRider(req.params.id, req.body.enabled);
  res.json({ success: true, data: user });
});

exports.deleteUser = wrap(async (req, res) => {
  const data = await adminUsersService.deleteUser(req.params.id);
  res.json({ success: true, data });
});

// Drivers
exports.listDrivers = wrap(async (req, res) => {
  const data = await adminRideRequestService.listDriversEnriched(req.query);
  res.json({ success: true, ...data });
});

exports.approveDriver = wrap(async (req, res) => {
  const user = await adminUsersService.approveDriver(req.params.id);
  res.json({ success: true, data: user });
});

exports.rejectDriver = wrap(async (req, res) => {
  const user = await adminUsersService.rejectDriver(req.params.id, req.body.reason);
  res.json({ success: true, data: user });
});

// Vehicles
exports.listVehicles = wrap(async (req, res) => {
  const data = await adminOperationsService.listVehicles(req.query);
  res.json({ success: true, ...data });
});

exports.getVehicle = wrap(async (req, res) => {
  const data = await adminOperationsService.getVehicleById(req.params.id);
  res.json({ success: true, data });
});

exports.reviewVehicle = wrap(async (req, res) => {
  const v = await adminOperationsService.reviewVehicle(
    req.params.id,
    req.body.status,
    req.body.rejectionReason
  );
  res.json({ success: true, data: v });
});

// Verifications
exports.listVerificationUsers = wrap(async (req, res) => {
  const data = await adminUsersService.listVerificationUsers(req.query);
  res.json({ success: true, ...data });
});

exports.listVerifications = wrap(async (req, res) => {
  const data = await adminOperationsService.listVerifications(req.query);
  res.json({ success: true, ...data });
});

exports.reviewVerification = wrap(async (req, res) => {
  const v = await adminOperationsService.reviewVerification(
    req.params.id,
    req.body.status,
    req.body.rejectionReason,
    req.admin._id
  );
  res.json({ success: true, data: v });
});

// Rides
exports.listRides = wrap(async (req, res) => {
  if (req.query.source === 'carpool') {
    const data = await adminOperationsService.listRides(req.query);
    return res.json({ success: true, ...data, source: 'carpool' });
  }
  const data = await adminRideRequestService.listRideRequests({
    page: req.query.page,
    limit: req.query.limit,
    bucket: req.query.bucket || req.query.filter,
    vehicleType: req.query.vehicleType
  });
  res.json({ success: true, ...data, source: 'on_demand' });
});

exports.listRideRequests = wrap(async (req, res) => {
  const data = await adminRideRequestService.listRideRequests(req.query);
  res.json({ success: true, ...data });
});

exports.getRideRequest = wrap(async (req, res) => {
  const data = await adminRideRequestService.getRideRequestDetail(req.params.id);
  res.json({ success: true, data });
});

exports.getRide = wrap(async (req, res) => {
  const data = await adminOperationsService.getRideDetail(req.params.id);
  res.json({ success: true, data });
});

exports.cancelRide = wrap(async (req, res) => {
  const ride = await adminOperationsService.adminCancelRide(req.params.id, req.body.reason);
  res.json({ success: true, data: ride });
});

exports.suspendRide = wrap(async (req, res) => {
  const ride = await adminOperationsService.suspendRide(req.params.id);
  res.json({ success: true, data: ride });
});

// Bookings
exports.listBookings = wrap(async (req, res) => {
  const data = await adminRideRequestService.listBookingsUnified(req.query);
  res.json({ success: true, ...data });
});

exports.cancelBooking = wrap(async (req, res) => {
  const b = await adminOperationsService.adminCancelBooking(req.params.id, req.body.reason);
  res.json({ success: true, data: b });
});

exports.prepareRefund = wrap(async (req, res) => {
  const b = await adminOperationsService.prepareBookingRefund(req.params.id, req.body.reason);
  res.json({ success: true, data: b });
});

// Reports
exports.listReports = wrap(async (req, res) => {
  const data = await adminOperationsService.listReports(req.query);
  res.json({ success: true, ...data });
});

exports.resolveReport = wrap(async (req, res) => {
  const r = await adminOperationsService.resolveReport(req.params.id, req.body, req.admin._id);
  res.json({ success: true, data: r });
});

// Analytics & realtime
exports.analytics = wrap(async (req, res) => {
  const data = await adminOperationsService.getAnalytics();
  res.json({ success: true, data });
});

exports.realtimeSnapshot = wrap(async (req, res) => {
  const data = await adminOperationsService.getRealtimeSnapshot();
  res.json({ success: true, data });
});

// Notifications
exports.sendAnnouncement = wrap(async (req, res) => {
  const a = await adminOperationsService.sendAnnouncement(req.admin._id, req.body);
  res.json({ success: true, data: a });
});

exports.getFareSettings = wrap(async (req, res) => {
  const data = await adminFareService.getFareSettings();
  res.json({ success: true, data });
});

exports.updateFareSettings = wrap(async (req, res) => {
  const data = await adminFareService.updateFareSettings(req.body);
  res.json({ success: true, data, message: 'Fare factors updated' });
});

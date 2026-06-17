const express = require('express');
const ctrl = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminAuth');

const router = express.Router();

// Public — login only (no signup); do not attach user JWT on this request
router.post('/auth/login', ctrl.login);

// Protected admin API
router.use(adminProtect);

router.get('/auth/me', ctrl.me);
router.post('/auth/logout', ctrl.logout);

router.get('/dashboard/overview', ctrl.dashboardOverview);
router.get('/dashboard/activity', ctrl.dashboardActivity);
router.get('/dashboard/charts', ctrl.dashboardCharts);

router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.patch('/users/:id/status', ctrl.updateUserStatus);
router.post('/users/:id/warn', ctrl.warnUser);
router.post('/users/:id/verify', ctrl.verifyUser);
router.post('/users/:id/review-documents', ctrl.reviewUserDocuments);
router.post('/users/:id/documents/notify', ctrl.finalizeVerificationNotify);
router.post('/users/:id/documents/:documentType/review', ctrl.reviewSingleDocument);
router.get('/users/:id/verification-request', ctrl.getUserVerificationRequest);
router.patch('/users/:id/trusted-rider', ctrl.trustedRider);
router.delete('/users/:id', ctrl.deleteUser);

router.get('/drivers', ctrl.listDrivers);
router.post('/drivers/:id/approve', ctrl.approveDriver);
router.post('/drivers/:id/reject', ctrl.rejectDriver);

router.get('/vehicles', ctrl.listVehicles);
router.get('/vehicles/:id', ctrl.getVehicle);
router.patch('/vehicles/:id/review', ctrl.reviewVehicle);

router.get('/verifications/users', ctrl.listVerificationUsers);
router.get('/verifications', ctrl.listVerifications);
router.patch('/verifications/:id/review', ctrl.reviewVerification);

router.get('/ride-requests', ctrl.listRideRequests);
router.get('/ride-requests/:id', ctrl.getRideRequest);
router.get('/rides', ctrl.listRides);
router.get('/rides/:id', ctrl.getRide);
router.patch('/rides/:id/cancel', ctrl.cancelRide);
router.patch('/rides/:id/suspend', ctrl.suspendRide);

router.get('/bookings', ctrl.listBookings);
router.patch('/bookings/:id/cancel', ctrl.cancelBooking);
router.post('/bookings/:id/refund/prepare', ctrl.prepareRefund);

router.get('/reports', ctrl.listReports);
router.patch('/reports/:id/resolve', ctrl.resolveReport);

router.get('/analytics', ctrl.analytics);
router.get('/realtime/snapshot', ctrl.realtimeSnapshot);

router.post('/notifications/announce', ctrl.sendAnnouncement);

router.get('/settings/fare', ctrl.getFareSettings);
router.patch('/settings/fare', ctrl.updateFareSettings);

module.exports = router;

const bookingService = require('../services/bookingService');

const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBookingRequest(req.user, req.body);
    return res.status(201).json({
      success: true,
      message: 'Booking request submitted. Waiting for driver approval.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

const updateBookingStatus = async (req, res, next) => {
  try {
    const booking = await bookingService.respondToBooking(
      req.user,
      req.params.id,
      req.body.status
    );
    return res.status(200).json({
      success: true,
      message: `Booking ${req.body.status.toLowerCase()} successfully.`,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.user, req.params.id, {
      reason: req.body.reason
    });
    return res.status(200).json({
      success: true,
      message: 'Booking cancelled.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

const prepareRefund = async (req, res, next) => {
  try {
    const booking = await bookingService.prepareRefund(req.user, req.params.id, {
      reason: req.body.reason
    });
    return res.status(200).json({
      success: true,
      message: 'Refund prepared for processing.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

const completeRide = async (req, res, next) => {
  try {
    const result = await bookingService.completeRide(req.user, req.params.rideId);
    return res.status(200).json({
      success: true,
      message: 'Ride marked complete.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getBookingHistory = async (req, res, next) => {
  try {
    const { role, status, page, limit } = req.query;
    const result = await bookingService.getBookingHistory(req.user, {
      role: role || 'passenger',
      status,
      page,
      limit
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.user, req.params.id);
    return res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

const getLiveSeats = async (req, res, next) => {
  try {
    const snapshot = await bookingService.getLiveSeatSnapshot(req.params.rideId);
    if (!snapshot) {
      res.status(404);
      throw new Error('Ride not found');
    }
    return res.status(200).json({ success: true, data: snapshot });
  } catch (error) {
    next(error);
  }
};

const getCarpoolLiveMap = async (req, res, next) => {
  try {
    const { getCarpoolLiveMap: fetchMap } = require('../services/carpoolLiveMapService');
    const data = await fetchMap(req.params.rideId, req.user._id);
    if (!data) {
      res.status(404);
      throw new Error('Ride not found');
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getMyTrips = async (req, res, next) => {
  try {
    const data = await bookingService.getMyTrips(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getIncomingBookings = async (req, res, next) => {
  try {
    if (!req.user.roles?.includes('DRIVER')) {
      res.status(403);
      throw new Error('Driver role required');
    }
    const pending = await bookingService.getIncomingForDriver(req.user);
    return res.status(200).json({
      success: true,
      count: pending.length,
      data: pending
    });
  } catch (error) {
    next(error);
  }
};

const getActiveCommitment = async (req, res, next) => {
  try {
    const { getPassengerTripCommitment, getDriverTripCommitment } = require('../services/userTripGuard');
    const asDriver =
      req.query.role === 'driver' ||
      (req.user.roles?.includes('DRIVER') && !req.user.roles?.includes('RIDER'));
    const commitment = asDriver
      ? await getDriverTripCommitment(req.user._id)
      : await getPassengerTripCommitment(req.user._id);
    return res.status(200).json({ success: true, data: commitment });
  } catch (error) {
    next(error);
  }
};

const getFareQuote = async (req, res, next) => {
  try {
    const quote = await bookingService.getCarpoolFareQuote(req.params.rideId, req.body);
    return res.status(200).json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
};

const getStartRideCandidates = async (req, res, next) => {
  try {
    const data = await bookingService.getStartRideCandidates(req.user, req.params.rideId, req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const startRide = async (req, res, next) => {
  try {
    const result = await bookingService.startRide(req.user, req.params.rideId, req.body);
    return res.status(200).json({
      success: true,
      message: result.alreadyStarted ? 'Ride already in progress' : 'Ride started',
      data: result
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = {
  createBooking,
  updateBookingStatus,
  cancelBooking,
  prepareRefund,
  completeRide,
  getBookingHistory,
  getBookingById,
  getLiveSeats,
  getCarpoolLiveMap,
  getMyTrips,
  getIncomingBookings,
  getActiveCommitment,
  getFareQuote,
  getStartRideCandidates,
  startRide
};

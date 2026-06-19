const Ride = require('../models/Ride');
const User = require('../models/User');
const rideService = require('../services/rideService');
const { seatSummary } = require('../utils/rideSeats');
const {
  getChatMessages,
  saveChatMessage
} = require('../services/carpoolChatService');

/**
 * @route POST /api/v1/rides/offer
 */
const offerRide = async (req, res, next) => {
  try {
    const result = await rideService.offerRide(req.user._id, req.body);
    return res.status(201).json({
      success: true,
      message:
        result.count > 1
          ? `${result.count} recurring rides published`
          : 'Ride offered successfully',
      ride: result.primary,
      rides: result.rides,
      count: result.count
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

/**
 * @route POST /api/v1/rides/estimate-price
 */
const estimatePrice = async (req, res, next) => {
  try {
    const pricing = await rideService.estimatePrice(req.body);
    return res.status(200).json({ success: true, pricing });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/rides/search
 */
const searchRides = async (req, res, next) => {
  try {
    const passenger = await User.findById(req.user._id).select(
      'profile gender communities roles'
    );
    const rides = await rideService.searchRides(req.body, passenger);
    return res.status(200).json({
      success: true,
      count: rides.length,
      data: rides
    });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

/**
 * @route GET /api/v1/rides/my-offers
 */
const getMyOffers = async (req, res, next) => {
  try {
    const rides = await rideService.getMyOffers(req.user._id, req.query.status);
    return res.status(200).json({ success: true, count: rides.length, data: rides });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/rides/:id
 */
const getRideById = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('driverId', 'name rating verification phoneNumber profile')
      .populate('vehicleId');

    if (!ride) {
      res.status(404);
      throw new Error('Ride not found');
    }

    return res.status(200).json({
      success: true,
      ride,
      seatSummary: seatSummary(ride)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/v1/rides/:id
 */
const updateRide = async (req, res, next) => {
  try {
    const ride = await rideService.updateRide(req.params.id, req.user._id, req.body);
    return res.status(200).json({ success: true, ride });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

/**
 * @route DELETE /api/v1/rides/:id
 */
const cancelRide = async (req, res, next) => {
  try {
    const cancelSeries = req.query.series === 'true';
    const result = await rideService.cancelRide(req.params.id, req.user._id, cancelSeries);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const getRideChat = async (req, res, next) => {
  try {
    const messages = await getChatMessages(req.params.id, req.user._id);
    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

const sendRideChat = async (req, res, next) => {
  try {
    const message = await saveChatMessage(
      req.params.id,
      req.user._id,
      req.user.name,
      req.body.message
    );
    const { emitToRide } = require('../services/realtimeService');
    emitToRide(req.params.id, 'chat-msg-received', message);
    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    if (error.statusCode) res.status(error.statusCode);
    next(error);
  }
};

module.exports = {
  offerRide,
  estimatePrice,
  searchRides,
  getMyOffers,
  getRideById,
  getRideChat,
  sendRideChat,
  updateRide,
  cancelRide
};

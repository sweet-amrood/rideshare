const rideRequestService = require('../services/rideRequestService');
const activeRideService = require('../services/activeRideService');
const rideRequestFeedbackService = require('../services/rideRequestFeedbackService');
const { processDueSearchCancellations } = require('../services/rideRequestExpiryService');

const estimateFare = async (req, res, next) => {
  try {
    const { originLng, originLat, destLng, destLat, vehicleType, distanceKm, hasAC, preferAC } =
      req.body;
    const estimate = await rideRequestService.estimateTripFare({
      originCoords: [originLng, originLat],
      destCoords: [destLng, destLat],
      vehicleType: vehicleType || 'BIKE',
      distanceKm,
      hasAC: !!(hasAC || preferAC),
      useRoadRouting: false
    });
    return res.json({ success: true, data: estimate });
  } catch (e) {
    next(e);
  }
};

const getActive = async (req, res, next) => {
  try {
    await processDueSearchCancellations(req.user._id);
    const request = await activeRideService.getPassengerActiveRide(req.user._id);
    return res.json({ success: true, data: request });
  } catch (e) {
    next(e);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const items = await activeRideService.getPassengerRideHistory(req.user._id, {
      status: req.query.status,
      limit: parseInt(req.query.limit, 10) || 50
    });
    return res.json({ success: true, data: { items, total: items.length } });
  } catch (e) {
    next(e);
  }
};

const getCurrent = async (req, res, next) => {
  try {
    await processDueSearchCancellations(req.user._id);
    const driverRide = await activeRideService.getDriverActiveRide(req.user._id);
    if (driverRide) return res.json({ success: true, data: driverRide });
    const passengerRide = await activeRideService.getPassengerActiveRide(req.user._id);
    return res.json({ success: true, data: passengerRide });
  } catch (e) {
    next(e);
  }
};

const createRequest = async (req, res, next) => {
  try {
    const data = await rideRequestService.createRideRequest(req.user._id, req.body);
    return res.status(201).json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const getRequest = async (req, res, next) => {
  try {
    const data = await rideRequestService.getRequestForPassenger(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const expandWave = async (req, res, next) => {
  try {
    const data = await rideRequestService.expandSearchWave(
      req.params.id,
      req.user._id,
      req.body.radiusMeters
    );
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const updateSearchFare = async (req, res, next) => {
  try {
    const data = await rideRequestService.updatePassengerSearchFare(
      req.params.id,
      req.user._id,
      req.body.passengerOfferedFare ?? req.body.fare
    );
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const listIncoming = async (req, res, next) => {
  try {
    const data = await rideRequestService.listIncomingForDriver(req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const driverRespond = async (req, res, next) => {
  try {
    const request = await rideRequestService.driverRespond(req.params.id, req.user._id, req.body);
    return res.json({ success: true, data: request });
  } catch (e) {
    next(e);
  }
};

const passengerRespondOffer = async (req, res, next) => {
  try {
    const request = await rideRequestService.passengerRespondToOffer(
      req.params.id,
      req.user._id,
      req.params.offerId,
      req.body
    );
    return res.json({ success: true, data: request });
  } catch (e) {
    next(e);
  }
};

const updateLocation = async (req, res, next) => {
  try {
    const data = await activeRideService.updateDriverLocation(
      req.params.id,
      req.user._id,
      req.body
    );
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const pingHere = async (req, res, next) => {
  try {
    const data = await activeRideService.driverPingHere(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const startRide = async (req, res, next) => {
  try {
    const data = await activeRideService.startRide(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const completeRide = async (req, res, next) => {
  try {
    const data = await activeRideService.completeRide(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const cancelRide = async (req, res, next) => {
  try {
    const data = await activeRideService.cancelRide(req.params.id, req.user._id, req.body);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const dismissSession = async (req, res, next) => {
  try {
    const data = await activeRideService.dismissCompletedSession(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const updateFare = async (req, res, next) => {
  try {
    const data = await activeRideService.updateAgreedFare(
      req.params.id,
      req.user._id,
      req.body.fare
    );
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const getChat = async (req, res, next) => {
  try {
    const messages = await activeRideService.getChatMessages(req.params.id, req.user._id);
    return res.json({ success: true, data: { messages } });
  } catch (e) {
    next(e);
  }
};

const sendChat = async (req, res, next) => {
  try {
    const payload = await activeRideService.saveChatMessage(
      req.params.id,
      req.user._id,
      req.user.name,
      req.body.message
    );
    return res.status(201).json({ success: true, data: payload });
  } catch (e) {
    next(e);
  }
};

const markChatRead = async (req, res, next) => {
  try {
    const data = await activeRideService.markChatRead(req.params.id, req.user._id);
    return res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

const submitReview = async (req, res, next) => {
  try {
    const review = await rideRequestFeedbackService.submitReview(
      req.params.id,
      req.user._id,
      req.body
    );
    return res.status(201).json({ success: true, data: review });
  } catch (e) {
    next(e);
  }
};

const submitReport = async (req, res, next) => {
  try {
    const report = await rideRequestFeedbackService.submitReport(
      req.params.id,
      req.user._id,
      req.body
    );
    return res.status(201).json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getActive,
  getHistory,
  getCurrent,
  estimateFare,
  createRequest,
  getRequest,
  expandWave,
  updateSearchFare,
  listIncoming,
  driverRespond,
  passengerRespondOffer,
  updateLocation,
  pingHere,
  startRide,
  completeRide,
  cancelRide,
  dismissSession,
  updateFare,
  getChat,
  sendChat,
  markChatRead,
  submitReview,
  submitReport
};

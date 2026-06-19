const RideRequest = require('../models/RideRequest');
const Review = require('../models/Review');
const Chat = require('../models/Chat');
const User = require('../models/User');
const {
  RIDE_REQUEST_STATUS,
  RIDE_PHASE,
  OFFER_VISIBLE_SECONDS,
  PICKUP_WAIT_MINUTES,
  AT_PICKUP_RADIUS_METERS
} = require('../constants/rideRequest');
const { formatDistance, formatDuration } = require('../utils/geo');
const { emitRideRequestEvent, emitToRideRequest } = require('./realtimeService');
const { notifyInApp } = require('./rideRequestNotify');
const { driverEtaMinutes } = require('./rideRequestHelpers');
const { haversineRoadMeters } = require('./tripMetricsService');

const toPoint = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });

const ACTIVE_STATUSES = [
  RIDE_REQUEST_STATUS.ACCEPTED,
  RIDE_REQUEST_STATUS.IN_PROGRESS
];

const REQUEST_POPULATE = [
  { path: 'passengerId', select: 'name profile phoneNumber' },
  { path: 'acceptedDriverId', select: 'name profile phoneNumber driverAvailability' }
];

/** Works with Mongoose Query or plain document (re-fetches by id). */
const populateRequest = async (input) => {
  if (!input) return null;
  if (typeof input.populate === 'function' && typeof input.exec === 'function') {
    return input.populate(REQUEST_POPULATE);
  }
  const id = input._id || input;
  return RideRequest.findById(id).populate(REQUEST_POPULATE);
};

const resolveDriverCoordinates = (r) => {
  if (r.driverLiveLocation?.coordinates?.length === 2) {
    return r.driverLiveLocation.coordinates;
  }
  const avail = r.acceptedDriverId?.driverAvailability?.location?.coordinates;
  if (avail?.length === 2) return avail;
  return null;
};

const markViewerClosed = async (requestId, userId, role) => {
  const patch =
    role === 'DRIVER' ? { driverClosedAt: new Date() } : { passengerClosedAt: new Date() };
  await RideRequest.updateOne({ _id: requestId }, patch);
};

const passengerMaySeeCompleted = async (ride, passengerId) => {
  if (!ride || ride.passengerClosedAt) return false;
  const reviewed = await Review.exists({
    rideRequestId: ride._id,
    reviewerId: passengerId
  });
  if (reviewed) {
    await RideRequest.updateOne({ _id: ride._id }, { passengerClosedAt: new Date() });
    return false;
  }
  return true;
};

const formatSession = (doc, viewerId, extras = {}) => {
  const r = doc.toObject ? doc.toObject() : doc;
  const [pLng, pLat] = r.pickup?.location?.coordinates || [];
  const [dLng, dLat] = r.dropoff?.location?.coordinates || [];
  let driverDistM = null;
  let driverEta = null;
  const driverCoords = resolveDriverCoordinates(r);
  if (driverCoords?.length === 2 && pLat != null) {
    const [dlng, dlat] = driverCoords;
    driverDistM = haversineRoadMeters({ lat: pLat, lng: pLng }, { lat: dlat, lng: dlng });
    driverEta = driverEtaMinutes(Math.max(driverDistM / 1000, 0.05), r.vehicleType);
  }
  return {
    ...r,
    agreedFare: r.agreedFare ?? r.passengerOfferedFare,
    viewerRole:
      String(r.passengerId?._id || r.passengerId) === String(viewerId)
        ? 'PASSENGER'
        : String(r.acceptedDriverId?._id || r.acceptedDriverId) === String(viewerId)
          ? 'DRIVER'
          : null,
    driverDistanceText: driverDistM != null ? formatDistance(driverDistM).text : null,
    driverEtaMinutes: driverEta,
    isViewerDriver: String(r.acceptedDriverId?._id || r.acceptedDriverId) === String(viewerId),
    isViewerPassenger: String(r.passengerId?._id || r.passengerId) === String(viewerId),
    viewerHasReviewed: extras.viewerHasReviewed ?? false,
    viewerSessionClosed: extras.viewerSessionClosed ?? false
  };
};

const getDriverActiveRide = async (driverId) => {
  let ride = await populateRequest(
    RideRequest.findOne({
      acceptedDriverId: driverId,
      status: { $in: ACTIVE_STATUSES }
    }).sort({ updatedAt: -1 })
  );
  if (!ride) {
    ride = await populateRequest(
      RideRequest.findOne({
        acceptedDriverId: driverId,
        status: RIDE_REQUEST_STATUS.COMPLETED,
        driverClosedAt: null,
        completedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      }).sort({ completedAt: -1 })
    );
  }
  return ride ? formatSession(ride, driverId) : null;
};

const getPassengerRideHistory = async (passengerId, { status, limit = 50 } = {}) => {
  const filter = { passengerId };
  if (status) {
    filter.status = status;
  } else {
    filter.status = {
      $in: [RIDE_REQUEST_STATUS.COMPLETED, RIDE_REQUEST_STATUS.CANCELLED]
    };
  }
  const rides = await RideRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, limit)))
    .populate('acceptedDriverId', 'name profile phoneNumber')
    .lean();

  return rides.map((r) => ({
    _id: r._id,
    kind: 'RIDE_REQUEST',
    requestRef: r.requestRef,
    status: r.status,
    vehicleType: r.vehicleType,
    agreedFare: r.agreedFare ?? r.passengerOfferedFare,
    pickup: r.pickup,
    dropoff: r.dropoff,
    driver: r.acceptedDriverId,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    cancelledAt: r.cancelledAt
  }));
};

const getPassengerActiveRide = async (passengerId) => {
  const { processDueSearchCancellations } = require('./rideRequestExpiryService');
  await processDueSearchCancellations(passengerId);

  let ride = await populateRequest(
    RideRequest.findOne({ passengerId, status: { $in: ACTIVE_STATUSES } }).sort({ createdAt: -1 })
  );
  if (!ride) {
    ride = await populateRequest(
      RideRequest.findOne({
        passengerId,
        status: { $in: [RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING] },
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 })
    );
  }
  if (!ride) {
    const completed = await populateRequest(
      RideRequest.findOne({
        passengerId,
        status: RIDE_REQUEST_STATUS.COMPLETED,
        passengerClosedAt: null,
        completedAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      }).sort({ completedAt: -1 })
    );
    if (completed && (await passengerMaySeeCompleted(completed, passengerId))) {
      ride = completed;
    }
  }
  if (!ride) return null;
  const viewerHasReviewed = await Review.exists({
    rideRequestId: ride._id,
    reviewerId: passengerId
  });
  const viewerSessionClosed =
    Boolean(ride.passengerClosedAt) || (ride.status === RIDE_REQUEST_STATUS.COMPLETED && viewerHasReviewed);
  if (viewerSessionClosed && ride.status === RIDE_REQUEST_STATUS.COMPLETED) {
    return null;
  }
  return formatSession(ride, passengerId, { viewerHasReviewed: Boolean(viewerHasReviewed) });
};

const assertParticipant = (request, userId) => {
  const isPassenger = String(request.passengerId._id || request.passengerId) === String(userId);
  const isDriver = String(request.acceptedDriverId?._id || request.acceptedDriverId) === String(userId);
  if (!isPassenger && !isDriver) {
    const err = new Error('Not allowed on this ride');
    err.statusCode = 403;
    throw err;
  }
  return isDriver ? 'DRIVER' : 'PASSENGER';
};

const updateDriverLocation = async (requestId, driverId, { lat, lng }) => {
  const request = await RideRequest.findById(requestId);
  if (!request || String(request.acceptedDriverId) !== String(driverId)) {
    throw new Error('Active ride not found');
  }
  if (!ACTIVE_STATUSES.includes(request.status)) {
    throw new Error('Ride is not active');
  }

  request.driverLiveLocation = toPoint(lng, lat);
  const [pLng, pLat] = request.pickup.location.coordinates;
  const distM = haversineRoadMeters({ lat: pLat, lng: pLng }, { lat, lng });

  if (request.phase === RIDE_PHASE.MATCHED || request.phase === RIDE_PHASE.EN_ROUTE) {
    request.phase = distM <= AT_PICKUP_RADIUS_METERS ? RIDE_PHASE.AT_PICKUP : RIDE_PHASE.EN_ROUTE;
  }

  await request.save();

  const payload = {
    requestId: request._id,
    lat,
    lng,
    phase: request.phase,
    distanceToPickupM: Math.round(distM),
    distanceText: formatDistance(distM).text,
    etaMinutes: driverEtaMinutes(Math.max(distM / 1000, 0.05), request.vehicleType)
  };

  emitRideRequestEvent(String(request.passengerId), 'ride-request:driver-location', payload);
  emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:driver-location', payload);
  emitToRideRequest(requestId, 'ride-request:driver-location', payload);

  return formatSession(await populateRequest(RideRequest.findById(requestId)), driverId);
};

const driverPingHere = async (requestId, driverId) => {
  const request = await RideRequest.findById(requestId);
  if (!request || String(request.acceptedDriverId) !== String(driverId)) {
    throw new Error('Active ride not found');
  }

  const [pLng, pLat] = request.pickup.location.coordinates;
  const [dLng, dLat] = request.driverLiveLocation?.coordinates || [];
  if (dLat == null) throw new Error('Update your location first');

  const distM = haversineRoadMeters({ lat: pLat, lng: pLng }, { lat: dLat, lng: dLng });
  if (distM > AT_PICKUP_RADIUS_METERS * 3) {
    throw new Error('You must be near the pickup point to ping the passenger');
  }

  request.phase = RIDE_PHASE.WAITING_PASSENGER;
  request.pickupPingAt = new Date();
  request.waitCountdownEndsAt = new Date(Date.now() + PICKUP_WAIT_MINUTES * 60 * 1000);
  await request.save();

  const payload = {
    requestId: request._id,
    waitCountdownEndsAt: request.waitCountdownEndsAt,
    message: 'Driver is here — please come to pickup'
  };

  emitRideRequestEvent(String(request.passengerId), 'ride-request:driver-here', payload);
  emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:driver-here', payload);

  await notifyInApp(request.passengerId, 'RIDE_REQUEST_MATCHED', request, {
    title: 'Driver is here',
    body: `Your driver is at the pickup. You have ${PICKUP_WAIT_MINUTES} minutes.`,
    data: { requestId: request._id, phase: request.phase }
  });

  return formatSession(await populateRequest(RideRequest.findById(requestId)), driverId);
};

const startRide = async (requestId, driverId) => {
  const request = await RideRequest.findById(requestId);
  if (!request || String(request.acceptedDriverId) !== String(driverId)) {
    throw new Error('Active ride not found');
  }

  request.status = RIDE_REQUEST_STATUS.IN_PROGRESS;
  request.phase = RIDE_PHASE.IN_PROGRESS;
  request.startedAt = new Date();
  await request.save();

  const payload = { requestId: request._id, startedAt: request.startedAt };
  emitRideRequestEvent(String(request.passengerId), 'ride-request:started', payload);
  emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:started', payload);

  await notifyInApp(request.passengerId, 'RIDE_REQUEST_STARTED', request, {
    title: 'Ride started',
    body: 'Your trip is in progress. Track the driver on the map.',
    data: { requestId: request._id }
  });

  return formatSession(await populateRequest(RideRequest.findById(requestId)), driverId);
};

const completeRide = async (requestId, userId) => {
  const request = await populateRequest(RideRequest.findById(requestId));
  const role = assertParticipant(request, userId);

  if (request.status === RIDE_REQUEST_STATUS.COMPLETED) {
    return formatSession(request, userId);
  }

  if (![RIDE_REQUEST_STATUS.ACCEPTED, RIDE_REQUEST_STATUS.IN_PROGRESS].includes(request.status)) {
    throw new Error('Ride cannot be completed in its current state');
  }

  request.status = RIDE_REQUEST_STATUS.COMPLETED;
  request.phase = RIDE_PHASE.COMPLETED;
  request.completedAt = new Date();
  request.completedBy = role;
  await request.save();

  const base = {
    requestId: request._id,
    completedBy: role,
    message:
      role === 'DRIVER'
        ? 'Driver ended the ride. Confirm on your side to finish.'
        : 'Passenger confirmed the ride is complete.'
  };
  emitRideRequestEvent(String(request.passengerId), 'ride-request:completed', {
    ...base,
    request: formatSession(request, request.passengerId)
  });
  if (request.acceptedDriverId) {
    emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:completed', {
      ...base,
      request: formatSession(request, request.acceptedDriverId)
    });
  }

  const completeBody =
    role === 'DRIVER'
      ? 'Driver ended the ride. Confirm on your side to finish.'
      : 'Passenger confirmed the ride is complete.';
  await notifyInApp(request.passengerId, 'RIDE_REQUEST_COMPLETED', request, {
    title: 'Ride completed',
    body: completeBody,
    data: { requestId: request._id }
  });
  if (request.acceptedDriverId) {
    await notifyInApp(request.acceptedDriverId, 'RIDE_REQUEST_COMPLETED', request, {
      title: 'Ride completed',
      body: completeBody,
      data: { requestId: request._id }
    });
  }

  return formatSession(request, userId);
};

const dismissCompletedSession = async (requestId, userId) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');
  const role = assertParticipant(await populateRequest(request), userId);
  if (request.status !== RIDE_REQUEST_STATUS.COMPLETED) {
    throw new Error('Only completed rides can be dismissed');
  }
  await markViewerClosed(requestId, userId, role);
  return { requestId, dismissed: true };
};

const cancelRide = async (requestId, userId, { reason } = {}) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');

  const isPassenger = String(request.passengerId) === String(userId);
  const isDriver =
    request.acceptedDriverId && String(request.acceptedDriverId) === String(userId);

  if (!isPassenger && !isDriver) {
    const err = new Error('Not allowed on this ride');
    err.statusCode = 403;
    throw err;
  }

  const passengerCancellable = [
    RIDE_REQUEST_STATUS.SEARCHING,
    RIDE_REQUEST_STATUS.OFFERS_PENDING,
    RIDE_REQUEST_STATUS.ACCEPTED
  ];
  const driverCancellable = [
    RIDE_REQUEST_STATUS.SEARCHING,
    RIDE_REQUEST_STATUS.OFFERS_PENDING,
    RIDE_REQUEST_STATUS.ACCEPTED,
    RIDE_REQUEST_STATUS.IN_PROGRESS
  ];
  const cancellable = isPassenger ? passengerCancellable : driverCancellable;
  if (!cancellable.includes(request.status)) {
    const msg = isPassenger
      ? 'You can only cancel before the driver starts the trip'
      : 'This ride can no longer be cancelled';
    throw new Error(msg);
  }

  const wasActiveSearch =
    isPassenger &&
    [RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING].includes(request.status);

  request.status = RIDE_REQUEST_STATUS.CANCELLED;
  request.cancelledAt = new Date();
  request.cancelledBy = isPassenger ? 'PASSENGER' : 'DRIVER';
  if (reason) request.cancelReason = String(reason).trim().slice(0, 300);
  await request.save();

  const payload = { requestId: request._id, cancelledBy: request.cancelledBy };
  emitRideRequestEvent(String(request.passengerId), 'ride-request:cancelled', payload);
  if (request.acceptedDriverId) {
    emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:cancelled', payload);
  }

  if (wasActiveSearch) {
    const { notifyDriversRequestCancelled } = require('./rideRequestService');
    notifyDriversRequestCancelled(request);
  }

  const cancelBody = isPassenger
    ? 'The passenger cancelled this ride request.'
    : 'The driver cancelled this ride.';
  const otherId = isPassenger ? request.acceptedDriverId : request.passengerId;
  if (otherId) {
    await notifyInApp(otherId, 'RIDE_REQUEST_CANCELLED', request, {
      title: 'Ride cancelled',
      body: cancelBody,
      data: { requestId: request._id }
    });
  }

  return { requestId: request._id, status: request.status };
};

const updateAgreedFare = async (requestId, userId, fare) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');
  const role = assertParticipant(await populateRequest(request), userId);

  const amount = parseInt(fare, 10);
  if (!amount || amount < request.minFare || amount > request.maxFare) {
    throw new Error(`Fare must be between Rs.${request.minFare} and Rs.${request.maxFare}`);
  }

  request.agreedFare = amount;
  request.passengerOfferedFare = amount;
  await request.save();

  emitRideRequestEvent(String(request.passengerId), 'ride-request:fare-updated', {
    requestId,
    agreedFare: amount,
    by: role
  });
  emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:fare-updated', {
    requestId,
    agreedFare: amount,
    by: role
  });

  return formatSession(await populateRequest(RideRequest.findById(requestId)), userId);
};

const formatChatMessage = (m, viewerId) => {
  const mine = String(m.senderId) === String(viewerId);
  const otherDelivered = (m.deliveredTo || []).some((id) => String(id) !== String(m.senderId));
  const otherRead = (m.readBy || []).some((id) => String(id) !== String(m.senderId));
  let status = 'sent';
  if (mine) {
    if (otherRead) status = 'read';
    else if (otherDelivered) status = 'delivered';
  }
  return {
    _id: m._id,
    rideRequestId: m.rideRequestId,
    senderId: m.senderId,
    senderName: m.senderName || '',
    message: m.message,
    createdAt: m.createdAt,
    status,
    isMine: mine
  };
};

const markMessageDelivered = async (messageId, recipientId) => {
  const msg = await Chat.findById(messageId);
  if (!msg || String(msg.senderId) === String(recipientId)) return null;
  const already = (msg.deliveredTo || []).some((id) => String(id) === String(recipientId));
  if (!already) {
    msg.deliveredTo = [...(msg.deliveredTo || []), recipientId];
    await msg.save();
  }
  const payload = {
    messageId: msg._id,
    rideRequestId: msg.rideRequestId,
    status: 'delivered'
  };
  emitRideRequestEvent(String(msg.senderId), 'ride-request:chat-status', payload);
  emitToRideRequest(msg.rideRequestId, 'ride-request:chat-status', payload);
  return payload;
};

const markChatRead = async (requestId, userId) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');
  assertParticipant(await populateRequest(request), userId);

  const unread = await Chat.find({
    rideRequestId: requestId,
    senderId: { $ne: userId }
  });

  const updatedIds = [];
  for (const msg of unread) {
    const hasRead = (msg.readBy || []).some((id) => String(id) === String(userId));
    if (hasRead) continue;
    msg.readBy = [...(msg.readBy || []), userId];
    if (!(msg.deliveredTo || []).some((id) => String(id) === String(userId))) {
      msg.deliveredTo = [...(msg.deliveredTo || []), userId];
    }
    await msg.save();
    updatedIds.push(msg._id);
  }

  const otherId =
    String(request.passengerId) === String(userId)
      ? request.acceptedDriverId
      : request.passengerId;
  const payload = { requestId, readerId: userId, messageIds: updatedIds };
  if (otherId) emitRideRequestEvent(String(otherId), 'ride-request:chat-read', payload);
  emitToRideRequest(requestId, 'ride-request:chat-read', payload);
  return { count: updatedIds.length };
};

const getChatMessages = async (requestId, userId) => {
  const request = await RideRequest.findById(requestId);
  if (!request) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  assertParticipant(await populateRequest(request), userId);
  const messages = await Chat.find({ rideRequestId: requestId })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();
  return messages.map((m) => formatChatMessage(m, userId));
};

const saveChatMessage = async (requestId, senderId, senderName, message) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');
  if (
    String(request.passengerId) !== String(senderId) &&
    String(request.acceptedDriverId) !== String(senderId)
  ) {
    throw new Error('Not a participant');
  }
  if (![RIDE_REQUEST_STATUS.ACCEPTED, RIDE_REQUEST_STATUS.IN_PROGRESS].includes(request.status)) {
    throw new Error('Chat only available during active ride');
  }

  const doc = await Chat.create({
    rideRequestId: requestId,
    senderId,
    senderName: senderName || '',
    message: String(message).trim()
  });

  const payload = {
    _id: doc._id,
    rideRequestId: requestId,
    senderId,
    senderName: senderName || '',
    message: doc.message,
    createdAt: doc.createdAt,
    status: 'sent',
    isMine: false
  };

  emitRideRequestEvent(String(request.passengerId), 'ride-request:chat', payload);
  emitRideRequestEvent(String(request.acceptedDriverId), 'ride-request:chat', payload);
  emitToRideRequest(requestId, 'ride-request:chat', payload);

  const recipientId =
    String(senderId) === String(request.passengerId)
      ? request.acceptedDriverId
      : request.passengerId;
  if (recipientId) {
    await notifyInApp(recipientId, 'RIDE_REQUEST_CHAT', request, {
      title: 'New ride message',
      body: `${senderName || 'Rider'}: ${doc.message.slice(0, 80)}`,
      data: { requestId, senderId, chat: true }
    });
  }

  return { ...payload, isMine: true, status: 'sent' };
};

const seedDriverLiveLocation = async (request, driverId) => {
  const offer = request.offers?.find?.((o) => String(o.driverId) === String(driverId));
  const offerCoords = offer?.driverLocation?.coordinates;
  if (offerCoords?.length === 2) {
    request.driverLiveLocation = toPoint(offerCoords[0], offerCoords[1]);
    return;
  }
  const driver = await User.findById(driverId).select('driverAvailability');
  const coords = driver?.driverAvailability?.location?.coordinates;
  if (coords?.length === 2) {
    request.driverLiveLocation = toPoint(coords[0], coords[1]);
  }
};

const getSessionForViewer = async (requestId, viewerId) => {
  const doc = await populateRequest(RideRequest.findById(requestId));
  return doc ? formatSession(doc, viewerId) : null;
};

module.exports = {
  getDriverActiveRide,
  getPassengerActiveRide,
  updateDriverLocation,
  driverPingHere,
  startRide,
  completeRide,
  dismissCompletedSession,
  markViewerClosed,
  cancelRide,
  updateAgreedFare,
  getChatMessages,
  saveChatMessage,
  markMessageDelivered,
  markChatRead,
  formatSession,
  populateRequest,
  seedDriverLiveLocation,
  getSessionForViewer,
  getPassengerRideHistory,
  ACTIVE_STATUSES
};

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const RideRequest = require('../models/RideRequest');
const {
  RIDE_REQUEST_STATUS,
  RIDE_PHASE,
  OFFER_STATUS,
  REQUEST_TTL_MINUTES,
  OFFER_VISIBLE_SECONDS
} = require('../constants/rideRequest');
const { searchAutoCancelDate, processDueSearchCancellations, clearSearchAutoCancel } = require('./rideRequestExpiryService');
const { notifyInApp } = require('./rideRequestNotify');
const { getDriverActiveRide, seedDriverLiveLocation, getSessionForViewer } = require('./activeRideService');
const { formatDistance } = require('../utils/geo');
const {
  estimateTripFare,
  clampPassengerFare,
  clampDriverCounterFare,
  getFareSettings
} = require('./fareEstimationService');
const { emitRideRequestEvent } = require('./realtimeService');
const { driverEtaMinutes } = require('./rideRequestHelpers');
const {
  estimateLegMetrics,
  enrichDriverToPickups,
  haversineRoadMeters
} = require('./tripMetricsService');

const toPoint = (lng, lat) => ({ type: 'Point', coordinates: [lng, lat] });

const formatRequest = (doc, viewerId) => {
  const r = doc.toObject ? doc.toObject() : doc;
  const offers = (r.offers || []).map((o) => ({
    ...o,
    isMine: viewerId && String(o.driverId) === String(viewerId)
  }));
  return { ...r, offers };
};

const findNearbyOnlineDrivers = async (pickupLng, pickupLat, radiusMeters, vehicleType) => {
  const pickupPoint = { lng: pickupLng, lat: pickupLat };
  const drivers = await User.find({
    roles: { $in: ['DRIVER'] },
    'driverAvailability.isOnline': true,
    'driverAvailability.location': {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [pickupLng, pickupLat] },
        $maxDistance: radiusMeters
      }
    }
  })
    .select('name driverAvailability profile roles')
    .limit(40)
    .lean();

  const activeTypeFilter = (d) => {
    const active = d.driverAvailability?.activeVehicleType;
    return !active || active === vehicleType;
  };

  const ids = drivers.map((d) => d._id);
  const vehicles = await Vehicle.find({
    ownerId: { $in: ids },
    vehicleType,
    verificationStatus: 'APPROVED'
  })
    .select('ownerId vehicleType plateNumber')
    .lean();

  const vehicleByOwner = Object.fromEntries(vehicles.map((v) => [String(v.ownerId), v]));

  return drivers
    .filter((d) => vehicleByOwner[String(d._id)] && activeTypeFilter(d))
    .map((d) => {
      const [lng, lat] = d.driverAvailability?.location?.coordinates || [];
      const distM = haversineRoadMeters(pickupPoint, { lng, lat });
      const distKm = Math.round((distM / 1000) * 10) / 10;
      return {
        driverId: d._id,
        name: d.name,
        vehicleType,
        lat,
        lng,
        distanceKm: distKm,
        distanceText: formatDistance(distM).text,
        etaMinutes: driverEtaMinutes(distKm, vehicleType),
        plateNumber: vehicleByOwner[String(d._id)]?.licensePlate || ''
      };
    });
};

const rejectedDriverIds = (request) =>
  new Set(
    (request.offers || [])
      .filter((o) => o.status === OFFER_STATUS.REJECTED)
      .map((o) => String(o.driverId))
  );

const broadcastToNearbyDrivers = async (request, radiusMeters, { rebroadcastAfterFareChange = false } = {}) => {
  const [lng, lat] = request.pickup.location.coordinates;
  const nearby = await findNearbyOnlineDrivers(lng, lat, radiusMeters, request.vehicleType);
  const passengerIdStr = String(request.passengerId);
  const rejected = rebroadcastAfterFareChange ? new Set() : rejectedDriverIds(request);
  const notified = new Set((request.notifiedDriverIds || []).map(String));

  for (const d of nearby) {
    const did = String(d.driverId);
    if (did === passengerIdStr) continue;
    if (rejected.has(did)) continue;

    notified.add(did);
    await notifyInApp(d.driverId, 'RIDE_REQUEST_NEW', request, {
      title: rebroadcastAfterFareChange
        ? `Updated fare · ${request.vehicleType}`
        : `New ${request.vehicleType} request`,
      body: `Rs.${request.passengerOfferedFare} · ${d.distanceText} away`,
      data: { fare: request.passengerOfferedFare, distanceKm: d.distanceKm, etaMinutes: d.etaMinutes }
    });
    emitRideRequestEvent(String(d.driverId), 'ride-request:new', {
      requestId: request._id,
      requestRef: request.requestRef,
      vehicleType: request.vehicleType,
      pickup: request.pickup,
      dropoff: request.dropoff,
      passengerOfferedFare: request.passengerOfferedFare,
      recommendedFare: request.recommendedFare,
      distanceKm: request.distanceKm,
      distanceToPickupKm: d.distanceKm,
      etaMinutes: d.etaMinutes,
      fareUpdated: rebroadcastAfterFareChange
    });
  }

  request.notifiedDriverIds = [...notified].map((id) => id);
  request.driversNotifiedCount = notified.size;

  return { nearby, driversNotifiedCount: notified.size };
};

const collectRequestDriverIds = (request, { excludeDriverId } = {}) => {
  const driverIds = new Set();
  (request.notifiedDriverIds || []).forEach((id) => driverIds.add(String(id)));
  (request.offers || []).forEach((o) => {
    if (o.driverId) driverIds.add(String(o.driverId));
  });
  if (excludeDriverId) driverIds.delete(String(excludeDriverId));
  return [...driverIds];
};

const emitToRequestDrivers = (request, event, payload) => {
  for (const driverId of collectRequestDriverIds(request)) {
    emitRideRequestEvent(driverId, event, payload);
  }
};

/** Fire-and-forget: tell every other driver this request is no longer available */
const notifyOtherDriversRequestTaken = async (request, acceptedDriverId) => {
  const driverIds = collectRequestDriverIds(request, { excludeDriverId: acceptedDriverId });
  const payload = {
    requestId: request._id,
    requestRef: request.requestRef,
    message: 'Another driver was selected for this ride'
  };
  await Promise.all(
    driverIds.map((driverId) =>
      Promise.resolve().then(() => emitRideRequestEvent(driverId, 'ride-request:taken', payload))
    )
  );
};

const notifyDriversRequestCancelled = (request) => {
  emitToRequestDrivers(request, 'ride-request:cancelled', {
    requestId: request._id,
    requestRef: request.requestRef,
    cancelledBy: request.cancelledBy || 'PASSENGER',
    message: 'Passenger cancelled this ride request'
  });
};

const DRIVER_HIDDEN_OFFER = [
  OFFER_STATUS.REJECTED,
  OFFER_STATUS.COUNTERED,
  OFFER_STATUS.PASSENGER_REJECTED,
  OFFER_STATUS.PASSENGER_ACCEPTED
];

const createRideRequest = async (passengerId, body) => {
  await processDueSearchCancellations(passengerId);
  const { getPassengerActiveRide, markViewerClosed } = require('./activeRideService');
  const { assertPassengerCanStartTrip } = require('./userTripGuard');
  const busy = await getPassengerActiveRide(passengerId);
  if (busy?.status === RIDE_REQUEST_STATUS.COMPLETED && !busy.passengerClosedAt) {
    await markViewerClosed(busy._id, passengerId, 'PASSENGER');
  }
  await assertPassengerCanStartTrip(passengerId);

  const {
    pickup,
    dropoff,
    vehicleType,
    passengerOfferedFare,
    hasAC,
    preferAC,
    originLng,
    originLat,
    destLng,
    destLat
  } = body;
  const wantsAC = !!(hasAC || preferAC);

  const pickupPoint = pickup?.location?.coordinates
    ? pickup
    : {
        address: pickup?.address || 'Pickup',
        location: toPoint(originLng ?? pickup?.lng, originLat ?? pickup?.lat)
      };

  const dropoffPoint = dropoff?.location?.coordinates
    ? dropoff
    : {
        address: dropoff?.address || 'Destination',
        location: toPoint(destLng ?? dropoff?.lng, destLat ?? dropoff?.lat)
      };

  const estimate = await estimateTripFare({
    originCoords: pickupPoint.location.coordinates,
    destCoords: dropoffPoint.location.coordinates,
    vehicleType,
    hasAC: wantsAC,
    useRoadRouting: false
  });

  const offered = clampPassengerFare(
    parseInt(passengerOfferedFare, 10) || estimate.recommendedFare,
    estimate
  );

  const settings = await getFareSettings();
  const request = await RideRequest.create({
    passengerId,
    vehicleType,
    hasAC: wantsAC,
    pickup: pickupPoint,
    dropoff: dropoffPoint,
    distanceKm: estimate.distanceKm,
    recommendedFare: estimate.recommendedFare,
    passengerOfferedFare: offered,
    minFare: estimate.minFare,
    maxFare: estimate.maxFare,
    currency: estimate.currency,
    fareFactors: estimate.factors,
    status: RIDE_REQUEST_STATUS.SEARCHING,
    searchRadiusMeters: estimate.waveRadiiMeters?.[0] ?? 1500,
    expiresAt: new Date(Date.now() + REQUEST_TTL_MINUTES * 60 * 1000),
    searchAutoCancelAt: searchAutoCancelDate()
  });

  const { nearby, driversNotifiedCount } = await broadcastToNearbyDrivers(
    request,
    settings.driverNotifyRadiusMeters ?? 5000
  );

  request.status = nearby.length ? RIDE_REQUEST_STATUS.OFFERS_PENDING : RIDE_REQUEST_STATUS.SEARCHING;
  await request.save();

  emitRideRequestEvent(String(passengerId), 'ride-request:searching', {
    requestId: request._id,
    nearbyDrivers: nearby,
    driversNotifiedCount,
    searchRadiusMeters: request.searchRadiusMeters
  });

  return {
    request: formatRequest(request, passengerId),
    nearbyDrivers: nearby,
    driversNotifiedCount,
    estimate
  };
};

const expandSearchWave = async (requestId, passengerId, radiusMeters) => {
  const request = await RideRequest.findOne({ _id: requestId, passengerId });
  if (!request) throw new Error('Ride request not found');
  if (
    [RIDE_REQUEST_STATUS.CANCELLED, RIDE_REQUEST_STATUS.COMPLETED].includes(request.status) ||
    ![RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING].includes(request.status)
  ) {
    const err = new Error('Request is no longer active');
    err.statusCode = 409;
    throw err;
  }

  request.searchRadiusMeters = radiusMeters;
  const { nearby, driversNotifiedCount } = await broadcastToNearbyDrivers(request, radiusMeters);
  if (nearby.length) request.status = RIDE_REQUEST_STATUS.OFFERS_PENDING;
  await request.save();

  return {
    request: formatRequest(request, passengerId),
    nearbyDrivers: nearby,
    driversNotifiedCount
  };
};

const updatePassengerSearchFare = async (requestId, passengerId, passengerOfferedFare) => {
  const request = await RideRequest.findOne({ _id: requestId, passengerId });
  if (!request) throw new Error('Ride request not found');
  if (
    [RIDE_REQUEST_STATUS.CANCELLED, RIDE_REQUEST_STATUS.COMPLETED, RIDE_REQUEST_STATUS.ACCEPTED].includes(
      request.status
    ) ||
    ![RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING].includes(request.status)
  ) {
    const err = new Error('Request is no longer accepting fare changes');
    err.statusCode = 409;
    throw err;
  }

  const estimate = {
    recommendedFare: request.recommendedFare,
    minFare: request.minFare,
    maxFare: request.maxFare
  };
  const offered = clampPassengerFare(parseInt(passengerOfferedFare, 10), estimate);

  request.offers = (request.offers || []).filter((o) => o.status !== OFFER_STATUS.REJECTED);
  request.passengerOfferedFare = offered;
  request.updatedAt = new Date();

  const radius = request.searchRadiusMeters || 5000;
  const { nearby, driversNotifiedCount } = await broadcastToNearbyDrivers(request, radius, {
    rebroadcastAfterFareChange: true
  });
  if (nearby.length) request.status = RIDE_REQUEST_STATUS.OFFERS_PENDING;
  await request.save();

  emitRideRequestEvent(String(passengerId), 'ride-request:searching', {
    requestId: request._id,
    nearbyDrivers: nearby,
    driversNotifiedCount,
    passengerOfferedFare: offered,
    fareUpdated: true
  });

  return {
    request: formatRequest(request, passengerId),
    nearbyDrivers: nearby,
    driversNotifiedCount
  };
};

const getRequestForPassenger = async (requestId, userId) => {
  const request = await RideRequest.findOne({
    _id: requestId,
    $or: [{ passengerId: userId }, { acceptedDriverId: userId }]
  }).populate('offers.driverId', 'name profile');
  if (!request) throw new Error('Ride request not found');
  const [lng, lat] = request.pickup.location.coordinates;
  const nearby = await findNearbyOnlineDrivers(
    lng,
    lat,
    request.searchRadiusMeters || 5000,
    request.vehicleType
  );
  return { request: formatRequest(request, userId), nearbyDrivers: nearby };
};

const listIncomingForDriver = async (driverId) => {
  const activeRide = await getDriverActiveRide(driverId);
  const driverBusy = !!activeRide;

  const driver = await User.findById(driverId);
  if (!driver?.driverAvailability?.isOnline) {
    return { items: [], driverBusy: false, activeRideId: null, needsActiveVehicle: false };
  }

  const [lng, lat] = driver.driverAvailability?.location?.coordinates || [];
  if (lng == null) {
    return { items: [], driverBusy: false, activeRideId: null, needsActiveVehicle: false };
  }

  const vehicles = await Vehicle.find({ ownerId: driverId, verificationStatus: 'APPROVED' }).lean();
  if (!vehicles.length) return [];

  let activeVehicleType = driver.driverAvailability?.activeVehicleType || '';
  const approved = vehicles.filter((v) => v.vehicleType);
  if (!activeVehicleType && approved.length === 1) {
    activeVehicleType = approved[0].vehicleType;
    await User.updateOne(
      { _id: driverId },
      {
        'driverAvailability.activeVehicleId': approved[0]._id,
        'driverAvailability.activeVehicleType': approved[0].vehicleType
      }
    );
  }

  if (!activeVehicleType) {
    return {
      items: [],
      driverBusy,
      activeRideId: activeRide?._id || null,
      needsActiveVehicle: true,
      approvedVehicles: approved.map((v) => ({
        _id: v._id,
        vehicleType: v.vehicleType,
        licensePlate: v.licensePlate,
        make: v.make,
        model: v.model,
        company: v.company
      }))
    };
  }

  const requests = await RideRequest.find({
    status: { $in: [RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING] },
    vehicleType: activeVehicleType,
    passengerId: { $ne: driverId },
    expiresAt: { $gt: new Date() },
    'pickup.location': {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 8000
      }
    }
  })
    .populate('passengerId', 'name profile rating')
    .limit(20)
    .lean();

  const driverPoint = { lng, lat };
  const pickupPoints = requests.map((r) => ({
    coordinates: r.pickup.location.coordinates
  }));
  const legMetrics = await enrichDriverToPickups(driverPoint, pickupPoints);

  const items = requests
    .map((r, idx) => {
      const leg = legMetrics[idx] || {};
      const existing = (r.offers || []).find((o) => String(o.driverId) === String(driverId));
      return {
        ...r,
        distanceToPickupKm: leg.distanceKm ?? 0,
        distanceToPickupText: leg.distanceText,
        etaMinutes: leg.etaMinutes ?? driverEtaMinutes(leg.distanceKm, r.vehicleType),
        myOffer: existing || null,
        canAccept: !driverBusy
      };
    })
    .filter((r) => {
      const st = r.myOffer?.status;
      return !st || !DRIVER_HIDDEN_OFFER.includes(st);
    });

  return {
    items,
    driverBusy,
    activeRideId: activeRide?._id || null,
    activeVehicleType,
    needsActiveVehicle: false
  };
};

const driverRespond = async (requestId, driverId, { action, counterFare, message }) => {
  const { assertDriverCanAcceptTrip } = require('./userTripGuard');
  await assertDriverCanAcceptTrip(driverId);

  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride request not found');
  if (request.status === RIDE_REQUEST_STATUS.ACCEPTED) throw new Error('Request already matched');

  const driver = await User.findById(driverId);
  if (!driver?.driverAvailability?.isOnline) {
    throw new Error('Go online in Profile to receive ride requests');
  }

  const estimate = {
    recommendedFare: request.recommendedFare,
    minFare: request.minFare,
    maxFare: request.maxFare
  };

  const [dLng, dLat] = driver.driverAvailability.location?.coordinates || [];
  const pickupLeg = await estimateLegMetrics(
    { lng: dLng, lat: dLat },
    request.pickup.location,
    request.vehicleType
  );
  const distKm = pickupLeg.distanceKm;

  let offer = request.offers.find((o) => String(o.driverId) === String(driverId));

  if (action === 'REJECT') {
    if (!offer) {
      request.offers.push({
        driverId,
        offeredFare: request.passengerOfferedFare,
        status: OFFER_STATUS.REJECTED,
        distanceToPickupKm: distKm,
        etaMinutes: pickupLeg.etaMinutes,
        driverName: driver.name,
        vehicleType: request.vehicleType
      });
    } else {
      offer.status = OFFER_STATUS.REJECTED;
      offer.updatedAt = new Date();
    }
    await request.save();
    emitRideRequestEvent(String(driverId), 'ride-request:driver-done', {
      requestId: request._id,
      action: 'REJECT'
    });
    return formatRequest(request, driverId);
  }

  if (action === 'ACCEPT') {
    const fare = request.passengerOfferedFare;
    if (!offer) {
      offer = {
        driverId,
        offeredFare: fare,
        status: OFFER_STATUS.PENDING,
        distanceToPickupKm: distKm,
        etaMinutes: pickupLeg.etaMinutes,
        driverLocation: dLng != null ? toPoint(dLng, dLat) : null,
        driverName: driver.name,
        vehicleType: request.vehicleType,
        message: message || ''
      };
      request.offers.push(offer);
    } else {
      offer.status = OFFER_STATUS.PENDING;
      offer.offeredFare = fare;
      offer.distanceToPickupKm = distKm;
      offer.etaMinutes = pickupLeg.etaMinutes;
      offer.updatedAt = new Date();
    }
    await request.save();
    const saved = request.offers.find((o) => String(o.driverId) === String(driverId));
    const offerPayload = saved?.toObject?.() || saved;
    emitRideRequestEvent(String(request.passengerId), 'ride-request:fare-offer', {
      requestId: request._id,
      offer: offerPayload,
      action: 'ACCEPT',
      visibleSeconds: 15
    });
    await notifyInApp(request.passengerId, 'RIDE_REQUEST_FARE_OFFER', request, {
      title: 'Driver accepted your fare',
      body: `${driver.name} · Rs.${fare} · ~${pickupLeg.etaMinutes} min away`,
      data: { driverId, fare, distanceKm: distKm, etaMinutes: pickupLeg.etaMinutes }
    });
    const savedAccept = request.offers.find((o) => String(o.driverId) === String(driverId));
    const respondBy = new Date(Date.now() + OFFER_VISIBLE_SECONDS * 1000);
    if (savedAccept) savedAccept.passengerRespondBy = respondBy;
    await request.save();
    emitRideRequestEvent(String(driverId), 'ride-request:awaiting-passenger', {
      requestId: request._id,
      offerId: savedAccept?._id,
      action: 'ACCEPT',
      respondBy: respondBy.toISOString(),
      visibleSeconds: OFFER_VISIBLE_SECONDS
    });
    return formatRequest(request, driverId);
  }

  if (action === 'COUNTER') {
    const counter = clampDriverCounterFare(parseInt(counterFare, 10), estimate);
    if (!offer) {
      request.offers.push({
        driverId,
        offeredFare: request.passengerOfferedFare,
        counterFare: counter,
        status: OFFER_STATUS.COUNTERED,
        distanceToPickupKm: distKm,
        etaMinutes: pickupLeg.etaMinutes,
        driverLocation: dLng != null ? toPoint(dLng, dLat) : null,
        driverName: driver.name,
        vehicleType: request.vehicleType,
        message: message || `Counter offer: Rs.${counter}`
      });
    } else {
      offer.counterFare = counter;
      offer.status = OFFER_STATUS.COUNTERED;
      offer.distanceToPickupKm = distKm;
      offer.etaMinutes = pickupLeg.etaMinutes;
      offer.updatedAt = new Date();
      offer.message = message || `Counter offer: Rs.${counter}`;
    }
    const respondBy = new Date(Date.now() + OFFER_VISIBLE_SECONDS * 1000);
    const latest = request.offers.find((o) => String(o.driverId) === String(driverId));
    if (latest) latest.passengerRespondBy = respondBy;
    await request.save();
    const offerPayload = latest?.toObject?.() || latest;
    emitRideRequestEvent(String(request.passengerId), 'ride-request:fare-offer', {
      requestId: request._id,
      offer: { ...offerPayload, passengerRespondBy: respondBy },
      action: 'COUNTER',
      counterFare: counter,
      visibleSeconds: OFFER_VISIBLE_SECONDS
    });

    await notifyInApp(request.passengerId, 'RIDE_REQUEST_FARE_OFFER', request, {
      title: 'Driver counter-offer',
      body: `${driver.name} offered Rs.${counter} (${distKm} km · ~${pickupLeg.etaMinutes} min)`,
      data: { counterFare: counter, driverId, distanceKm: distKm, etaMinutes: pickupLeg.etaMinutes }
    });
    emitRideRequestEvent(String(driverId), 'ride-request:awaiting-passenger', {
      requestId: request._id,
      offerId: latest._id,
      action: 'COUNTER',
      counterFare: counter,
      respondBy: respondBy.toISOString(),
      visibleSeconds: OFFER_VISIBLE_SECONDS
    });
    return formatRequest(request, driverId);
  }

  throw new Error('Invalid action. Use ACCEPT, REJECT, or COUNTER');
};

const passengerRespondToOffer = async (requestId, passengerId, offerId, { action }) => {
  const request = await RideRequest.findOne({ _id: requestId, passengerId });
  if (!request) throw new Error('Ride request not found');

  const offer = request.offers.id(offerId);
  if (!offer) throw new Error('Offer not found');

  if (action === 'REJECT') {
    offer.status = OFFER_STATUS.PASSENGER_REJECTED;
    offer.updatedAt = new Date();
    await request.save();
    emitRideRequestEvent(String(offer.driverId), 'ride-request:offer-response', {
      requestId,
      offerId,
      action: 'REJECT',
      message: 'Passenger declined your offer'
    });
    return formatRequest(request, passengerId);
  }

  if (action === 'ACCEPT') {
    const finalFare = offer.counterFare ?? offer.offeredFare ?? request.passengerOfferedFare;
    offer.status = OFFER_STATUS.PASSENGER_ACCEPTED;
    request.status = RIDE_REQUEST_STATUS.ACCEPTED;
    request.phase = RIDE_PHASE.MATCHED;
    request.acceptedOfferId = offer._id;
    request.acceptedDriverId = offer.driverId;
    request.passengerOfferedFare = finalFare;
    request.agreedFare = finalFare;
    request.searchAutoCancelAt = null;
    offer.updatedAt = new Date();
    await seedDriverLiveLocation(request, offer.driverId);
    await request.save();

    setImmediate(() => {
      notifyOtherDriversRequestTaken(request, offer.driverId).catch((err) => {
        console.error('[ride-request] notifyOtherDriversRequestTaken failed', err?.message || err);
      });
    });

    const sessionDriver = await getSessionForViewer(requestId, offer.driverId);
    const sessionPassenger = await getSessionForViewer(requestId, passengerId);
    emitRideRequestEvent(String(offer.driverId), 'ride-request:matched', {
      requestId,
      offerId,
      finalFare,
      message: 'Ride accepted! Head to pickup.',
      request: sessionDriver
    });
    emitRideRequestEvent(String(passengerId), 'ride-request:matched', {
      requestId,
      offerId,
      finalFare,
      message: 'Ride accepted! Track your driver on the map.',
      request: sessionPassenger
    });
    await notifyInApp(offer.driverId, 'RIDE_REQUEST_MATCHED', request, {
      title: 'Ride accepted',
      body: `Passenger accepted · Rs.${finalFare}. Open Driver hub for navigation.`,
      data: { requestId }
    });
    await notifyInApp(passengerId, 'RIDE_REQUEST_MATCHED', request, {
      title: 'Ride accepted',
      body: `Your driver is on the way · Rs.${finalFare}`,
      data: { requestId }
    });
    return formatRequest(request, passengerId);
  }

  throw new Error('Invalid action');
};

const getActiveRequestForPassenger = async (passengerId) => {
  const { getPassengerActiveRide } = require('./activeRideService');
  return getPassengerActiveRide(passengerId);
};

module.exports = {
  estimateTripFare,
  getActiveRequestForPassenger,
  createRideRequest,
  expandSearchWave,
  updatePassengerSearchFare,
  getRequestForPassenger,
  listIncomingForDriver,
  driverRespond,
  passengerRespondToOffer,
  findNearbyOnlineDrivers,
  notifyDriversRequestCancelled
};

const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  CANCELLED_BY,
  BOOKING_VEHICLE_TYPE,
  BOOKING_MODES,
  ACTIVE_BOOKING_STATUSES
} = require('../constants/booking');
const {
  validateCreateBookingPayload,
  assertCarRideForBooking,
  isPendingExpired,
  canPassengerCancel,
  canDriverCancel,
  normalizeCoords
} = require('../utils/bookingValidation');
const { passengerMeetsRestrictions } = require('../utils/rideValidation');
const { reconcileRideSeats, getPendingSeatCount, getLiveSeatSnapshot } = require('./seatSyncService');
const { estimateLegMetrics, haversineRoadMeters } = require('./tripMetricsService');
const {
  assertPassengerCanStartTrip,
  assertDriverCanAcceptTrip
} = require('./userTripGuard');
const { calculateCarpoolFareQuote } = require('./carpoolFareService');
const {
  evaluatePassengerFare,
  loadConfirmedBookings
} = require('./fareService');
const { commitPassengerRoute, removePassengerFromRoute, waypointFromBooking } = require('./routeService');
const {
  notifyBookingRequested,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyBookingCancelled,
  notifyRefundPrepared,
  notifyRideCompleted,
  notifyRideStarted
} = require('./bookingNotifications');

const populateBookingDetail = [
  { path: 'passengerId', select: 'name rating profile phoneNumber' },
  {
    path: 'rideId',
    populate: [
      { path: 'driverId', select: 'name rating phoneNumber' },
      { path: 'vehicleId', select: 'make model company vehicleType licensePlate' }
    ]
  }
];

const expirePendingIfNeeded = async (booking) => {
  if (!isPendingExpired(booking)) return booking;
  booking.pushStatus(BOOKING_STATUS.REJECTED, 'SYSTEM', 'Request expired');
  await booking.save();
  return booking;
};

const createBookingRequest = async (user, body) => {
  if (!user.roles?.includes('RIDER')) {
    const err = new Error('Booking requires the Passenger role.');
    err.statusCode = 403;
    throw err;
  }

  await assertPassengerCanStartTrip(user._id);

  const validation = validateCreateBookingPayload(body);
  if (!validation.ok) {
    const err = new Error(validation.errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  const rideDoc = await Ride.findById(body.rideId).populate('vehicleId');
  await reconcileRideSeats(rideDoc._id);
  const ride = await Ride.findById(body.rideId).populate('vehicleId');
  const vehicle = ride?.vehicleId || (await Vehicle.findById(ride?.vehicleId));

  const carCheck = assertCarRideForBooking(ride, vehicle);
  if (!carCheck.ok) {
    const err = new Error(carCheck.message);
    err.statusCode = 400;
    throw err;
  }

  if (ride.driverId.toString() === user._id.toString()) {
    const err = new Error('Drivers cannot book seats on their own rides');
    err.statusCode = 400;
    throw err;
  }

  const pendingSeats = await getPendingSeatCount(ride._id);
  const effectiveAvailable = ride.availableSeats - pendingSeats;

  let seatsBooked = validation.seatsBooked;
  const bookingMode = validation.bookingMode;

  if (bookingMode === BOOKING_MODES.SOLO) {
    if ((ride.bookedSeats || 0) > 0) {
      const err = new Error(
        'Solo booking requires an empty car. This ride already has confirmed passengers.'
      );
      err.statusCode = 400;
      throw err;
    }
    if (pendingSeats > 0) {
      const err = new Error(
        'Solo booking is not available while other requests are pending on this ride.'
      );
      err.statusCode = 400;
      throw err;
    }
    if (ride.availableSeats !== ride.totalSeats) {
      const err = new Error('Solo booking requires all seats on the ride to be free.');
      err.statusCode = 400;
      throw err;
    }
    seatsBooked = ride.availableSeats;
  } else if (seatsBooked > effectiveAvailable) {
    const err = new Error(
      `Only ${effectiveAvailable} seat(s) effectively available (${pendingSeats} pending).`
    );
    err.statusCode = 400;
    throw err;
  }

  const passenger = await User.findById(user._id);
  const restrictionCheck = passengerMeetsRestrictions(ride, passenger);
  if (!restrictionCheck.ok) {
    const err = new Error(restrictionCheck.message);
    err.statusCode = 403;
    throw err;
  }

  const existing = await Booking.findOne({
    rideId: ride._id,
    passengerId: user._id,
    status: { $in: ACTIVE_BOOKING_STATUSES }
  });
  if (existing) {
    const err = new Error('You already have an active or pending booking for this ride');
    err.statusCode = 400;
    throw err;
  }

  const pickupPoint = {
    address: body.pickupAddress,
    location: { type: 'Point', coordinates: validation.pickupCoords }
  };
  const dropoffPoint = {
    address: body.dropoffAddress,
    location: { type: 'Point', coordinates: validation.dropoffCoords }
  };

  const fareQuote = await calculateCarpoolFareQuote(ride, {
    prospect: {
      pickup: pickupPoint,
      dropoff: dropoffPoint,
      seatsBooked: seatsBooked
    }
  });

  if (fareQuote.accepted === false) {
    const err = new Error(fareQuote.rejectionReason || 'This passenger cannot be added to the route');
    err.statusCode = 400;
    throw err;
  }

  const costPerSeat = fareQuote.farePerSeat;
  const subtotal = fareQuote.fareAmount ?? fareQuote.yourTotal ?? costPerSeat * seatsBooked;

  const booking = await Booking.create({
    rideId: ride._id,
    passengerId: user._id,
    vehicleType: BOOKING_VEHICLE_TYPE,
    bookingMode,
    seatsBooked,
    pickupPoint,
    dropoffPoint,
    pricing: {
      costPerSeat,
      seatsBooked,
      subtotal,
      currency: ride.pricing?.currency || 'PKR',
      costPerKm: fareQuote.costPerKm,
      ownDistanceKm: fareQuote.passengerOwnDistance,
      detourDistanceKm: fareQuote.passengerDetour,
      totalFareDistanceKm: fareQuote.totalFareDistance,
      mainDistanceKm: fareQuote.passengerOwnDistance,
      totalDistanceKm: fareQuote.totalFareDistance,
      tripFareRs: fareQuote.tripFareRs,
      detourFareRs: fareQuote.detourFareRs,
      totalFuelCost: fareQuote.fareAmount,
      costPerSeatIfFull: fareQuote.costPerSeatIfFull,
      routeOldDistanceKm: fareQuote.oldDistance,
      routeNewDistanceKm: fareQuote.newDistance,
      fareFormula: fareQuote.formula
    },
    farePaid: subtotal,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    statusHistory: [
      { status: BOOKING_STATUS.PENDING, at: new Date(), by: 'PASSENGER', note: 'Request submitted' }
    ]
  });

  const driver = await User.findById(ride.driverId);
  await notifyBookingRequested(driver, passenger, booking, ride);

  return booking;
};

const respondToBooking = async (driverUser, bookingId, status) => {
  if (!['CONFIRMED', 'REJECTED'].includes(status)) {
    const err = new Error('Status must be CONFIRMED or REJECTED');
    err.statusCode = 400;
    throw err;
  }

  let booking = await Booking.findById(bookingId).populate('rideId').populate('passengerId', 'name phoneNumber');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  booking = await expirePendingIfNeeded(booking);
  if (booking.status !== BOOKING_STATUS.PENDING) {
    const err = new Error(`Cannot modify booking in state: ${booking.status}`);
    err.statusCode = 400;
    throw err;
  }

  if (booking.rideId.driverId.toString() !== driverUser._id.toString()) {
    const err = new Error('Not authorized to manage this booking');
    err.statusCode = 401;
    throw err;
  }

  await assertDriverCanAcceptTrip(driverUser._id, { rideId: booking.rideId._id });

  if (status === 'CONFIRMED') {
    const ride = await Ride.findById(booking.rideId._id);
    await reconcileRideSeats(ride._id);
    const freshRide = await Ride.findById(ride._id);
    if (booking.seatsBooked > freshRide.availableSeats) {
      const err = new Error(`Only ${freshRide.availableSeats} seat(s) available`);
      err.statusCode = 400;
      throw err;
    }

    booking.pushStatus(BOOKING_STATUS.CONFIRMED, 'DRIVER', 'Accepted by driver');
    booking.paymentStatus = PAYMENT_STATUS.PAID;
    booking.farePaid = booking.pricing.subtotal;
    await booking.save();

    await reconcileRideSeats(ride._id);

    const confirmed = await loadConfirmedBookings(ride._id);
    const evaluation = await evaluatePassengerFare(ride, confirmed.filter(
      (c) => c._id.toString() !== booking._id.toString()
    ), {
      pickup: booking.pickupPoint,
      dropoff: booking.dropoffPoint,
      seatsBooked: booking.seatsBooked
    });

    if (evaluation.accepted && evaluation.bestRoute) {
      await commitPassengerRoute(ride, booking, evaluation.bestRoute, evaluation.newDistance);
    } else if (booking.pricing?.routeNewDistanceKm) {
      const fallbackRoute = [
        ...(ride.route?.waypoints || []),
        waypointFromBooking(booking, 'pickup'),
        waypointFromBooking(booking, 'dropoff')
      ];
      await commitPassengerRoute(
        ride,
        booking,
        fallbackRoute,
        booking.pricing.routeNewDistanceKm
      );
    }
  } else {
    booking.pushStatus(BOOKING_STATUS.REJECTED, 'DRIVER', 'Declined by driver');
  }

  await booking.save();
  await booking.populate(populateBookingDetail);

  if (status === 'CONFIRMED') {
    await notifyBookingConfirmed(booking.passengerId, driverUser, booking);
  } else {
    await notifyBookingRejected(booking.passengerId, driverUser, booking);
  }

  return booking;
};

const cancelBooking = async (actorUser, bookingId, { reason = '' } = {}) => {
  const booking = await Booking.findById(bookingId).populate('rideId').populate('passengerId', 'name phoneNumber');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const isPassenger = booking.passengerId._id.toString() === actorUser._id.toString();
  const isDriver = booking.rideId.driverId.toString() === actorUser._id.toString();

  if (!isPassenger && !isDriver) {
    const err = new Error('Not authorized to cancel this booking');
    err.statusCode = 401;
    throw err;
  }

  if (isPassenger && !canPassengerCancel(booking)) {
    const err = new Error(`Cannot cancel booking in state: ${booking.status}`);
    err.statusCode = 400;
    throw err;
  }
  if (isDriver && !canDriverCancel(booking)) {
    const err = new Error(`Cannot cancel booking in state: ${booking.status}`);
    err.statusCode = 400;
    throw err;
  }

  const wasConfirmed = booking.status === BOOKING_STATUS.CONFIRMED;

  booking.pushStatus(
    BOOKING_STATUS.CANCELLED,
    isPassenger ? 'PASSENGER' : 'DRIVER',
    reason || 'Cancelled'
  );
  booking.cancellation = {
    by: isPassenger ? CANCELLED_BY.PASSENGER : CANCELLED_BY.DRIVER,
    reason,
    at: new Date()
  };

  if (wasConfirmed) {
    if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
      booking.paymentStatus = PAYMENT_STATUS.REFUND_PENDING;
      booking.refund = {
        amount: booking.farePaid,
        reason: reason || 'Cancelled after payment',
        status: REFUND_STATUS.PENDING,
        preparedAt: new Date(),
        processedAt: null
      };
    }
  }

  await booking.save();

  if (wasConfirmed) {
    const ride = await Ride.findById(booking.rideId._id);
    await reconcileRideSeats(ride._id);
    await removePassengerFromRoute(ride, booking._id);
  }

  const notifyTarget = isPassenger
    ? await User.findById(booking.rideId.driverId)
    : booking.passengerId;
  await notifyBookingCancelled(notifyTarget, actorUser.name, booking, reason);

  if (booking.paymentStatus === PAYMENT_STATUS.REFUND_PENDING) {
    await notifyRefundPrepared(booking.passengerId, booking, booking.refund.amount);
  }

  return booking;
};

const prepareRefund = async (actorUser, bookingId, { reason = '' } = {}) => {
  const booking = await Booking.findById(bookingId).populate('rideId').populate('passengerId', 'name phoneNumber');
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const isDriver = booking.rideId.driverId.toString() === actorUser._id.toString();
  if (!isDriver) {
    const err = new Error('Only the driver can prepare refunds for this booking');
    err.statusCode = 401;
    throw err;
  }

  if (![PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUND_PENDING].includes(booking.paymentStatus)) {
    const err = new Error('Refund can only be prepared for paid bookings');
    err.statusCode = 400;
    throw err;
  }

  if (![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
    const err = new Error('Invalid booking status for refund preparation');
    err.statusCode = 400;
    throw err;
  }

  booking.paymentStatus = PAYMENT_STATUS.REFUND_PENDING;
  booking.refund = {
    amount: booking.farePaid,
    reason: reason || 'Driver initiated refund',
    status: REFUND_STATUS.PENDING,
    preparedAt: new Date(),
    processedAt: null
  };
  booking.statusHistory.push({
    status: 'REFUND_PREPARED',
    at: new Date(),
    by: 'DRIVER',
    note: reason
  });
  await booking.save();
  await notifyRefundPrepared(booking.passengerId, booking, booking.refund.amount);
  return booking;
};

const coordsFromPoint = (point) => {
  const c = point?.location?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: Number(c[0]), lat: Number(c[1]) };
};

const getStartRideCandidates = async (driverUser, rideId, { driverLat, driverLng } = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.driverId.toString() !== driverUser._id.toString()) {
    const err = new Error('Not authorized');
    err.statusCode = 401;
    throw err;
  }
  if (!['SCHEDULED', 'ACTIVE'].includes(ride.status)) {
    const err = new Error(`Cannot start ride in status: ${ride.status}`);
    err.statusCode = 400;
    throw err;
  }

  const confirmed = await Booking.find({
    rideId: ride._id,
    status: BOOKING_STATUS.CONFIRMED
  })
    .populate('passengerId', 'name phoneNumber')
    .sort({ createdAt: 1 });

  if (!confirmed.length) {
    const err = new Error('At least one confirmed passenger is required to start the ride');
    err.statusCode = 400;
    throw err;
  }

  let driverPoint = null;
  if (driverLat != null && driverLng != null) {
    driverPoint = { lat: Number(driverLat), lng: Number(driverLng) };
  } else {
    const user = await User.findById(driverUser._id).select('driverAvailability');
    const c = user?.driverAvailability?.location?.coordinates;
    if (c?.length === 2) driverPoint = { lng: c[0], lat: c[1] };
    if (!driverPoint) {
      driverPoint = coordsFromPoint(ride.origin);
    }
  }

  const candidates = confirmed.map((b) => {
    const pickup = coordsFromPoint(b.pickupPoint);
    let distanceKm = null;
    if (driverPoint && pickup) {
      distanceKm = Math.round((haversineRoadMeters(driverPoint, pickup) / 1000) * 10) / 10;
    }
    return {
      bookingId: b._id,
      passengerId: b.passengerId?._id,
      passengerName: b.passengerId?.name,
      seatsBooked: b.seatsBooked,
      pickupAddress: b.pickupPoint?.address,
      dropoffAddress: b.dropoffPoint?.address,
      distanceKm
    };
  });

  candidates.sort((a, b) => {
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });

  return {
    rideId: ride._id,
    rideStatus: ride.status,
    requiresSelection: candidates.length > 1,
    candidates
  };
};

const startRide = async (driverUser, rideId, { firstPickupBookingId, driverLat, driverLng } = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.driverId.toString() !== driverUser._id.toString()) {
    const err = new Error('Not authorized to start this ride');
    err.statusCode = 401;
    throw err;
  }
  if (ride.status === 'ACTIVE') {
    return { ride, alreadyStarted: true };
  }
  if (ride.status !== 'SCHEDULED') {
    const err = new Error(`Cannot start ride in status: ${ride.status}`);
    err.statusCode = 400;
    throw err;
  }

  const { candidates } = await getStartRideCandidates(driverUser, rideId, { driverLat, driverLng });
  if (!candidates.length) {
    const err = new Error('No confirmed passengers to pick up');
    err.statusCode = 400;
    throw err;
  }

  let pickupBookingId = firstPickupBookingId;
  if (candidates.length === 1) {
    pickupBookingId = candidates[0].bookingId;
  }
  if (!pickupBookingId) {
    const err = new Error('Select which passenger you will pick up first');
    err.statusCode = 400;
    throw err;
  }
  const valid = candidates.some((c) => String(c.bookingId) === String(pickupBookingId));
  if (!valid) {
    const err = new Error('Invalid first pickup passenger');
    err.statusCode = 400;
    throw err;
  }

  ride.status = 'ACTIVE';
  ride.startedAt = new Date();
  ride.currentPickupBookingId = pickupBookingId;
  await ride.save();

  const confirmed = await Booking.find({
    rideId: ride._id,
    status: BOOKING_STATUS.CONFIRMED
  }).populate('passengerId', 'name phoneNumber');

  const passengers = confirmed.map((b) => ({
    _id: b.passengerId?._id,
    phoneNumber: b.passengerId?.phoneNumber,
    bookingId: b._id
  }));

  await notifyRideStarted(passengers, ride, driverUser.name, pickupBookingId);

  const { emitToUser } = require('./realtimeService');
  confirmed.forEach((b) => {
    const passengerId = b.passengerId?._id || b.passengerId;
    if (!passengerId) return;
    const isFirst = String(b._id) === String(pickupBookingId);
    emitToUser(passengerId, 'carpool-ride-started', {
      rideId: ride._id,
      bookingId: b._id,
      isFirstPickup: isFirst,
      message: isFirst
        ? 'Your driver is coming to pick you up soon.'
        : 'The driver started the carpool and is heading to passengers.'
    });
  });

  return { ride, firstPickupBookingId: pickupBookingId, candidates };
};

const completeRide = async (driverUser, rideId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.driverId.toString() !== driverUser._id.toString()) {
    const err = new Error('Not authorized to complete this ride');
    err.statusCode = 401;
    throw err;
  }
  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    const err = new Error(`Ride already ${ride.status}`);
    err.statusCode = 400;
    throw err;
  }

  ride.status = 'COMPLETED';
  await ride.save();

  const confirmed = await Booking.find({
    rideId: ride._id,
    status: BOOKING_STATUS.CONFIRMED
  }).populate('passengerId', 'name phoneNumber');

  await Booking.updateMany(
    { rideId: ride._id, status: BOOKING_STATUS.CONFIRMED },
    {
      $set: { status: BOOKING_STATUS.COMPLETED, completedAt: new Date() },
      $push: {
        statusHistory: {
          status: BOOKING_STATUS.COMPLETED,
          at: new Date(),
          by: 'DRIVER',
          note: 'Ride completed'
        }
      }
    }
  );

  await Booking.updateMany(
    { rideId: ride._id, status: BOOKING_STATUS.PENDING },
    {
      $set: { status: BOOKING_STATUS.CANCELLED },
      $push: {
        statusHistory: {
          status: BOOKING_STATUS.CANCELLED,
          at: new Date(),
          by: 'SYSTEM',
          note: 'Ride completed — pending requests closed'
        }
      }
    }
  );

  const users = [driverUser, ...confirmed.map((b) => b.passengerId)];
  await notifyRideCompleted(users, ride);

  const { emitToUser } = require('./realtimeService');
  confirmed.forEach((b) => {
    const passengerId = b.passengerId?._id || b.passengerId;
    if (passengerId) {
      emitToUser(passengerId, 'carpool-ride-completed', {
        rideId: ride._id,
        bookingId: b._id,
        message: 'Your carpool ride has been completed'
      });
    }
  });

  return { ride, completedBookings: confirmed.length };
};

const getBookingHistory = async (user, { role, status, page = 1, limit = 20 }) => {
  const skip = (Math.max(1, page) - 1) * Math.min(50, limit);
  const take = Math.min(50, Math.max(1, limit));

  let filter = {};
  if (role === 'driver') {
    const rides = await Ride.find({ driverId: user._id }).select('_id');
    filter.rideId = { $in: rides.map((r) => r._id) };
  } else {
    filter.passengerId = user._id;
  }

  if (status) filter.status = status;

  const [items, total] = await Promise.all([
    Booking.find(filter)
      .populate(populateBookingDetail)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take),
    Booking.countDocuments(filter)
  ]);

  return { items, total, page: Number(page), limit: take };
};

const getBookingById = async (user, bookingId) => {
  const booking = await Booking.findById(bookingId).populate(populateBookingDetail);
  if (!booking) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const ride = booking.rideId;
  const passengerId = booking.passengerId?._id || booking.passengerId;
  const driverId = ride?.driverId?._id || ride?.driverId;
  const isPassenger = passengerId?.toString() === user._id.toString();
  const isDriver = driverId?.toString() === user._id.toString();

  if (!isPassenger && !isDriver) {
    const err = new Error('Not authorized');
    err.statusCode = 401;
    throw err;
  }

  return booking;
};

const getIncomingForDriver = async (user) => {
  const rides = await Ride.find({ driverId: user._id, status: { $in: ['SCHEDULED', 'ACTIVE'] } }).select('_id');
  const rideIds = rides.map((r) => r._id);

  const pending = await Booking.find({
    rideId: { $in: rideIds },
    status: BOOKING_STATUS.PENDING,
    vehicleType: BOOKING_VEHICLE_TYPE
  })
    .populate(populateBookingDetail)
    .sort({ createdAt: -1 });

  const active = [];
  for (let i = 0; i < pending.length; i++) {
    const b = await expirePendingIfNeeded(pending[i]);
    if (b.status !== BOOKING_STATUS.PENDING) continue;

    const ride = b.rideId;
    const [originToPickup, passengerTrip] = await Promise.all([
      ride?.origin
        ? estimateLegMetrics(ride.origin, b.pickupPoint)
        : Promise.resolve({ distanceKm: 0 }),
      estimateLegMetrics(b.pickupPoint, b.dropoffPoint)
    ]);

    const plain = b.toObject();
    plain.distanceMeta = {
      passengerTripKm: plain.pricing?.ownDistanceKm ?? passengerTrip.distanceKm,
      routeDetourKm: plain.pricing?.detourDistanceKm ?? 0,
      billableKm: plain.pricing?.totalFareDistanceKm ?? plain.pricing?.totalDistanceKm,
      pickupFromOriginKm: originToPickup.distanceKm,
      ratePerKm: plain.pricing?.costPerKm
    };
    active.push(plain);
  }

  return active;
};

const getMyTrips = async (user) => {
  const passengerTrips = await Booking.find({ passengerId: user._id })
    .populate(populateBookingDetail)
    .sort({ createdAt: -1 });

  const driverRideDocs = await Ride.find({ driverId: user._id })
    .populate('vehicleId')
    .sort({ departureDate: -1 });

  const driverTrips = await Promise.all(
    driverRideDocs.map(async (ride) => {
      await reconcileRideSeats(ride._id);
      const fresh = await Ride.findById(ride._id).populate('vehicleId');
      const pendingSeats = await getPendingSeatCount(ride._id);
      const obj = fresh.toObject();
      obj.seatSummary = require('../utils/rideSeats').seatSummary(fresh, pendingSeats);
      return obj;
    })
  );

  return { passengerTrips, driverTrips };
};

const getCarpoolFareQuote = async (rideId, body = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }

  const pickupCoords = normalizeCoords(body.pickupCoords);
  const dropoffCoords = normalizeCoords(body.dropoffCoords);

  const prospect =
    pickupCoords && dropoffCoords
      ? {
          pickup: {
            address: body.pickupAddress || '',
            location: { type: 'Point', coordinates: pickupCoords }
          },
          dropoff: {
            address: body.dropoffAddress || '',
            location: { type: 'Point', coordinates: dropoffCoords }
          },
          seatsBooked: Math.max(1, parseInt(body.seatsBooked, 10) || 1)
        }
      : {
          pickup: ride.origin,
          dropoff: ride.destination,
          seatsBooked: Math.max(1, parseInt(body.seatsBooked, 10) || 1)
        };
  return calculateCarpoolFareQuote(ride, { prospect });
};

module.exports = {
  createBookingRequest,
  respondToBooking,
  cancelBooking,
  prepareRefund,
  completeRide,
  getStartRideCandidates,
  startRide,
  getBookingHistory,
  getBookingById,
  getIncomingForDriver,
  getMyTrips,
  getLiveSeatSnapshot,
  getCarpoolFareQuote
};

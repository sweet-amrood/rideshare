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
  canDriverCancel
} = require('../utils/bookingValidation');
const { passengerMeetsRestrictions } = require('../utils/rideValidation');
const { reserveSeats, releaseSeats } = require('../utils/rideSeats');
const { reconcileRideSeats, getLiveSeatSnapshot, getPendingSeatCount } = require('./seatSyncService');
const {
  assertPassengerCanStartTrip,
  assertDriverCanAcceptTrip
} = require('./userTripGuard');
const { calculateCarpoolFareQuote } = require('./carpoolFareService');
const {
  notifyBookingRequested,
  notifyBookingConfirmed,
  notifyBookingRejected,
  notifyBookingCancelled,
  notifyRefundPrepared,
  notifyRideCompleted
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
    location: { type: 'Point', coordinates: body.pickupCoords }
  };
  const dropoffPoint = {
    address: body.dropoffAddress,
    location: { type: 'Point', coordinates: body.dropoffCoords }
  };

  const fareQuote = await calculateCarpoolFareQuote(ride, {
    prospect: {
      pickup: pickupPoint,
      dropoff: dropoffPoint,
      seatsBooked: seatsBooked
    }
  });

  const costPerSeat = fareQuote.costPerSeatNow;
  const subtotal = costPerSeat * seatsBooked;

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
      mainDistanceKm: fareQuote.mainDistanceKm,
      detourDistanceKm: fareQuote.detourDistanceKm,
      totalDistanceKm: fareQuote.totalDistanceKm,
      totalFuelCost: fareQuote.totalFuelCost,
      costPerSeatIfFull: fareQuote.costPerSeatIfFull
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
    const reserved = reserveSeats(ride, booking.seatsBooked);
    if (!reserved.ok) {
      const err = new Error(reserved.message);
      err.statusCode = 400;
      throw err;
    }
    await ride.save();
    await reconcileRideSeats(ride._id);

    const fareQuote = await calculateCarpoolFareQuote(ride, {});
    booking.pricing = {
      ...(booking.pricing?.toObject?.() || booking.pricing || {}),
      costPerSeat: fareQuote.costPerSeatNow,
      seatsBooked: booking.seatsBooked,
      subtotal: fareQuote.costPerSeatNow * booking.seatsBooked,
      mainDistanceKm: fareQuote.mainDistanceKm,
      detourDistanceKm: fareQuote.detourDistanceKm,
      totalDistanceKm: fareQuote.totalDistanceKm,
      totalFuelCost: fareQuote.totalFuelCost,
      costPerSeatIfFull: fareQuote.costPerSeatIfFull
    };
    booking.farePaid = booking.pricing.subtotal;

    booking.pushStatus(BOOKING_STATUS.CONFIRMED, 'DRIVER', 'Accepted by driver');
    booking.paymentStatus = PAYMENT_STATUS.PAID;
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

  if (wasConfirmed) {
    const ride = await Ride.findById(booking.rideId._id);
    releaseSeats(ride, booking.seatsBooked);
    await ride.save();
    await reconcileRideSeats(ride._id);

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
  await booking.save();

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

  for (let i = 0; i < pending.length; i++) {
    pending[i] = await expirePendingIfNeeded(pending[i]);
  }

  return pending.filter((b) => b.status === BOOKING_STATUS.PENDING);
};

const getMyTrips = async (user) => {
  const passengerTrips = await Booking.find({ passengerId: user._id })
    .populate(populateBookingDetail)
    .sort({ createdAt: -1 });

  const driverTrips = await Ride.find({ driverId: user._id })
    .populate('vehicleId')
    .sort({ departureDate: -1 });

  return { passengerTrips, driverTrips };
};

const getCarpoolFareQuote = async (rideId, body = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  const prospect =
    body.pickupCoords?.length === 2 && body.dropoffCoords?.length === 2
      ? {
          pickup: {
            address: body.pickupAddress || '',
            location: { type: 'Point', coordinates: body.pickupCoords }
          },
          dropoff: {
            address: body.dropoffAddress || '',
            location: { type: 'Point', coordinates: body.dropoffCoords }
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
  getBookingHistory,
  getBookingById,
  getIncomingForDriver,
  getMyTrips,
  getLiveSeatSnapshot,
  getCarpoolFareQuote
};

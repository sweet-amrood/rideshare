const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const { ACTIVE_BOOKING_STATUSES, BOOKING_STATUS } = require('../constants/booking');
const { RIDE_REQUEST_STATUS } = require('../constants/rideRequest');
const { getPassengerActiveRide, getDriverActiveRide } = require('./activeRideService');

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

const ON_DEMAND_PASSENGER_BUSY = [
  RIDE_REQUEST_STATUS.SEARCHING,
  RIDE_REQUEST_STATUS.OFFERS_PENDING,
  RIDE_REQUEST_STATUS.ACCEPTED,
  RIDE_REQUEST_STATUS.IN_PROGRESS
];

const getPassengerActiveCarpoolBooking = async (passengerId) => {
  const booking = await Booking.findOne({
    passengerId,
    status: { $in: ACTIVE_BOOKING_STATUSES }
  })
    .populate(populateBookingDetail)
    .sort({ createdAt: -1 });

  if (!booking) return null;

  const ride = booking.rideId;
  const rideStatus = ride?.status;

  if (rideStatus === 'COMPLETED') {
    if (booking.status === BOOKING_STATUS.CONFIRMED) {
      booking.pushStatus(BOOKING_STATUS.COMPLETED, 'SYSTEM', 'Ride completed by driver');
      booking.completedAt = new Date();
      await booking.save();
    }
    return booking;
  }

  if (rideStatus === 'CANCELLED') {
    if ([BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
      booking.pushStatus(BOOKING_STATUS.CANCELLED, 'SYSTEM', 'Ride cancelled');
      await booking.save();
    }
    return null;
  }

  return booking;
};

const getDriverActiveCarpoolRide = async (driverId) =>
  Ride.findOne({ driverId, status: 'ACTIVE' }).sort({ departureDate: -1 });

const getPassengerTripCommitment = async (passengerId) => {
  const onDemand = await getPassengerActiveRide(passengerId);
  if (onDemand && ON_DEMAND_PASSENGER_BUSY.includes(onDemand.status)) {
    return { kind: 'RIDE_REQUEST', data: onDemand };
  }
  const carpool = await getPassengerActiveCarpoolBooking(passengerId);
  if (carpool) {
    return { kind: 'CARPOOL_BOOKING', data: carpool };
  }
  if (onDemand) {
    return { kind: 'RIDE_REQUEST', data: onDemand };
  }
  return null;
};

const getDriverTripCommitment = async (driverId) => {
  const onDemand = await getDriverActiveRide(driverId);
  if (
    onDemand &&
    [RIDE_REQUEST_STATUS.ACCEPTED, RIDE_REQUEST_STATUS.IN_PROGRESS].includes(onDemand.status)
  ) {
    return { kind: 'RIDE_REQUEST', data: onDemand };
  }
  const activeCarpool = await getDriverActiveCarpoolRide(driverId);
  if (activeCarpool) {
    return { kind: 'CARPOOL_RIDE', data: activeCarpool };
  }
  if (onDemand) {
    return { kind: 'RIDE_REQUEST', data: onDemand };
  }
  return null;
};

const assertPassengerCanStartTrip = async (passengerId) => {
  const onDemand = await getPassengerActiveRide(passengerId);
  if (onDemand && ON_DEMAND_PASSENGER_BUSY.includes(onDemand.status)) {
    const err = new Error(
      'You already have an active on-demand ride. Finish or cancel it before starting another trip.'
    );
    err.statusCode = 409;
    throw err;
  }
  const carpool = await getPassengerActiveCarpoolBooking(passengerId);
  if (carpool) {
    const err = new Error(
      'You already have an active carpool booking. Finish or cancel it before starting another trip.'
    );
    err.statusCode = 409;
    throw err;
  }
};

const assertDriverCanAcceptTrip = async (driverId, { rideId = null } = {}) => {
  const onDemand = await getDriverActiveRide(driverId);
  if (
    onDemand &&
    [RIDE_REQUEST_STATUS.ACCEPTED, RIDE_REQUEST_STATUS.IN_PROGRESS].includes(onDemand.status)
  ) {
    const err = new Error('Finish your current on-demand ride before accepting another trip.');
    err.statusCode = 409;
    throw err;
  }
  const activeCarpool = await getDriverActiveCarpoolRide(driverId);
  if (activeCarpool && rideId && String(activeCarpool._id) !== String(rideId)) {
    const err = new Error(
      'You already have an active carpool in progress. Complete it before accepting trips on another ride.'
    );
    err.statusCode = 409;
    throw err;
  }
};

module.exports = {
  getPassengerActiveCarpoolBooking,
  getDriverActiveCarpoolRide,
  getPassengerTripCommitment,
  getDriverTripCommitment,
  assertPassengerCanStartTrip,
  assertDriverCanAcceptTrip
};

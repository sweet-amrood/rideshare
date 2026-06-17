const {
  BOOKING_VEHICLE_TYPE,
  BOOKING_STATUS,
  ACTIVE_BOOKING_STATUSES,
  MAX_SEATS_PER_BOOKING,
  BOOKING_MODES
} = require('../constants/booking');

const isValidCoords = (coords) =>
  Array.isArray(coords) &&
  coords.length === 2 &&
  typeof coords[0] === 'number' &&
  typeof coords[1] === 'number' &&
  coords[0] >= -180 &&
  coords[0] <= 180 &&
  coords[1] >= -90 &&
  coords[1] <= 90;

const validateCreateBookingPayload = (body) => {
  const errors = [];
  if (!body.rideId) errors.push('rideId is required');

  const bookingMode =
    body.bookingMode === BOOKING_MODES.SOLO ? BOOKING_MODES.SOLO : BOOKING_MODES.CARPOOL;

  const seats = parseInt(body.seatsBooked, 10);
  if (!seats || seats < 1) {
    errors.push('seatsBooked must be at least 1');
  } else if (bookingMode === BOOKING_MODES.CARPOOL && seats > MAX_SEATS_PER_BOOKING) {
    errors.push(`Carpool bookings allow at most ${MAX_SEATS_PER_BOOKING} seats`);
  }

  if (!body.pickupAddress?.trim()) errors.push('pickupAddress is required');
  if (!body.dropoffAddress?.trim()) errors.push('dropoffAddress is required');
  if (!isValidCoords(body.pickupCoords)) errors.push('pickupCoords must be [lng, lat]');
  if (!isValidCoords(body.dropoffCoords)) errors.push('dropoffCoords must be [lng, lat]');

  return { ok: errors.length === 0, errors, seatsBooked: seats, bookingMode };
};

const assertCarRideForBooking = (ride, vehicle) => {
  if (!ride) return { ok: false, message: 'Ride not found' };
  if (!vehicle) return { ok: false, message: 'Vehicle not found for this ride' };
  if (vehicle.vehicleType !== BOOKING_VEHICLE_TYPE) {
    return {
      ok: false,
      message: 'Seat reservations are only available for car carpools'
    };
  }
  if (ride.status !== 'SCHEDULED' && ride.status !== 'ACTIVE') {
    return { ok: false, message: 'This ride is not open for bookings' };
  }
  return { ok: true };
};

const isPendingExpired = (booking) =>
  booking.status === BOOKING_STATUS.PENDING &&
  booking.pendingExpiresAt &&
  new Date() > new Date(booking.pendingExpiresAt);

const canPassengerCancel = (booking) =>
  [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status);

const canDriverCancel = (booking) =>
  [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status);

module.exports = {
  validateCreateBookingPayload,
  assertCarRideForBooking,
  isPendingExpired,
  canPassengerCancel,
  canDriverCancel,
  isValidCoords,
  ACTIVE_BOOKING_STATUSES
};

const {
  BOOKING_VEHICLE_TYPE,
  BOOKING_STATUS,
  ACTIVE_BOOKING_STATUSES,
  MAX_SEATS_PER_BOOKING,
  BOOKING_MODES
} = require('../constants/booking');

const normalizeCoords = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lng, lat];
};

const isValidCoords = (coords) => normalizeCoords(coords) != null;

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

  const pickupCoords = normalizeCoords(body.pickupCoords);
  const dropoffCoords = normalizeCoords(body.dropoffCoords);
  if (!pickupCoords) errors.push('pickupCoords must be [lng, lat]');
  if (!dropoffCoords) errors.push('dropoffCoords must be [lng, lat]');

  return {
    ok: errors.length === 0,
    errors,
    seatsBooked: seats,
    bookingMode,
    pickupCoords,
    dropoffCoords
  };
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
  normalizeCoords,
  ACTIVE_BOOKING_STATUSES
};

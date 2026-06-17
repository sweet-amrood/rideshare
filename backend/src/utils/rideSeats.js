/**
 * Seat availability helpers (passenger seats only; driver not counted).
 */
const canBookSeats = (ride, seatsRequested, pendingSeats = 0) => {
  const available = ride.availableSeats ?? 0;
  const effective = available - pendingSeats;
  return seatsRequested > 0 && seatsRequested <= effective;
};

const reserveSeats = (ride, seatsBooked) => {
  if (!canBookSeats(ride, seatsBooked)) {
    return { ok: false, message: `Only ${ride.availableSeats} seat(s) available` };
  }
  ride.availableSeats -= seatsBooked;
  ride.bookedSeats = (ride.bookedSeats || 0) + seatsBooked;
  return { ok: true };
};

const releaseSeats = (ride, seatsBooked) => {
  ride.availableSeats = Math.min(ride.totalSeats, (ride.availableSeats || 0) + seatsBooked);
  ride.bookedSeats = Math.max(0, (ride.bookedSeats || 0) - seatsBooked);
};

const seatSummary = (ride, pendingSeats = 0) => ({
  totalSeats: ride.totalSeats,
  availableSeats: ride.availableSeats,
  bookedSeats: ride.bookedSeats || ride.totalSeats - ride.availableSeats,
  pendingSeats,
  effectiveAvailable: Math.max(0, ride.availableSeats - pendingSeats),
  isFull: ride.availableSeats <= 0,
  isEffectivelyFull: ride.availableSeats - pendingSeats <= 0
});

module.exports = { canBookSeats, reserveSeats, releaseSeats, seatSummary };

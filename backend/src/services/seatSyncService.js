const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const { SEAT_HOLDING_STATUSES, BOOKING_STATUS } = require('../constants/booking');
const { seatSummary } = require('../utils/rideSeats');

/**
 * Reconcile ride.availableSeats / bookedSeats from CONFIRMED bookings (source of truth).
 */
const reconcileRideSeats = async (rideId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return null;

  const agg = await Booking.aggregate([
    { $match: { rideId: ride._id, status: { $in: SEAT_HOLDING_STATUSES } } },
    { $group: { _id: null, seats: { $sum: '$seatsBooked' } } }
  ]);

  const confirmedSeats = agg[0]?.seats || 0;
  ride.bookedSeats = confirmedSeats;
  ride.availableSeats = Math.max(0, ride.totalSeats - confirmedSeats);
  await ride.save();
  return ride;
};

const getPendingSeatCount = async (rideId) => {
  const agg = await Booking.aggregate([
    { $match: { rideId, status: BOOKING_STATUS.PENDING } },
    { $group: { _id: null, seats: { $sum: '$seatsBooked' } } }
  ]);
  return agg[0]?.seats || 0;
};

const getLiveSeatSnapshot = async (rideId) => {
  await reconcileRideSeats(rideId);
  const ride = await Ride.findById(rideId).populate('vehicleId', 'vehicleType company model');
  if (!ride) return null;

  const [pendingSeats, confirmedBookings] = await Promise.all([
    getPendingSeatCount(rideId),
    Booking.find({ rideId, status: BOOKING_STATUS.CONFIRMED })
      .select('seatsBooked passengerId status')
      .populate('passengerId', 'name')
      .lean()
  ]);

  return {
    rideId: ride._id,
    rideStatus: ride.status,
    vehicleType: ride.vehicleId?.vehicleType,
    ...seatSummary(ride, pendingSeats),
    confirmedPassengers: confirmedBookings.map((b) => ({
      bookingId: b._id,
      name: b.passengerId?.name,
      seats: b.seatsBooked
    })),
    lastSyncedAt: new Date()
  };
};

module.exports = {
  reconcileRideSeats,
  getPendingSeatCount,
  getLiveSeatSnapshot,
  attachLiveSeatFields: async (ride) => {
    await reconcileRideSeats(ride._id);
    const fresh = await Ride.findById(ride._id)
      .populate('driverId', 'name rating verification profile')
      .populate('vehicleId');
    if (!fresh) return null;
    const pendingSeats = await getPendingSeatCount(ride._id);
    const summary = seatSummary(fresh, pendingSeats);
    return { ride: fresh, seatSummary: summary, pendingSeats };
  }
};

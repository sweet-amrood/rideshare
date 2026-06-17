const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { BOOKING_STATUS } = require('../constants/booking');
const { getPendingSeatCount } = require('./seatSyncService');
const { seatSummary } = require('../utils/rideSeats');

const pointFromGeo = (loc) => {
  const c = loc?.location?.coordinates || loc?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1], address: loc?.address || '' };
};

const getCarpoolLiveMap = async (rideId, viewerUserId) => {
  const ride = await Ride.findById(rideId)
    .populate('vehicleId', 'vehicleType company model licensePlate make')
    .populate('driverId', 'name phoneNumber driverAvailability profile')
    .lean();

  if (!ride) return null;

  const isDriver = String(ride.driverId?._id || ride.driverId) === String(viewerUserId);

  const [pendingSeats, confirmedBookings, pendingBookings] = await Promise.all([
    getPendingSeatCount(rideId),
    Booking.find({ rideId, status: BOOKING_STATUS.CONFIRMED })
      .select('seatsBooked passengerId pickupPoint dropoffPoint farePaid bookingRef')
      .populate('passengerId', 'name phoneNumber profile')
      .lean(),
    Booking.find({ rideId, status: BOOKING_STATUS.PENDING })
      .select('seatsBooked passengerId pickupPoint dropoffPoint')
      .populate('passengerId', 'name')
      .lean()
  ]);

  const viewerBooking = [...confirmedBookings, ...pendingBookings].find(
    (b) => String(b.passengerId?._id || b.passengerId) === String(viewerUserId)
  );

  if (!isDriver && !viewerBooking) {
    const err = new Error('Not authorized to view this ride map');
    err.statusCode = 403;
    throw err;
  }

  const driverCoords = ride.driverId?.driverAvailability?.location?.coordinates;
  const driverLocation = driverCoords?.length === 2
    ? { lng: driverCoords[0], lat: driverCoords[1] }
    : null;

  const passengers = confirmedBookings.map((b, index) => ({
    bookingId: b._id,
    bookingRef: b.bookingRef,
    name: b.passengerId?.name || 'Passenger',
    seats: b.seatsBooked,
    farePaid: b.farePaid,
    pickup: pointFromGeo(b.pickupPoint),
    dropoff: pointFromGeo(b.dropoffPoint),
    colorIndex: index,
    confirmed: true
  }));

  if (
    viewerBooking &&
    viewerBooking.status === BOOKING_STATUS.PENDING &&
    !passengers.some((p) => String(p.bookingId) === String(viewerBooking._id))
  ) {
    passengers.push({
      bookingId: viewerBooking._id,
      name: viewerBooking.passengerId?.name || 'You',
      seats: viewerBooking.seatsBooked,
      pickup: pointFromGeo(viewerBooking.pickupPoint),
      dropoff: pointFromGeo(viewerBooking.dropoffPoint),
      colorIndex: passengers.length,
      confirmed: false
    });
  }

  return {
    rideId: ride._id,
    rideStatus: ride.status,
    departureDate: ride.departureDate,
    origin: pointFromGeo(ride.origin),
    destination: pointFromGeo(ride.destination),
    driver: {
      id: ride.driverId?._id,
      name: ride.driverId?.name,
      phoneNumber: ride.driverId?.phoneNumber,
      location: driverLocation,
      isOnline: !!ride.driverId?.driverAvailability?.isOnline
    },
    vehicle: ride.vehicleId
      ? {
          type: ride.vehicleId.vehicleType,
          label: [ride.vehicleId.company, ride.vehicleId.model].filter(Boolean).join(' '),
          plate: ride.vehicleId.licensePlate
        }
      : null,
    pricing: {
      costPerSeat: ride.costPerSeat,
      totalFuelCost: ride.pricing?.totalFuelCost,
      distanceKm: ride.pricing?.distanceKm,
      currency: ride.pricing?.currency || 'PKR'
    },
    seats: seatSummary(ride, pendingSeats),
    passengers,
    pendingRequests: pendingBookings.map((b) => ({
      bookingId: b._id,
      name: b.passengerId?.name,
      seats: b.seatsBooked,
      pickup: pointFromGeo(b.pickupPoint),
      dropoff: pointFromGeo(b.dropoffPoint)
    })),
    lastSyncedAt: new Date()
  };
};

module.exports = { getCarpoolLiveMap };

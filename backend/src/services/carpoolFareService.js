const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../constants/booking');
const { estimateDistanceKm, DEFAULT_FUEL_RATE_PER_KM } = require('../utils/ridePricing');
const { haversineRoadMeters } = require('./tripMetricsService');

const coordsFromPoint = (point) => {
  const c = point?.location?.coordinates || point?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: c[0], lat: c[1] };
};

const legKm = (from, to) => {
  const a = coordsFromPoint(from);
  const b = coordsFromPoint(to);
  if (!a || !b) return 0;
  return haversineRoadMeters(a, b) / 1000;
};

/** Extra km vs driving main route only (origin → destination). */
const passengerDetourKm = (mainOrigin, mainDest, pickup, dropoff) => {
  const mainKm = legKm(mainOrigin, mainDest);
  if (mainKm <= 0) return 0;
  const viaKm =
    legKm(mainOrigin, pickup) + legKm(pickup, dropoff) + legKm(dropoff, mainDest);
  return Math.max(0, Math.round((viaKm - mainKm) * 10) / 10);
};

const totalTripKm = (ride, passengerLegs) => {
  const mainKm =
    ride.pricing?.distanceKm ||
    estimateDistanceKm(
      ride.origin?.location?.coordinates,
      ride.destination?.location?.coordinates
    ) ||
    0;

  let detourKm = 0;
  for (const leg of passengerLegs) {
    detourKm += passengerDetourKm(ride.origin, ride.destination, leg.pickup, leg.dropoff);
  }

  return {
    mainKm: Math.round(mainKm * 10) / 10,
    detourKm: Math.round(detourKm * 10) / 10,
    totalKm: Math.round((mainKm + detourKm) * 10) / 10
  };
};

const fuelCostFromKm = (km, ride) => {
  const rate = ride.pricing?.fuelRatePerKm || DEFAULT_FUEL_RATE_PER_KM;
  const storedFuel = ride.pricing?.totalFuelCost;
  const mainKm =
    ride.pricing?.distanceKm ||
    estimateDistanceKm(
      ride.origin?.location?.coordinates,
      ride.destination?.location?.coordinates
    ) ||
    0;

  if (storedFuel && mainKm > 0 && km <= mainKm) {
    return Math.round((storedFuel / mainKm) * km);
  }
  return Math.round(km * rate);
};

/**
 * Split total fuel cost equally among passenger seats on the ride.
 * @param {object} ride
 * @param {object[]} confirmedBookings - confirmed bookings with pickup/dropoff
 * @param {object} [prospect] - { pickup, dropoff, seatsBooked } for quote
 */
const calculateCarpoolFareQuote = async (ride, { prospect = null } = {}) => {
  const confirmed = await Booking.find({
    rideId: ride._id,
    status: BOOKING_STATUS.CONFIRMED
  }).select('seatsBooked pickupPoint dropoffPoint');

  const confirmedLegs = confirmed.map((b) => ({
    pickup: b.pickupPoint,
    dropoff: b.dropoffPoint,
    seats: b.seatsBooked
  }));

  const prospectLegs = prospect
    ? [{ pickup: prospect.pickup, dropoff: prospect.dropoff, seats: prospect.seatsBooked || 1 }]
    : [];

  const currentLegs = [
    ...confirmedLegs.map((l) => ({ pickup: l.pickup, dropoff: l.dropoff })),
    ...prospectLegs.map((l) => ({ pickup: l.pickup, dropoff: l.dropoff }))
  ];

  const { mainKm, detourKm, totalKm } = totalTripKm(ride, currentLegs);
  const totalFuelCost = fuelCostFromKm(totalKm, ride);

  const confirmedSeats = confirmed.reduce((s, b) => s + b.seatsBooked, 0);
  const prospectSeats = prospect?.seatsBooked || 0;
  const seatsAfterJoin = confirmedSeats + prospectSeats;

  const costPerSeatNow =
    seatsAfterJoin > 0 ? Math.ceil(totalFuelCost / seatsAfterJoin) : Math.ceil(totalFuelCost);

  const fullCarMainKm =
    ride.pricing?.distanceKm ||
    estimateDistanceKm(
      ride.origin?.location?.coordinates,
      ride.destination?.location?.coordinates
    ) ||
    mainKm;
  const fullCarFuel = fuelCostFromKm(fullCarMainKm, ride);
  const totalPassengerSeats = Math.max(1, ride.totalSeats || 1);
  const costPerSeatIfFull = Math.ceil(fullCarFuel / totalPassengerSeats);

  const yourTotal = prospectSeats > 0 ? costPerSeatNow * prospectSeats : costPerSeatNow;

  return {
    mainDistanceKm: mainKm,
    detourDistanceKm: detourKm,
    totalDistanceKm: totalKm,
    totalFuelCost,
    confirmedPassengers: confirmedSeats,
    seatsAfterJoin,
    totalPassengerSeats,
    costPerSeatNow,
    costPerSeatIfFull,
    yourTotal,
    currency: ride.pricing?.currency || 'PKR',
    formula: `ceil(${totalFuelCost} PKR / ${seatsAfterJoin || totalPassengerSeats} seats)`
  };
};

module.exports = {
  passengerDetourKm,
  totalTripKm,
  calculateCarpoolFareQuote,
  fuelCostFromKm
};

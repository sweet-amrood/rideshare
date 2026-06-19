const Booking = require('../models/Booking');
const { BOOKING_STATUS } = require('../constants/booking');
const { MAX_DETOUR_KM } = require('../constants/carpoolRoute');
const { resolveRideRatePerKm } = require('./carpoolPricingService');
const {
  buildRouteState,
  findBestInsertion,
  computeOwnDistanceKm,
  commitPassengerRoute,
  roundKm
} = require('./routeService');

const getCostPerKm = async (ride) => resolveRideRatePerKm(ride);

const maxAllowedDetourKm = () => MAX_DETOUR_KM;

const checkDetourConstraints = (_oldDistanceKm, passengerDetourKm) => {
  const limit = MAX_DETOUR_KM;
  if (passengerDetourKm <= limit) {
    return { allowed: true, limitKm: limit };
  }
  return {
    allowed: false,
    limitKm: limit,
    reason: `Route detour ${passengerDetourKm} km exceeds the ${limit} km limit`
  };
};

const checkSeatCapacity = (ride, confirmedBookings, seatsRequested) => {
  const confirmedSeats = confirmedBookings.reduce((s, b) => s + b.seatsBooked, 0);
  const remaining = ride.totalSeats - confirmedSeats;
  if (seatsRequested > remaining) {
    return {
      allowed: false,
      reason: `Only ${Math.max(0, remaining)} seat(s) available on this ride`
    };
  }
  return { allowed: true, remainingSeats: remaining };
};

/**
 * Core fare evaluation for a new passenger against the current confirmed route.
 * Each passenger pays: ownDistance + incrementalDetour (never shares another's detour).
 */
const evaluatePassengerFare = async (
  ride,
  confirmedBookings,
  { pickup, dropoff, seatsBooked = 1, persistOnAccept = false, booking = null } = {}
) => {
  const seats = Math.max(1, parseInt(seatsBooked, 10) || 1);
  const routeState = await buildRouteState(ride, confirmedBookings);
  const costPerKm = await getCostPerKm(ride);

  const seatCheck = checkSeatCapacity(ride, confirmedBookings, seats);
  if (!seatCheck.allowed) {
    return {
      accepted: false,
      rejectionReason: seatCheck.reason,
      oldDistance: routeState.currentTotalDistanceKm,
      newDistance: routeState.currentTotalDistanceKm,
      passengerOwnDistance: 0,
      passengerDetour: 0,
      totalFareDistance: 0,
      fareAmount: 0,
      bestRoute: routeState.waypoints,
      costPerKm,
      ratePerKm: costPerKm,
      hasAC: ride.amenities?.hasAC !== false
    };
  }

  const insertion = await findBestInsertion(routeState, pickup, dropoff);
  if (!insertion.ok) {
    return {
      accepted: false,
      rejectionReason: insertion.reason,
      oldDistance: routeState.currentTotalDistanceKm,
      newDistance: routeState.currentTotalDistanceKm,
      passengerOwnDistance: 0,
      passengerDetour: 0,
      totalFareDistance: 0,
      fareAmount: 0,
      bestRoute: routeState.waypoints,
      costPerKm,
      ratePerKm: costPerKm,
      hasAC: ride.amenities?.hasAC !== false
    };
  }

  const oldDistance = insertion.oldDistance;
  const newDistance = insertion.newDistance;
  const passengerDetour = roundKm(Math.max(0, newDistance - oldDistance));
  const passengerOwnDistance = await computeOwnDistanceKm(pickup, dropoff);

  const detourCheck = checkDetourConstraints(oldDistance, passengerDetour);
  if (!detourCheck.allowed) {
    return {
      accepted: false,
      rejectionReason: detourCheck.reason,
      bestRoute: insertion.bestRoute,
      oldDistance,
      newDistance,
      passengerOwnDistance,
      passengerDetour,
      totalFareDistance: 0,
      fareAmount: 0,
      costPerKm,
      ratePerKm: costPerKm,
      hasAC: ride.amenities?.hasAC !== false,
      detourLimitKm: detourCheck.limitKm
    };
  }

  const totalFareDistance = roundKm(passengerOwnDistance + passengerDetour);
  const tripFareRs = Math.ceil(passengerOwnDistance * costPerKm);
  const detourFareRs = Math.ceil(passengerDetour * costPerKm);
  const farePerSeat = Math.max(1, tripFareRs + detourFareRs);
  const fareAmount = farePerSeat * seats;

  const result = {
    accepted: true,
    bestRoute: insertion.bestRoute,
    oldDistance,
    newDistance,
    passengerOwnDistance,
    passengerDetour,
    totalFareDistance,
    tripFareRs,
    detourFareRs,
    fareAmount,
    farePerSeat,
    costPerKm,
    ratePerKm: costPerKm,
    hasAC: ride.amenities?.hasAC !== false,
    seatsBooked: seats,
    formula: `(ceil(${passengerOwnDistance} km × ${roundKm(costPerKm)}) + ceil(${passengerDetour} km × ${roundKm(costPerKm)})) × ${seats} seat(s) = ${fareAmount} PKR`,
    detourLimitKm: detourCheck.limitKm,
    routePassengerCount: confirmedBookings.length
  };

  if (persistOnAccept && booking) {
    await commitPassengerRoute(ride, booking, insertion.bestRoute, newDistance);
  }

  return result;
};

const loadConfirmedBookings = async (rideId) =>
  Booking.find({
    rideId,
    status: BOOKING_STATUS.CONFIRMED
  })
    .select('seatsBooked pickupPoint dropoffPoint passengerId')
    .sort({ createdAt: 1 });

/**
 * Quote API — prospect only; confirmed passengers' fares are never recalculated.
 */
const quotePassengerFare = async (ride, prospect = null) => {
  const confirmed = await loadConfirmedBookings(ride._id);

  if (!prospect) {
    prospect = {
      pickup: ride.origin,
      dropoff: ride.destination,
      seatsBooked: 1
    };
  }

  const evaluation = await evaluatePassengerFare(ride, confirmed, {
    pickup: prospect.pickup,
    dropoff: prospect.dropoff,
    seatsBooked: prospect.seatsBooked || 1
  });

  const confirmedSeats = confirmed.reduce((s, b) => s + b.seatsBooked, 0);
  const seatsAfterJoin = evaluation.accepted
    ? confirmedSeats + (prospect.seatsBooked || 1)
    : confirmedSeats;

  const fullRouteKm =
    ride.route?.currentTotalDistanceKm || ride.pricing?.distanceKm || evaluation.oldDistance;
  const costPerKm = evaluation.costPerKm;
  const fullRouteFare = Math.round(fullRouteKm * costPerKm);
  const costPerSeatIfFull = Math.ceil(fullRouteFare / Math.max(1, ride.totalSeats));

  const passengerFarePerSeat = evaluation.accepted ? evaluation.farePerSeat : null;
  const passengerTotal = evaluation.accepted ? evaluation.fareAmount : null;

  return {
    ...evaluation,
    currency: ride.pricing?.currency || 'PKR',
    mainDistanceKm: evaluation.passengerOwnDistance,
    detourDistanceKm: evaluation.passengerDetour,
    totalDistanceKm: evaluation.totalFareDistance,
    tripFareRs: evaluation.tripFareRs ?? 0,
    detourFareRs: evaluation.detourFareRs ?? 0,
    totalFareCost: passengerTotal,
    totalFuelCost: passengerTotal,
    costPerSeatNow: passengerFarePerSeat,
    farePerSeat: passengerFarePerSeat,
    yourTotal: passengerTotal,
    costPerSeatIfFull,
    confirmedPassengers: confirmedSeats,
    seatsAfterJoin,
    totalPassengerSeats: ride.totalSeats,
    currentRouteDistanceKm: evaluation.oldDistance,
    projectedRouteDistanceKm: evaluation.newDistance
  };
};

module.exports = {
  getCostPerKm,
  maxAllowedDetourKm,
  checkDetourConstraints,
  evaluatePassengerFare,
  quotePassengerFare,
  loadConfirmedBookings,
  commitPassengerRoute
};

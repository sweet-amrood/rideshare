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

/** Legacy heuristic — superseded by routeService + fareService. */
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

module.exports = {
  passengerDetourKm,
  totalTripKm,
  fuelCostFromKm
};

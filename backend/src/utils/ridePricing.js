const { haversineRoadMeters } = require('../services/tripMetricsService');

const DEFAULT_FUEL_RATE_PER_KM = 12; // PKR per km heuristic when fuel not provided

/**
 * Split fuel cost equally among passenger seats (driver does not pay a "seat").
 */
const calculateSeatPricing = ({
  totalFuelCost,
  passengerSeats,
  distanceKm,
  autoFuelFromDistance = true
}) => {
  const seats = Math.max(1, parseInt(passengerSeats, 10) || 1);
  let fuel = parseFloat(totalFuelCost);

  if ((!fuel || fuel <= 0) && distanceKm && autoFuelFromDistance) {
    fuel = Math.round(parseFloat(distanceKm) * DEFAULT_FUEL_RATE_PER_KM);
  }

  if (!fuel || fuel <= 0) {
    fuel = seats * 200;
  }

  const costPerSeat = Math.ceil(fuel / seats);

  return {
    totalFuelCost: Math.round(fuel),
    passengerSeats: seats,
    costPerSeat,
    distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
    currency: 'PKR',
    formula: `ceil(${Math.round(fuel)} / ${seats} passenger seats)`
  };
};

const estimateDistanceKm = (originCoords, destCoords) => {
  if (!originCoords?.length || !destCoords?.length) return null;
  const [oLng, oLat] = originCoords;
  const [dLng, dLat] = destCoords;
  const meters = haversineRoadMeters(
    { lat: oLat, lng: oLng },
    { lat: dLat, lng: dLng }
  );
  return Math.round((meters / 1000) * 10) / 10;
};

module.exports = { calculateSeatPricing, estimateDistanceKm, DEFAULT_FUEL_RATE_PER_KM };

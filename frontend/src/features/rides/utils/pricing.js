const DEFAULT_FUEL_RATE_PER_KM = 12;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function estimateDistanceKm(originCoords, destCoords) {
  if (!originCoords?.length || !destCoords?.length) return null;
  const [oLng, oLat] = originCoords;
  const [dLng, dLat] = destCoords;
  return Math.round(haversineKm(oLat, oLng, dLat, dLng) * 10) / 10;
}

export function calculateSeatPricing({
  totalFuelCost,
  passengerSeats,
  distanceKm,
  autoFuelFromDistance = true
}) {
  const seats = Math.max(1, parseInt(passengerSeats, 10) || 1);
  let fuel = parseFloat(totalFuelCost);

  if ((!fuel || fuel <= 0) && distanceKm && autoFuelFromDistance) {
    fuel = Math.round(parseFloat(distanceKm) * DEFAULT_FUEL_RATE_PER_KM);
  }
  if (!fuel || fuel <= 0) fuel = seats * 200;

  const costPerSeat = Math.ceil(fuel / seats);
  return {
    totalFuelCost: Math.round(fuel),
    passengerSeats: seats,
    costPerSeat,
    distanceKm: distanceKm ? Math.round(distanceKm * 10) / 10 : null,
    currency: 'PKR'
  };
}

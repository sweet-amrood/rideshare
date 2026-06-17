/**
 * On-demand fare model:
 *   trip fare = ratePerKm × distanceKm × nightMultiplier × peakMultiplier
 *   optional floor: max(trip fare, minimumFare)
 *
 * Example (BIKE, 7 km, rate 25, night 1.15):
 *   25 × 7 × 1.15 = 201.25 → Rs. 201
 */

const buildFareFormula = ({
  vehicleType,
  ratePerKm,
  distanceKm,
  nightMultiplier,
  peakMultiplier
}) => {
  const surcharges = [];
  if (nightMultiplier > 1) surcharges.push(`night ${nightMultiplier}`);
  if (peakMultiplier > 1) surcharges.push(`peak ${peakMultiplier}`);

  let line = `Platform rates (${vehicleType}): Rs. ${ratePerKm}/km × ${distanceKm} km`;
  if (surcharges.length) {
    line += ` × surcharges ${surcharges.join(' ')}`;
  }
  return line;
};

const computeFareBreakdown = (ratePerKm, distanceKm, nightMult, peakMult, minimumFare = 0) => {
  const subtotal = ratePerKm * distanceKm;
  const withSurcharges = subtotal * nightMult * peakMult;
  const raw = Math.max(withSurcharges, minimumFare);
  return {
    ratePerKm,
    subtotal: Math.round(subtotal * 100) / 100,
    withSurcharges: Math.round(withSurcharges * 100) / 100,
    raw: Math.round(raw * 100) / 100
  };
};

module.exports = { buildFareFormula, computeFareBreakdown };

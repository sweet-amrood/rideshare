const { getFareSettings } = require('./fareEstimationService');
const { getVehicleRate } = require('../utils/fareSettingsHelpers');
const { estimateDistanceKm } = require('../utils/ridePricing');

const DEFAULT_AC_PREMIUM = 1.15;

/**
 * Platform per-km rate for carpool (from admin fare settings).
 * Non-AC uses base CAR rate; AC applies acPremiumMultiplier.
 */
const getCarpoolRatePerKm = async ({ hasAC = true, vehicleType = 'CAR' } = {}) => {
  const settings = await getFareSettings();
  const baseRate = getVehicleRate(settings, vehicleType).perKmRate;
  const premium = Number(settings.acPremiumMultiplier);
  const acMult = hasAC ? (Number.isFinite(premium) && premium > 0 ? premium : DEFAULT_AC_PREMIUM) : 1;
  return Math.round(baseRate * acMult * 100) / 100;
};

/**
 * Driver publish preview — equal split of route fare among passenger seats.
 */
const estimateCarpoolPublishPricing = async ({
  distanceKm,
  totalSeats = 1,
  hasAC = true,
  vehicleType = 'CAR'
} = {}) => {
  const settings = await getFareSettings();
  const km = Math.max(0, Number(distanceKm) || 0);
  const seats = Math.max(1, parseInt(totalSeats, 10) || 1);
  const ratePerKm = await getCarpoolRatePerKm({ hasAC, vehicleType });
  const totalFareCost = Math.ceil(km * ratePerKm);
  const costPerSeat = Math.max(1, Math.ceil(totalFareCost / seats));

  return {
    ratePerKm,
    platformRatePerKm: ratePerKm,
    distanceKm: km,
    totalFareCost,
    totalFuelCost: totalFareCost,
    costPerSeat,
    passengerSeats: seats,
    hasAC: !!hasAC,
    acPremiumApplied: !!hasAC,
    currency: settings.currency || 'PKR',
    formula: `${ratePerKm} PKR/km × ${km} km = ${totalFareCost} PKR ÷ ${seats} seats`
  };
};

const resolveRideRatePerKm = async (ride) => {
  if (ride.pricing?.platformRatePerKm > 0) return ride.pricing.platformRatePerKm;
  if (ride.pricing?.fuelRatePerKm > 0) return ride.pricing.fuelRatePerKm;
  return getCarpoolRatePerKm({ hasAC: ride.amenities?.hasAC !== false });
};

module.exports = {
  DEFAULT_AC_PREMIUM,
  getCarpoolRatePerKm,
  estimateCarpoolPublishPricing,
  resolveRideRatePerKm,
  estimateDistanceKm
};

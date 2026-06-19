/**
 * @deprecated Use fareService — kept as a thin adapter for existing imports.
 */
const { quotePassengerFare } = require('./fareService');
const { passengerDetourKm, totalTripKm, fuelCostFromKm } = require('./carpoolFareLegacy');

const calculateCarpoolFareQuote = async (ride, { prospect = null } = {}) =>
  quotePassengerFare(ride, prospect);

module.exports = {
  passengerDetourKm,
  totalTripKm,
  calculateCarpoolFareQuote,
  fuelCostFromKm
};

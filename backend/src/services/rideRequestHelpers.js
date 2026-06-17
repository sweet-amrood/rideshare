const { etaFromDistanceKm } = require('./tripMetricsService');

const driverEtaMinutes = (distanceKm, vehicleType = 'CAR') =>
  etaFromDistanceKm(distanceKm, vehicleType);

module.exports = { driverEtaMinutes };

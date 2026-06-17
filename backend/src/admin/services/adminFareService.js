/** Admin fare CRUD uses the same service as passenger/driver pricing. */
const fareEstimationService = require('../../services/fareEstimationService');

module.exports = {
  getFareSettings: fareEstimationService.getFareSettings,
  updateFareSettings: fareEstimationService.updateFareSettings
};

/**
 * Eager-load Mongoose models so populate() works on any route
 * (avoids MissingSchemaError when Community etc. were never required).
 */
module.exports = function registerModels() {
  require('../models/User');
  require('../models/Community');
  require('../models/Vehicle');
  require('../models/Review');
  require('../models/Ride');
  require('../models/Booking');
  require('../models/UserDocument');
  require('../models/VerificationRequest');
  require('../models/Notification');
  require('../models/Report');
  require('../models/Chat');
  require('../models/FareSettings');
  require('../models/RideRequest');
};

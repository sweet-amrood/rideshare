/** Strip invalid GeoJSON points so MongoDB 2dsphere index does not reject saves. */
const sanitizeDriverAvailability = (user) => {
  if (!user?.driverAvailability) return;
  const loc = user.driverAvailability.location;
  const coords = loc?.coordinates;
  if (
    loc &&
    (!Array.isArray(coords) || coords.length !== 2 || coords.some((c) => c == null || Number.isNaN(c)))
  ) {
    user.driverAvailability.location = undefined;
    user.markModified?.('driverAvailability');
  }
};

module.exports = { sanitizeDriverAvailability };

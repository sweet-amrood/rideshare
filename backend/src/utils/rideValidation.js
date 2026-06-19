const SMOKING = ['NO', 'YES', 'OUTSIDE_ONLY', 'FLEXIBLE'];
const LUGGAGE = ['NONE', 'SMALL', 'MEDIUM', 'LARGE'];
const RIDE_TYPES = ['ONE_TIME', 'RECURRING'];

const validateOfferPayload = (body) => {
  const errors = [];

  if (!body.vehicleId) errors.push('vehicleId is required');
  if (!body.originAddress || !body.originCoords?.length) errors.push('Origin route is required');
  if (!body.destinationAddress || !body.destinationCoords?.length) errors.push('Destination route is required');

  const seats = parseInt(body.totalSeats, 10);
  if (!seats || seats < 1 || seats > 6) errors.push('totalSeats must be between 1 and 6');

  if (!body.departureDate && body.rideType !== 'RECURRING') {
    errors.push('departureDate is required for one-time rides');
  }

  const rideType = body.rideType || (body.isRecurring ? 'RECURRING' : 'ONE_TIME');
  if (!RIDE_TYPES.includes(rideType)) errors.push('Invalid rideType');

  if (rideType === 'RECURRING') {
    const days = body.recurrenceDays || body.recurrence?.daysOfWeek || [];
    if (!days.length) errors.push('Select at least one day for recurring rides');
    if (!body.departureTime && !body.recurrence?.departureTime) {
      errors.push('departureTime is required for recurring rides');
    }
  }

  if (body.amenities?.smoking && !SMOKING.includes(body.amenities.smoking)) {
    errors.push('Invalid smoking preference');
  }
  if (body.amenities?.luggageAllowed && !LUGGAGE.includes(body.amenities.luggageAllowed)) {
    errors.push('Invalid luggage option');
  }

  const sideDetour = body.restrictions?.sideDetourKm;
  if (sideDetour != null && sideDetour !== '') {
    const side = parseFloat(sideDetour);
    if (!Number.isFinite(side) || side < 1 || side > 15) {
      errors.push('Pickup/destination range must be between 1 and 15 km per side');
    }
  }

  const o = body.originCoords;
  const d = body.destinationCoords;
  if (o && d && o[0] === d[0] && o[1] === d[1]) {
    errors.push('Origin and destination must be different');
  }

  return { valid: errors.length === 0, errors, rideType };
};

const passengerMeetsRestrictions = (ride, passenger) => {
  const r = ride.restrictions || {};
  const gender = (passenger.profile?.gender || '').toUpperCase();

  if (r.womenOnly && gender !== 'FEMALE') {
    return { ok: false, message: 'This ride is for women passengers only' };
  }

  if (r.universityOnly) {
    const org = (passenger.profile?.universityOrCompany || '').trim();
    if (!org) {
      return { ok: false, message: 'This ride is restricted to university members' };
    }
  }

  if (r.officeOnly) {
    const org = (passenger.profile?.universityOrCompany || '').toLowerCase();
    if (!org) {
      return { ok: false, message: 'This ride is restricted to office / corporate members' };
    }
  }

  return { ok: true };
};

module.exports = {
  validateOfferPayload,
  passengerMeetsRestrictions,
  SMOKING,
  LUGGAGE,
  RIDE_TYPES
};

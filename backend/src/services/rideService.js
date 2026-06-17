const Ride = require('../models/Ride');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { haversineMeters } = require('../utils/geo');
const { calculateSeatPricing, estimateDistanceKm } = require('../utils/ridePricing');
const { generateOccurrenceDates, matchesRecurrenceDay } = require('../utils/rideRecurrence');
const { validateOfferPayload, passengerMeetsRestrictions } = require('../utils/rideValidation');
const { seatSummary } = require('../utils/rideSeats');

const buildRideDoc = (payload, driverId, vehicleId, departureDate, seriesId = null) => {
  const {
    originAddress,
    originCoords,
    destinationAddress,
    destinationCoords,
    totalSeats,
    pricing,
    costPerSeat,
    rideType,
    isRecurring,
    recurrence,
    restrictions,
    amenities,
    allowedCommunities,
    notes
  } = payload;

  return {
    driverId,
    vehicleId,
    seriesId,
    rideType: rideType || 'ONE_TIME',
    isRecurring: rideType === 'RECURRING' || !!isRecurring,
    recurrence: {
      daysOfWeek: recurrence?.daysOfWeek || [],
      departureTime: recurrence?.departureTime || '',
      endDate: recurrence?.endDate || null,
      weeksAhead: recurrence?.weeksAhead || 4
    },
    origin: {
      address: originAddress,
      location: { type: 'Point', coordinates: originCoords }
    },
    destination: {
      address: destinationAddress,
      location: { type: 'Point', coordinates: destinationCoords }
    },
    totalSeats,
    availableSeats: totalSeats,
    bookedSeats: 0,
    costPerSeat,
    pricing: {
      totalFuelCost: pricing?.totalFuelCost || 0,
      distanceKm: pricing?.distanceKm || 0,
      currency: pricing?.currency || 'PKR',
      splitAmong: pricing?.splitAmong || totalSeats
    },
    restrictions: {
      womenOnly: !!restrictions?.womenOnly,
      universityOnly: !!restrictions?.universityOnly,
      officeOnly: !!restrictions?.officeOnly
    },
    amenities: {
      luggageAllowed: amenities?.luggageAllowed || 'SMALL',
      hasAC: amenities?.hasAC !== false,
      smoking: amenities?.smoking || 'NO'
    },
    departureDate: new Date(departureDate),
    allowedCommunities: allowedCommunities || [],
    notes: notes || ''
  };
};

const ensureDriverRole = async (userId) => {
  const user = await User.findById(userId);
  if (!user.roles.includes('DRIVER')) {
    user.roles.push('DRIVER');
    await user.save();
  }
  return user;
};

const offerRide = async (userId, body) => {
  const validation = validateOfferPayload(body);
  if (!validation.valid) {
    const err = new Error(validation.errors.join('; '));
    err.statusCode = 400;
    throw err;
  }

  const vehicle = await Vehicle.findOne({ _id: body.vehicleId, ownerId: userId });
  if (!vehicle) {
    const err = new Error('Vehicle not found or does not belong to you');
    err.statusCode = 400;
    throw err;
  }
  if (vehicle.vehicleType !== 'CAR') {
    const err = new Error(
      'Carpool rides can only be published with a registered car. Use on-demand requests for bike or rickshaw.'
    );
    err.statusCode = 400;
    throw err;
  }
  if (vehicle.verificationStatus !== 'APPROVED') {
    const err = new Error('Your car must be approved before publishing a carpool');
    err.statusCode = 403;
    throw err;
  }

  await ensureDriverRole(userId);

  const driverUser = await User.findById(userId);
  const driverVehicles = await Vehicle.find({ ownerId: userId });
  const { isDriverSetupComplete } = require('../utils/driverSetupHelpers');
  if (!isDriverSetupComplete(driverUser, driverVehicles)) {
    const err = new Error(
      'Complete driver setup: register your ride (car, bike, or rickshaw) and upload CNIC, selfie, and license.'
    );
    err.statusCode = 403;
    throw err;
  }

  const distanceKm =
    body.distanceKm ||
    estimateDistanceKm(body.originCoords, body.destinationCoords);

  const totalSeats = parseInt(body.totalSeats, 10);
  const pricingResult = calculateSeatPricing({
    totalFuelCost: body.totalFuelCost ?? body.pricing?.totalFuelCost,
    passengerSeats: totalSeats,
    distanceKm,
    autoFuelFromDistance: body.autoFuelFromDistance !== false
  });

  const costPerSeat = body.costPerSeat ?? pricingResult.costPerSeat;
  const rideType = validation.rideType;

  const payload = {
    ...body,
    totalSeats,
    costPerSeat,
    rideType,
    pricing: {
      totalFuelCost: pricingResult.totalFuelCost,
      distanceKm: pricingResult.distanceKm,
      currency: 'PKR',
      splitAmong: totalSeats
    },
    recurrence: {
      daysOfWeek: body.recurrenceDays || body.recurrence?.daysOfWeek || [],
      departureTime: body.departureTime || body.recurrence?.departureTime || '08:00',
      endDate: body.recurrenceEndDate || body.recurrence?.endDate,
      weeksAhead: body.weeksAhead || body.recurrence?.weeksAhead || 4
    }
  };

  if (rideType === 'RECURRING') {
    const start = body.departureDate || new Date();
    const dates = generateOccurrenceDates(
      start,
      payload.recurrence.daysOfWeek,
      payload.recurrence.departureTime,
      payload.recurrence.weeksAhead
    );

    if (!dates.length) {
      const err = new Error('No recurring dates could be generated from your selection');
      err.statusCode = 400;
      throw err;
    }

    const rides = [];
    let seriesId = null;

    for (let i = 0; i < dates.length; i++) {
      const doc = buildRideDoc(
        { ...payload, rideType: 'RECURRING', isRecurring: true },
        userId,
        vehicle._id,
        dates[i],
        seriesId
      );
      const ride = await Ride.create(doc);
      if (!seriesId) {
        seriesId = ride._id;
        ride.seriesId = seriesId;
        await ride.save();
      } else {
        ride.seriesId = seriesId;
        await ride.save();
      }
      rides.push(ride);
    }

    return { rides, primary: rides[0], count: rides.length };
  }

  const departureDate = body.departureDate;
  const doc = buildRideDoc(
    { ...payload, rideType: 'ONE_TIME', isRecurring: false },
    userId,
    vehicle._id,
    departureDate
  );
  const ride = await Ride.create(doc);
  return { rides: [ride], primary: ride, count: 1 };
};

const estimatePrice = (body) => {
  const distanceKm =
    body.distanceKm ||
    estimateDistanceKm(body.originCoords, body.destinationCoords);
  return calculateSeatPricing({
    totalFuelCost: body.totalFuelCost,
    passengerSeats: body.totalSeats || body.passengerSeats || 1,
    distanceKm,
    autoFuelFromDistance: body.autoFuelFromDistance !== false
  });
};

const searchRides = async (filters, passenger = null) => {
  const {
    originLng,
    originLat,
    destLng,
    destLat,
    communityId,
    departureDate,
    womenOnly,
    universityOnly,
    officeOnly,
    hasAC,
    smoking,
    luggageAllowed,
    vehicleType,
    seatsNeeded
  } = filters;

  if (!originLng || !originLat) {
    const err = new Error('Origin coordinates are required');
    err.statusCode = 400;
    throw err;
  }

  const searchRange = parseInt(filters.radiusMeters, 10) || 5000;

  const query = {
    status: 'SCHEDULED',
    availableSeats: { $gt: 0 },
    'origin.location': {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(originLng), parseFloat(originLat)]
        },
        $maxDistance: searchRange
      }
    }
  };

  if (communityId) query.allowedCommunities = communityId;
  if (womenOnly) query['restrictions.womenOnly'] = true;
  if (universityOnly) query['restrictions.universityOnly'] = true;
  if (officeOnly) query['restrictions.officeOnly'] = true;
  if (hasAC === true || hasAC === 'true') query['amenities.hasAC'] = true;
  if (smoking) query['amenities.smoking'] = smoking;
  if (luggageAllowed) query['amenities.luggageAllowed'] = luggageAllowed;

  let rides = await Ride.find(query)
    .populate('driverId', 'name rating verification profile')
    .populate('vehicleId')
    .limit(50);

  if (destLng && destLat) {
    const targetDestLng = parseFloat(destLng);
    const targetDestLat = parseFloat(destLat);
    rides = rides.filter((ride) => {
      const [lng, lat] = ride.destination.location.coordinates;
      return haversineMeters(lat, lng, targetDestLat, targetDestLng) <= searchRange;
    });
  }

  if (departureDate) {
    const searchDayStart = new Date(departureDate);
    searchDayStart.setHours(0, 0, 0, 0);
    const searchDayEnd = new Date(departureDate);
    searchDayEnd.setHours(23, 59, 59, 999);

    rides = rides.filter((ride) => {
      if (ride.rideType === 'RECURRING' || ride.isRecurring) {
        return matchesRecurrenceDay(ride, departureDate);
      }
      const rideDate = new Date(ride.departureDate);
      return rideDate >= searchDayStart && rideDate <= searchDayEnd;
    });
  }

  if (passenger) {
    rides = rides.filter((ride) => passengerMeetsRestrictions(ride, passenger).ok);
  }

  if (vehicleType && ['CAR', 'BIKE', 'RICKSHAW'].includes(vehicleType)) {
    rides = rides.filter(
      (ride) => (ride.vehicleId?.vehicleType || 'CAR') === vehicleType
    );
  }

  const seats = parseInt(seatsNeeded, 10);
  if (seats > 0) {
    rides = rides.filter((ride) => ride.availableSeats >= seats);
  }

  if (luggageAllowed) {
    const order = ['NONE', 'SMALL', 'MEDIUM', 'LARGE'];
    const needIdx = order.indexOf(luggageAllowed);
    if (needIdx >= 0) {
      rides = rides.filter((ride) => {
        const lug = ride.amenities?.luggageAllowed || 'SMALL';
        return order.indexOf(lug) >= needIdx;
      });
    }
  }

  return rides.map((r) => {
    const obj = r.toObject();
    obj.seatSummary = seatSummary(r);
    return obj;
  });
};

const getMyOffers = async (driverId, status) => {
  const query = { driverId };
  if (status) query.status = status;
  return Ride.find(query)
    .populate('vehicleId')
    .sort({ departureDate: 1 })
    .limit(100);
};

const updateRide = async (rideId, driverId, updates) => {
  const ride = await Ride.findOne({ _id: rideId, driverId });
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }
  if (ride.status !== 'SCHEDULED') {
    const err = new Error('Only scheduled rides can be updated');
    err.statusCode = 400;
    throw err;
  }
  if ((ride.bookedSeats || 0) > 0 && updates.totalSeats) {
    const err = new Error('Cannot change total seats after bookings exist');
    err.statusCode = 400;
    throw err;
  }

  const allowed = [
    'notes',
    'costPerSeat',
    'amenities',
    'restrictions',
    'departureDate'
  ];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'amenities' || key === 'restrictions') {
        ride[key] = { ...ride[key].toObject?.() || ride[key], ...updates[key] };
      } else {
        ride[key] = updates[key];
      }
    }
  }

  if (updates.totalFuelCost && ride.totalSeats) {
    const p = calculateSeatPricing({
      totalFuelCost: updates.totalFuelCost,
      passengerSeats: ride.totalSeats,
      distanceKm: ride.pricing?.distanceKm
    });
    ride.costPerSeat = updates.costPerSeat ?? p.costPerSeat;
    ride.pricing.totalFuelCost = p.totalFuelCost;
  }

  await ride.save();
  return ride;
};

const cancelRide = async (rideId, driverId, cancelSeries = false) => {
  const ride = await Ride.findOne({ _id: rideId, driverId });
  if (!ride) {
    const err = new Error('Ride not found');
    err.statusCode = 404;
    throw err;
  }

  if (cancelSeries) {
    const seriesRoot = ride.seriesId || ride._id;
    await Ride.updateMany(
      {
        $or: [{ _id: seriesRoot }, { seriesId: seriesRoot }],
        driverId,
        status: 'SCHEDULED'
      },
      { status: 'CANCELLED' }
    );
    return { cancelled: 'series' };
  }

  ride.status = 'CANCELLED';
  await ride.save();
  return { cancelled: 'single', ride };
};

module.exports = {
  offerRide,
  estimatePrice,
  searchRides,
  getMyOffers,
  updateRide,
  cancelRide,
  buildRideDoc
};

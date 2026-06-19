const Ride = require('../models/Ride');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');
const { haversineMeters } = require('../utils/geo');
const { calculateSeatPricing, estimateDistanceKm } = require('../utils/ridePricing');
const { generateOccurrenceDates, matchesRecurrenceDay } = require('../utils/rideRecurrence');
const { validateOfferPayload, passengerMeetsRestrictions } = require('../utils/rideValidation');
const { seatSummary } = require('../utils/rideSeats');
const { attachLiveSeatFields } = require('./seatSyncService');
const { initializeRideRoute } = require('./routeService');
const { estimateCarpoolPublishPricing } = require('./carpoolPricingService');
const { quotePassengerFare } = require('./fareService');
const {
  DEFAULT_SIDE_DETOUR_KM,
  MAX_SIDE_DETOUR_KM
} = require('../constants/carpoolRoute');

const getSideDetourKm = (ride) => {
  const v = ride.restrictions?.sideDetourKm;
  if (Number.isFinite(v) && v >= 1) return Math.min(MAX_SIDE_DETOUR_KM, v);
  return DEFAULT_SIDE_DETOUR_KM;
};

const passengerWithinSideDetour = (ride, passengerLat, passengerLng, destLat, destLng) => {
  const sideM = getSideDetourKm(ride) * 1000;
  const [oLng, oLat] = ride.origin.location.coordinates;
  if (haversineMeters(passengerLat, passengerLng, oLat, oLng) > sideM) return false;
  if (destLat == null || destLng == null) return true;
  const [dLng, dLat] = ride.destination.location.coordinates;
  return haversineMeters(destLat, destLng, dLat, dLng) <= sideM;
};

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
      platformRatePerKm: pricing?.platformRatePerKm || pricing?.fuelRatePerKm || 0,
      fuelRatePerKm: pricing?.platformRatePerKm || pricing?.fuelRatePerKm || 0,
      acPremiumApplied: !!pricing?.acPremiumApplied,
      currency: pricing?.currency || 'PKR',
      splitAmong: pricing?.splitAmong || totalSeats
    },
    restrictions: {
      womenOnly: !!restrictions?.womenOnly,
      universityOnly: !!restrictions?.universityOnly,
      officeOnly: !!restrictions?.officeOnly,
      sideDetourKm: Math.min(
        MAX_SIDE_DETOUR_KM,
        Math.max(1, parseFloat(restrictions?.sideDetourKm) || DEFAULT_SIDE_DETOUR_KM)
      )
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
  const hasAC = body.amenities?.hasAC !== false;
  const pricingResult = await estimateCarpoolPublishPricing({
    distanceKm,
    totalSeats,
    hasAC
  });

  const costPerSeat = pricingResult.costPerSeat;
  const rideType = validation.rideType;

  const payload = {
    ...body,
    totalSeats,
    costPerSeat,
    rideType,
    pricing: {
      totalFuelCost: pricingResult.totalFareCost,
      distanceKm: pricingResult.distanceKm,
      platformRatePerKm: pricingResult.platformRatePerKm,
      fuelRatePerKm: pricingResult.platformRatePerKm,
      acPremiumApplied: pricingResult.acPremiumApplied,
      currency: pricingResult.currency,
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
      await initializeRideRoute(ride);
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
  await initializeRideRoute(ride);
  return { rides: [ride], primary: ride, count: 1 };
};

const estimatePrice = async (body) => {
  const distanceKm =
    body.distanceKm ||
    estimateDistanceKm(body.originCoords, body.destinationCoords);
  return estimateCarpoolPublishPricing({
    distanceKm,
    totalSeats: body.totalSeats || body.passengerSeats || 1,
    hasAC: body.hasAC !== false && body.amenities?.hasAC !== false
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

  const passengerLat = parseFloat(originLat);
  const passengerLng = parseFloat(originLng);
  const targetDestLat = destLat != null && destLng != null ? parseFloat(destLat) : null;
  const targetDestLng = destLat != null && destLng != null ? parseFloat(destLng) : null;
  const geoQueryRadiusM = MAX_SIDE_DETOUR_KM * 1000;

  const query = {
    status: 'SCHEDULED',
    'origin.location': {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [passengerLng, passengerLat]
        },
        $maxDistance: geoQueryRadiusM
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

  rides = rides.filter((ride) =>
    passengerWithinSideDetour(ride, passengerLat, passengerLng, targetDestLat, targetDestLng)
  );

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

  const seats = parseInt(seatsNeeded, 10);

  const seatsRequested = seats > 0 ? seats : 1;

  const enriched = await Promise.all(
    rides.map(async (r) => {
      const live = await attachLiveSeatFields(r);
      if (!live) return null;

      if (targetDestLat != null && targetDestLng != null) {
        const quote = await quotePassengerFare(live.ride, {
          pickup: {
            address: filters.pickupAddress || '',
            location: { type: 'Point', coordinates: [passengerLng, passengerLat] }
          },
          dropoff: {
            address: filters.dropoffAddress || '',
            location: { type: 'Point', coordinates: [targetDestLng, targetDestLat] }
          },
          seatsBooked: seatsRequested
        });

        const obj = live.ride.toObject();
        obj.seatSummary = live.seatSummary;
        obj.availableSeats = live.seatSummary.effectiveAvailable;
        obj.bookedSeats = live.seatSummary.bookedSeats;
        obj.pendingSeats = live.pendingSeats;
        obj.vehicleType = live.ride.vehicleId?.vehicleType || 'CAR';
        obj.farePreview = {
          accepted: quote.accepted,
          rejectionReason: quote.rejectionReason,
          costPerSeatNow: quote.costPerSeatNow,
          farePerSeat: quote.farePerSeat,
          yourTotal: quote.yourTotal,
          totalDistanceKm: quote.totalDistanceKm,
          detourDistanceKm: quote.detourDistanceKm,
          mainDistanceKm: quote.mainDistanceKm,
          tripFareRs: quote.tripFareRs,
          detourFareRs: quote.detourFareRs,
          ratePerKm: quote.ratePerKm,
          costPerKm: quote.costPerKm,
          hasAC: quote.hasAC,
          totalFareCost: quote.totalFareCost,
          seatsBooked: seatsRequested,
          costPerSeatIfFull: quote.costPerSeatIfFull,
          formula: quote.formula
        };
        if (!quote.accepted) return null;
        return obj;
      }

      const obj = live.ride.toObject();
      obj.seatSummary = live.seatSummary;
      obj.availableSeats = live.seatSummary.effectiveAvailable;
      obj.bookedSeats = live.seatSummary.bookedSeats;
      obj.pendingSeats = live.pendingSeats;
      obj.vehicleType = live.ride.vehicleId?.vehicleType || 'CAR';
      return obj;
    })
  );

  let result = enriched.filter(Boolean);

  if (seats > 0) {
    result = result.filter((ride) => ride.availableSeats >= seats);
  }

  return result;
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

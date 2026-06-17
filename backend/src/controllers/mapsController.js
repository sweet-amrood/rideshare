const Ride = require('../models/Ride');
const {
  getBrowserKey,
  placeAutocomplete,
  placeDetails,
  getDirections,
  getDistanceMatrix,
  reverseGeocode
} = require('../services/googleMapsService');
const { haversineMeters } = require('../utils/geo');
const { pickShortestOsrmRoute, pickShortestGoogleRoute } = require('../utils/osrmRoute');

const SEARCH_RADIUS_M = 5000;

const searchRidesNear = async ({ originLng, originLat, destLng, destLat, communityId, departureDate }) => {
  let query = {
    status: 'SCHEDULED',
    availableSeats: { $gt: 0 }
  };

  if (communityId) query.allowedCommunities = communityId;

  query['origin.location'] = {
    $nearSphere: {
      $geometry: {
        type: 'Point',
        coordinates: [parseFloat(originLng), parseFloat(originLat)]
      },
      $maxDistance: SEARCH_RADIUS_M
    }
  };

  let rides = await Ride.find(query)
    .populate('driverId', 'name rating verification profile')
    .populate('vehicleId');

  if (destLng != null && destLat != null) {
    const targetDestLng = parseFloat(destLng);
    const targetDestLat = parseFloat(destLat);

    rides = rides.filter((ride) => {
      const [lng, lat] = ride.destination?.location?.coordinates || [];
      if (lng == null) return false;
      return haversineMeters(lat, lng, targetDestLat, targetDestLng) <= SEARCH_RADIUS_M;
    });
  }

  if (departureDate) {
    const start = new Date(departureDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(departureDate);
    end.setHours(23, 59, 59, 999);
    rides = rides.filter((r) => {
      const d = new Date(r.departureDate);
      return d >= start && d <= end;
    });
  }

  return rides;
};

/**
 * GET /api/v1/maps/bootstrap
 * Returns browser-restricted key for Maps JS (authenticated only).
 */
const getBootstrap = async (req, res, next) => {
  try {
    const browserKey = getBrowserKey();
    if (!browserKey) {
      return res.status(503).json({
        success: false,
        message: 'Maps not configured. Add GOOGLE_MAPS_BROWSER_KEY to server environment.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        googleMapsApiKey: browserKey,
        libraries: ['places', 'geometry'],
        defaultCenter: { lat: 31.5204, lng: 74.3587 },
        defaultZoom: 12
      }
    });
  } catch (error) {
    next(error);
  }
};

const autocomplete = async (req, res, next) => {
  try {
    const { input, sessionToken, lat, lng } = req.query;
    const data = await placeAutocomplete({ input, sessionToken, lat, lng });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const details = async (req, res, next) => {
  try {
    const { placeId, sessionToken } = req.query;
    if (!placeId) {
      res.status(400);
      throw new Error('placeId is required');
    }
    const data = await placeDetails({ placeId, sessionToken });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const directions = async (req, res, next) => {
  try {
    const { origin, destination, mode } = req.body;
    if (!origin || !destination) {
      res.status(400);
      throw new Error('origin and destination are required');
    }
    const data = await getDirections({ origin, destination, mode });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const distanceMatrix = async (req, res, next) => {
  try {
    const { origins, destinations, mode } = req.body;
    if (!origins?.length || !destinations?.length) {
      res.status(400);
      throw new Error('origins and destinations arrays are required');
    }
    const data = await getDistanceMatrix({ origins, destinations, mode });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const reverse = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (lat == null || lng == null) {
      res.status(400);
      throw new Error('lat and lng are required');
    }
    const data = await reverseGeocode({ lat, lng });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/maps/nearby-rides
 * Geospatial ride search enriched with route match scores.
 */
const nearbyRides = async (req, res, next) => {
  try {
    const {
      pickup,
      destination,
      communityId,
      departureDate,
      useGoogleMatrix = true
    } = req.body;

    if (!pickup?.lat || !pickup?.lng) {
      res.status(400);
      throw new Error('pickup { lat, lng } is required');
    }

    const rides = await searchRidesNear({
      originLng: pickup.lng,
      originLat: pickup.lat,
      destLng: destination?.lng,
      destLat: destination?.lat,
      communityId,
      departureDate
    });

    let userRoute = null;
    if (destination?.lat && destination?.lng) {
      try {
        userRoute = await pickShortestOsrmRoute(pickup, destination);
        if (!userRoute) {
          const dir = await getDirections({ origin: pickup, destination, alternatives: true });
          userRoute = pickShortestGoogleRoute(dir) || dir.route;
        }
      } catch {
        /* directions optional if quota/key issue */
      }
    }

    const suggestions = await scoreRideMatches({
      rides,
      pickup,
      destination,
      userRoute,
      useGoogleMatrix
    });

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      data: {
        userRoute,
        rides: suggestions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/maps/route-suggestions
 * Route optimization hints: best carpools for your trip.
 */
const routeSuggestions = async (req, res, next) => {
  try {
    const { pickup, destination } = req.body;
    if (!pickup?.lat || !destination?.lat) {
      res.status(400);
      throw new Error('pickup and destination with lat/lng are required');
    }

    let primaryRoute = await pickShortestOsrmRoute(pickup, destination);
    let routeMeta = { optimizer: 'osrm-shortest' };

    if (!primaryRoute) {
      const dir = await getDirections({ origin: pickup, destination, alternatives: true });
      primaryRoute = pickShortestGoogleRoute(dir) || dir.route;
      routeMeta = {
        optimizer: primaryRoute ? 'google-shortest' : 'none',
        alternativesConsidered: primaryRoute?.alternativesConsidered || 1
      };
    } else {
      routeMeta.alternativesConsidered = primaryRoute.alternativesConsidered;
    }

    const dir = { route: primaryRoute };
    const rides = await searchRidesNear({
      originLng: pickup.lng,
      originLat: pickup.lat,
      destLng: destination.lng,
      destLat: destination.lat
    });

    const scored = await scoreRideMatches({
      rides,
      pickup,
      destination,
      userRoute: dir.route,
      useGoogleMatrix: true
    });

    const optimizations = scored.slice(0, 8).map((item) => ({
      rideId: item.ride._id,
      matchScore: item.matchScore,
      matchLabel: item.matchLabel,
      pickupWalkMeters: item.pickupDeviationMeters,
      dropoffWalkMeters: item.destDeviationMeters,
      suggestedPickup: item.suggestedPickup,
      etaToPickup: item.etaToPickup,
      driver: item.ride.driverId,
      vehicle: item.ride.vehicleId,
      departureDate: item.ride.departureDate,
      costPerSeat: item.ride.costPerSeat,
      availableSeats: item.ride.availableSeats
    }));

    return res.status(200).json({
      success: true,
      data: {
        primaryRoute: dir.route,
        routeMeta,
        optimizations,
        tips: buildOptimizationTips(optimizations, dir.route)
      }
    });
  } catch (error) {
    next(error);
  }
};

const scoreRideMatches = async ({ rides, pickup, destination, userRoute, useGoogleMatrix }) => {
  const results = [];

  for (const ride of rides) {
    const [oLng, oLat] = ride.origin?.location?.coordinates || [];
    const [dLng, dLat] = ride.destination?.location?.coordinates || [];
    if (oLat == null) continue;

    const pickupDev = haversineMeters(pickup.lat, pickup.lng, oLat, oLng);
    let destDev = 0;
    if (destination?.lat && dLat != null) {
      destDev = haversineMeters(destination.lat, destination.lng, dLat, dLng);
    }

    const totalDev = pickupDev + destDev;
    let matchScore = Math.max(0, 100 - totalDev / 100);
    let matchLabel = 'GOOD_MATCH';
    if (pickupDev < 800 && destDev < 1200) matchLabel = 'EXCELLENT_MATCH';
    else if (pickupDev > 3000 || destDev > 3000) matchLabel = 'FAR_DETOUR';

    let etaToPickup = null;
    if (useGoogleMatrix) {
      try {
        const matrix = await getDistanceMatrix({
          origins: [pickup],
          destinations: [{ lat: oLat, lng: oLng }]
        });
        const el = matrix.rows[0]?.elements[0];
        if (el?.status === 'OK') {
          etaToPickup = el.duration;
          matchScore += Math.min(15, 15 - (el.duration.minutes || 0) / 5);
        }
      } catch {
        /* fallback haversine only */
      }
    }

    results.push({
      ride,
      matchScore: Math.round(matchScore),
      matchLabel,
      pickupDeviationMeters: Math.round(pickupDev),
      destDeviationMeters: Math.round(destDev),
      suggestedPickup: {
        address: ride.origin.address,
        lat: oLat,
        lng: oLng
      },
      etaToPickup,
      userRouteDistance: userRoute?.distance,
      userRouteDuration: userRoute?.duration
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
};

const buildOptimizationTips = (optimizations, route) => {
  const tips = [];
  if (route?.duration) {
    tips.push({
      type: 'ETA',
      message: `Solo drive estimate: ${route.duration.text} (${route.distance?.text}).`
    });
  }
  const excellent = optimizations.filter((o) => o.matchLabel === 'EXCELLENT_MATCH');
  if (excellent.length) {
    tips.push({
      type: 'CARPOOL',
      message: `${excellent.length} carpools have pickup & dropoff within walking distance of your route.`
    });
  }
  if (!optimizations.length) {
    tips.push({
      type: 'EMPTY',
      message: 'No matching carpools yet. Try widening your search area or a different departure time.'
    });
  }
  return tips;
};

module.exports = {
  getBootstrap,
  autocomplete,
  details,
  directions,
  distanceMatrix,
  reverse,
  nearbyRides,
  routeSuggestions
};

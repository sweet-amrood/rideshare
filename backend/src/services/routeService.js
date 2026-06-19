const { toLatLng, estimateLegMetrics } = require('./tripMetricsService');
const { WAYPOINT_TYPES } = require('../constants/carpoolRoute');

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY || '';
const roundKm = (km) => Math.round(Number(km) * 10) / 10;

const coordsFromPoint = (point) => {
  const c = point?.location?.coordinates || point?.coordinates;
  if (!c || c.length < 2) return null;
  return { lng: Number(c[0]), lat: Number(c[1]) };
};

const stopFromPoint = (point, meta = {}) => {
  const coords = coordsFromPoint(point);
  if (!coords) return null;
  return {
    lat: coords.lat,
    lng: coords.lng,
    address: point?.address || '',
    ...meta
  };
};

const stopFromWaypointDoc = (wp) => {
  const coords = coordsFromPoint(wp);
  if (!coords) return null;
  return {
    lat: coords.lat,
    lng: coords.lng,
    address: wp.address || '',
    type: wp.type,
    bookingId: wp.bookingId?.toString?.() || wp.bookingId,
    passengerId: wp.passengerId?.toString?.() || wp.passengerId
  };
};

/**
 * Ordered stops: driver origin → waypoints → driver destination.
 */
const buildStopSequence = (origin, waypoints, destination) => {
  const start = stopFromPoint(origin, { type: 'origin' });
  const end = stopFromPoint(destination, { type: 'destination' });
  const mids = (waypoints || []).map((wp) => stopFromWaypointDoc(wp)).filter(Boolean);
  if (!start || !end) return [];
  return [start, ...mids, end];
};

/**
 * OSRM driving route through multiple coordinates (shortest single path).
 */
const computeOsrmRouteDistanceKm = async (stops) => {
  if (!stops?.length || stops.length < 2) return 0;
  if (stops.length === 2) {
    const leg = await estimateLegMetrics(stops[0], stops[1]);
    return leg.distanceKm;
  }

  const coords = stops.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false&alternatives=false`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route?.distance) return null;
    return roundKm(route.distance / 1000);
  } catch {
    return null;
  }
};

/**
 * OpenRouteService directions (optional — set OPENROUTESERVICE_API_KEY).
 */
const computeOrsRouteDistanceKm = async (stops) => {
  if (!ORS_API_KEY || stops.length < 2) return null;

  const coordinates = stops.map((s) => [s.lng, s.lat]);
  const url = 'https://api.openrouteservice.org/v2/directions/driving-car/json';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    const meters = data?.routes?.[0]?.summary?.distance;
    if (meters == null) return null;
    return roundKm(meters / 1000);
  } catch {
    return null;
  }
};

/**
 * Sum of leg distances when multi-stop routing is unavailable.
 */
const computeLegSumDistanceKm = async (stops) => {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const leg = await estimateLegMetrics(stops[i], stops[i + 1]);
    total += leg.distanceKm;
  }
  return roundKm(total);
};

const computeRouteDistanceKm = async (stops) => {
  if (!stops?.length || stops.length < 2) return 0;

  const ors = await computeOrsRouteDistanceKm(stops);
  if (ors != null) return ors;

  const osrm = await computeOsrmRouteDistanceKm(stops);
  if (osrm != null) return osrm;

  return computeLegSumDistanceKm(stops);
};

/**
 * Generate all valid waypoint orderings by inserting pickup before dropoff.
 */
const generateCandidateWaypointLists = (existingWaypoints, pickupStop, dropoffStop) => {
  const base = [...(existingWaypoints || [])];
  const m = base.length;
  const candidates = [];

  for (let pickupIdx = 0; pickupIdx <= m; pickupIdx += 1) {
    for (let dropoffIdx = pickupIdx + 1; dropoffIdx <= m + 1; dropoffIdx += 1) {
      const waypoints = [...base];
      waypoints.splice(pickupIdx, 0, { ...pickupStop, type: WAYPOINT_TYPES.PICKUP });
      waypoints.splice(dropoffIdx, 0, { ...dropoffStop, type: WAYPOINT_TYPES.DROPOFF });
      candidates.push(waypoints);
    }
  }

  return candidates;
};

/**
 * Find insertion minimizing total driving distance.
 */
const findBestInsertion = async (routeState, pickupPoint, dropoffPoint) => {
  const pickupStop = stopFromPoint(pickupPoint, { type: WAYPOINT_TYPES.PICKUP });
  const dropoffStop = stopFromPoint(dropoffPoint, { type: WAYPOINT_TYPES.DROPOFF });
  if (!pickupStop || !dropoffStop) {
    return { ok: false, reason: 'Invalid pickup or dropoff coordinates' };
  }

  const oldStops = buildStopSequence(routeState.origin, routeState.waypoints, routeState.destination);
  const oldDistance =
    routeState.currentTotalDistanceKm > 0
      ? routeState.currentTotalDistanceKm
      : await computeRouteDistanceKm(oldStops);

  const candidates = generateCandidateWaypointLists(
    routeState.waypoints,
    pickupStop,
    dropoffStop
  );

  let best = null;
  let bestDistance = Infinity;

  for (const waypoints of candidates) {
    const stops = buildStopSequence(routeState.origin, waypoints, routeState.destination);
    const distanceKm = await computeRouteDistanceKm(stops);
    if (distanceKm < bestDistance) {
      bestDistance = distanceKm;
      best = { waypoints, stops, distanceKm };
    }
  }

  if (!best) {
    return { ok: false, reason: 'Could not compute route candidates' };
  }

  return {
    ok: true,
    oldDistance: roundKm(oldDistance),
    newDistance: roundKm(best.distanceKm),
    bestRoute: best.waypoints,
    bestStops: best.stops
  };
};

const computeOwnDistanceKm = async (pickupPoint, dropoffPoint) => {
  const pickup = stopFromPoint(pickupPoint);
  const dropoff = stopFromPoint(dropoffPoint);
  if (!pickup || !dropoff) return 0;
  const leg = await estimateLegMetrics(pickup, dropoff);
  return leg.distanceKm;
};

/**
 * Build route state from ride document + confirmed bookings (fallback if route not persisted).
 */
const buildRouteState = async (ride, confirmedBookings = []) => {
  const origin = ride.origin;
  const destination = ride.destination;

  let waypoints = (ride.route?.waypoints || []).map((wp) => ({
    type: wp.type,
    bookingId: wp.bookingId,
    passengerId: wp.passengerId,
    address: wp.address,
    location: wp.location
  }));

  if (!waypoints.length && confirmedBookings.length) {
    waypoints = confirmedBookings.flatMap((b) => [
      {
        type: WAYPOINT_TYPES.PICKUP,
        bookingId: b._id,
        passengerId: b.passengerId,
        address: b.pickupPoint?.address,
        location: b.pickupPoint?.location
      },
      {
        type: WAYPOINT_TYPES.DROPOFF,
        bookingId: b._id,
        passengerId: b.passengerId,
        address: b.dropoffPoint?.address,
        location: b.dropoffPoint?.location
      }
    ]);
  }

  const stops = buildStopSequence(origin, waypoints, destination);
  let currentTotalDistanceKm = ride.route?.currentTotalDistanceKm;
  if (currentTotalDistanceKm == null || currentTotalDistanceKm <= 0) {
    currentTotalDistanceKm = stops.length >= 2 ? await computeRouteDistanceKm(stops) : 0;
  }

  return {
    origin,
    destination,
    waypoints,
    currentTotalDistanceKm: roundKm(currentTotalDistanceKm),
    passengers: confirmedBookings.map((b) => ({
      bookingId: b._id,
      passengerId: b.passengerId,
      seatsBooked: b.seatsBooked,
      pickup: b.pickupPoint,
      dropoff: b.dropoffPoint
    }))
  };
};

const waypointFromBooking = (booking, type) => ({
  type,
  bookingId: booking._id,
  passengerId: booking.passengerId,
  address: type === WAYPOINT_TYPES.PICKUP ? booking.pickupPoint.address : booking.dropoffPoint.address,
  location:
    type === WAYPOINT_TYPES.PICKUP ? booking.pickupPoint.location : booking.dropoffPoint.location
});

/**
 * Persist optimized route on the ride after a passenger is confirmed.
 */
const commitPassengerRoute = async (ride, booking, bestRoute, newTotalDistanceKm) => {
  const tagged = (bestRoute || []).map((wp) => {
    const isProspect =
      !wp.bookingId ||
      wp.bookingId === 'prospect' ||
      String(wp.bookingId).startsWith('prospect');
    if (!isProspect) return wp;
    return {
      ...wp,
      bookingId: booking._id,
      passengerId: booking.passengerId,
      type: wp.type,
      address:
        wp.type === WAYPOINT_TYPES.PICKUP ? booking.pickupPoint.address : booking.dropoffPoint.address,
      location:
        wp.type === WAYPOINT_TYPES.PICKUP
          ? booking.pickupPoint.location
          : booking.dropoffPoint.location
    };
  });

  ride.route = {
    waypoints: tagged.map((wp) => ({
      type: wp.type,
      bookingId: wp.bookingId,
      passengerId: wp.passengerId,
      address: wp.address,
      location: wp.location
    })),
    currentTotalDistanceKm: roundKm(newTotalDistanceKm),
    lastOptimizedAt: new Date()
  };

  await ride.save();
  return ride;
};

/**
 * Remove a cancelled passenger's stops and recompute route distance (fares stay locked).
 */
const removePassengerFromRoute = async (ride, bookingId) => {
  const id = bookingId.toString();
  const waypoints = (ride.route?.waypoints || []).filter(
    (wp) => wp.bookingId?.toString() !== id
  );

  const stops = buildStopSequence(ride.origin, waypoints, ride.destination);
  const currentTotalDistanceKm =
    stops.length >= 2 ? await computeRouteDistanceKm(stops) : ride.route?.currentTotalDistanceKm || 0;

  ride.route = {
    waypoints,
    currentTotalDistanceKm: roundKm(currentTotalDistanceKm),
    lastOptimizedAt: new Date()
  };
  await ride.save();
  return ride;
};

const initializeRideRoute = async (ride) => {
  const stops = buildStopSequence(ride.origin, [], ride.destination);
  const currentTotalDistanceKm =
    ride.pricing?.distanceKm > 0
      ? ride.pricing.distanceKm
      : stops.length >= 2
        ? await computeRouteDistanceKm(stops)
        : 0;

  ride.route = {
    waypoints: [],
    currentTotalDistanceKm: roundKm(currentTotalDistanceKm),
    lastOptimizedAt: new Date()
  };
  return ride;
};

module.exports = {
  coordsFromPoint,
  stopFromPoint,
  buildStopSequence,
  computeRouteDistanceKm,
  computeOwnDistanceKm,
  generateCandidateWaypointLists,
  findBestInsertion,
  buildRouteState,
  commitPassengerRoute,
  removePassengerFromRoute,
  initializeRideRoute,
  waypointFromBooking,
  roundKm
};

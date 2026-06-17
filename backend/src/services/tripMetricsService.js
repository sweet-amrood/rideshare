const { haversineMeters, formatDistance } = require('../utils/geo');
const { pickShortestOsrmRoute } = require('../utils/osrmRoute');

/** Straight-line × factor approximates urban road distance when routing is unavailable */
const HAVERSINE_ROAD_FACTOR = 1.32;

const VEHICLE_SPEED_KMH = {
  BIKE: 28,
  RICKSHAW: 22,
  CAR: 32
};

const PICKUP_BUFFER_MIN = 2;

const toLatLng = (point) => {
  if (!point) return null;
  if (point.lat != null && point.lng != null) {
    return { lat: Number(point.lat), lng: Number(point.lng) };
  }
  const coords = point.coordinates || point.location?.coordinates;
  if (coords?.length >= 2) {
    return { lng: Number(coords[0]), lat: Number(coords[1]) };
  }
  return null;
};

const haversineRoadMeters = (a, b) => {
  const p = toLatLng(a);
  const q = toLatLng(b);
  if (!p || !q) return 0;
  return haversineMeters(p.lat, p.lng, q.lat, q.lng) * HAVERSINE_ROAD_FACTOR;
};

const etaFromDistanceKm = (distanceKm, vehicleType = 'CAR') => {
  const km = Math.max(0.05, Number(distanceKm) || 0);
  const speed = VEHICLE_SPEED_KMH[vehicleType] || 28;
  return Math.max(2, Math.round((km / speed) * 60 + PICKUP_BUFFER_MIN));
};

const etaFromRouteDuration = (durationMinutes) =>
  Math.max(2, Math.round(Number(durationMinutes) + PICKUP_BUFFER_MIN));

/**
 * Road distance + drive time for one leg (OSRM driving route, else adjusted haversine).
 */
const estimateLegMetrics = async (from, to, vehicleType = 'CAR') => {
  const origin = toLatLng(from);
  const dest = toLatLng(to);
  if (!origin || !dest) {
    return { distanceKm: 0, distanceMeters: 0, etaMinutes: 5, source: 'none' };
  }

  try {
    const route = await pickShortestOsrmRoute(origin, dest);
    if (route?.distance?.value != null) {
      const distanceMeters = route.distance.value;
      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const etaMinutes = route.duration?.minutes
        ? etaFromRouteDuration(route.duration.minutes)
        : etaFromDistanceKm(distanceKm, vehicleType);
      return {
        distanceKm,
        distanceMeters,
        distanceText: formatDistance(distanceMeters).text,
        etaMinutes,
        source: 'osrm'
      };
    }
  } catch {
    /* OSRM unavailable — use estimate */
  }

  const distanceMeters = haversineRoadMeters(origin, dest);
  const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
  return {
    distanceKm,
    distanceMeters,
    distanceText: formatDistance(distanceMeters).text,
    etaMinutes: etaFromDistanceKm(distanceKm, vehicleType),
    source: 'estimated'
  };
};

/**
 * OSRM table: one source → many destinations (driver → pickups).
 */
const osrmTableFromSource = async (source, destinations) => {
  const src = toLatLng(source);
  const dests = destinations.map(toLatLng).filter(Boolean);
  if (!src || !dests.length) return null;

  const coords = [src, ...dests].map((p) => `${p.lng},${p.lat}`).join(';');
  const destIndices = dests.map((_, i) => i + 1).join(';');
  const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=0&destinations=${destIndices}&annotations=duration,distance`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let res;
    try {
      res = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.durations?.[0]) return null;

    return data.durations[0].map((seconds, i) => {
      const distM = data.distances?.[0]?.[i];
      const distanceMeters =
        distM != null && Number.isFinite(distM) ? distM : haversineRoadMeters(src, dests[i]);
      const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
      const etaMinutes =
        seconds != null && Number.isFinite(seconds)
          ? etaFromRouteDuration(seconds / 60)
          : etaFromDistanceKm(distanceKm);
      return {
        distanceKm,
        distanceMeters,
        distanceText: formatDistance(distanceMeters).text,
        etaMinutes,
        source: 'osrm-table'
      };
    });
  } catch {
    return null;
  }
};

const enrichDriverToPickups = async (driverCoords, pickups, vehicleType) => {
  const table = await osrmTableFromSource(driverCoords, pickups);
  if (table?.length === pickups.length) return table;

  return pickups.map((pickup) => {
    const distanceMeters = haversineRoadMeters(driverCoords, pickup);
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    return {
      distanceKm,
      distanceMeters,
      distanceText: formatDistance(distanceMeters).text,
      etaMinutes: etaFromDistanceKm(distanceKm, vehicleType),
      source: 'estimated'
    };
  });
};

module.exports = {
  HAVERSINE_ROAD_FACTOR,
  toLatLng,
  haversineRoadMeters,
  etaFromDistanceKm,
  etaFromRouteDuration,
  estimateLegMetrics,
  enrichDriverToPickups
};

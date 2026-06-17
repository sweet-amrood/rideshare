const formatMeters = (m) => {
  if (m < 1000) return { text: `${Math.round(m)} m`, value: m };
  return { text: `${(m / 1000).toFixed(1)} km`, value: m };
};

const formatSeconds = (s) => {
  const minutes = Math.max(1, Math.round(s / 60));
  return { text: `${minutes} min`, minutes, value: s };
};

/**
 * Fetch driving routes from OSRM and return the shortest by distance.
 */
const pickShortestOsrmRoute = async (origin, destination) => {
  if (!origin?.lat || !destination?.lat) return null;

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const routes = data.routes || [];
  if (!routes.length) return null;

  const shortest = routes.reduce((best, r) => (r.distance < best.distance ? r : best), routes[0]);
  const path = (shortest.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));

  return {
    summary: 'Shortest route',
    distance: formatMeters(shortest.distance),
    duration: formatSeconds(shortest.duration),
    path,
    alternativesConsidered: routes.length,
    source: 'osrm'
  };
};

/**
 * Pick shortest among Google Directions routes (requires alternatives=true).
 */
const pickShortestGoogleRoute = (directionsResult) => {
  if (!directionsResult?.route) return null;
  const candidates = [
    directionsResult.route,
    ...(directionsResult.alternatives || [])
  ].filter((r) => r?.distance?.value != null);

  if (!candidates.length) return directionsResult.route;

  const best = candidates.reduce((a, b) => (a.distance.value <= b.distance.value ? a : b));
  return { ...best, alternativesConsidered: candidates.length };
};

module.exports = { pickShortestOsrmRoute, pickShortestGoogleRoute, formatMeters, formatSeconds };

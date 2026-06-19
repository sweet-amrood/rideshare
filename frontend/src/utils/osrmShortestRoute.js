/**
 * Fetch OSRM driving routes and return geometry + stats for the shortest path.
 */
const routeCache = new Map();

function cacheKey(origin, destination) {
  return `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
}

export async function fetchShortestRoute(origin, destination) {
  if (!origin?.lat || !destination?.lat) return null;

  const key = cacheKey(origin, destination);
  if (routeCache.has(key)) return routeCache.get(key);

  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=true`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const routes = data.routes || [];
  if (!routes.length) return null;

  const shortest = routes.reduce((best, r) => (r.distance < best.distance ? r : best), routes[0]);
  const path = (shortest.geometry?.coordinates || []).map(([lng, lat]) => ({ lat, lng }));
  const distanceKm = Math.round((shortest.distance / 1000) * 10) / 10;
  const km = distanceKm.toFixed(1);
  const mins = Math.max(1, Math.round(shortest.duration / 60));

  const result = {
    path,
    distance: `${km} km`,
    distanceKm,
    duration: `${mins} min`,
    alternativesConsidered: routes.length
  };
  routeCache.set(key, result);
  return result;
}

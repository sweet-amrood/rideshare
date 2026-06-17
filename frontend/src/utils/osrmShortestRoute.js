/**
 * Fetch OSRM driving routes and return geometry + stats for the shortest path.
 */
export async function fetchShortestRoute(origin, destination) {
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
  const km = (shortest.distance / 1000).toFixed(1);
  const mins = Math.max(1, Math.round(shortest.duration / 60));

  return {
    path,
    distance: `${km} km`,
    duration: `${mins} min`,
    alternativesConsidered: routes.length
  };
}

/**
 * Haversine distance in meters between two WGS84 points.
 */
const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

/**
 * Decode Google encoded polyline → [{ lat, lng }, ...]
 */
const decodePolyline = (encoded) => {
  if (!encoded) return [];
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
};

const formatDuration = (seconds) => {
  if (!seconds) return { text: '—', minutes: 0 };
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return { text: `${minutes} min`, minutes };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { text: m ? `${h} hr ${m} min` : `${h} hr`, minutes };
};

const formatDistance = (meters) => {
  if (!meters && meters !== 0) return { text: '—', km: 0 };
  if (meters < 1000) return { text: `${Math.round(meters)} m`, km: meters / 1000 };
  return { text: `${(meters / 1000).toFixed(1)} km`, km: meters / 1000 };
};

module.exports = { haversineMeters, decodePolyline, formatDuration, formatDistance };

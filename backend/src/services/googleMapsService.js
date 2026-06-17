const { decodePolyline, formatDuration, formatDistance } = require('../utils/geo');

const BASE = 'https://maps.googleapis.com/maps/api';

const getServerKey = () => process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;

const getBrowserKey = () =>
  process.env.GOOGLE_MAPS_BROWSER_KEY || process.env.GOOGLE_MAPS_API_KEY;

const assertKey = () => {
  const key = getServerKey();
  if (!key) {
    const err = new Error(
      'Google Maps API key not configured. Set GOOGLE_MAPS_SERVER_KEY in backend .env'
    );
    err.statusCode = 503;
    throw err;
  }
  return key;
};

const googleFetch = async (path, params) => {
  const key = assertKey();
  const url = new URL(`${BASE}${path}`);
  Object.entries({ ...params, key }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.status === 'REQUEST_DENIED') {
    const err = new Error(data.error_message || 'Google Maps request denied');
    err.statusCode = 502;
    throw err;
  }
  if (data.status === 'OVER_QUERY_LIMIT') {
    const err = new Error('Google Maps quota exceeded');
    err.statusCode = 429;
    throw err;
  }
  if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    const err = new Error(data.error_message || `Google Maps: ${data.status}`);
    err.statusCode = 400;
    throw err;
  }

  return data;
};

const latLngParam = (point) => {
  if (typeof point === 'string') return point;
  if (point?.lat != null && point?.lng != null) return `${point.lat},${point.lng}`;
  if (Array.isArray(point)) return `${point.lat ?? point[1]},${point.lng ?? point[0]}`;
  return '';
};

/**
 * Places Autocomplete (proxied — key never sent to client for this call).
 */
const placeAutocomplete = async ({ input, sessionToken, lat, lng, radius = 50000 }) => {
  if (!input || input.length < 2) {
    return { predictions: [], status: 'OK' };
  }

  const params = {
    input,
    sessiontoken: sessionToken,
    types: 'geocode|establishment'
  };

  if (lat != null && lng != null) {
    params.location = `${lat},${lng}`;
    params.radius = radius;
    params.strictbounds = 'false';
  }

  const data = await googleFetch('/place/autocomplete/json', params);

  return {
    status: data.status,
    predictions: (data.predictions || []).map((p) => ({
      placeId: p.place_id,
      description: p.description,
      mainText: p.structured_formatting?.main_text,
      secondaryText: p.structured_formatting?.secondary_text
    }))
  };
};

/**
 * Place Details → lat/lng + formatted address
 */
const placeDetails = async ({ placeId, sessionToken }) => {
  const data = await googleFetch('/place/details/json', {
    place_id: placeId,
    sessiontoken: sessionToken,
    fields: 'place_id,formatted_address,name,geometry,address_components'
  });

  const r = data.result;
  if (!r?.geometry?.location) {
    return { place: null };
  }

  return {
    place: {
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng
    }
  };
};

/**
 * Directions — route polyline, distance, duration, steps summary
 */
const getDirections = async ({ origin, destination, mode = 'driving', alternatives = false }) => {
  const data = await googleFetch('/directions/json', {
    origin: latLngParam(origin),
    destination: latLngParam(destination),
    mode,
    alternatives: alternatives ? 'true' : 'false'
  });

  const route = data.routes?.[0];
  if (!route) {
    return { route: null, status: data.status };
  }

  const leg = route.legs[0];
  const path = decodePolyline(route.overview_polyline?.points);

  return {
    status: data.status,
    route: {
      summary: route.summary,
      bounds: route.bounds,
      distance: formatDistance(leg?.distance?.value),
      duration: formatDuration(leg?.duration?.value),
      durationInTraffic: leg?.duration_in_traffic
        ? formatDuration(leg.duration_in_traffic.value)
        : null,
      startAddress: leg?.start_address,
      endAddress: leg?.end_address,
      path,
      steps: (leg?.steps || []).map((s) => ({
        instruction: s.html_instructions?.replace(/<[^>]+>/g, '') || '',
        distance: s.distance?.text,
        duration: s.duration?.text
      }))
    },
    alternatives: (data.routes || []).slice(1).map((alt) => ({
      summary: alt.summary,
      distance: formatDistance(alt.legs[0]?.distance?.value),
      duration: formatDuration(alt.legs[0]?.duration?.value),
      path: decodePolyline(alt.overview_polyline?.points)
    }))
  };
};

/**
 * Distance Matrix for many origin/destination pairs
 */
const getDistanceMatrix = async ({ origins, destinations, mode = 'driving' }) => {
  const originStr = origins.map(latLngParam).join('|');
  const destStr = destinations.map(latLngParam).join('|');

  const data = await googleFetch('/distancematrix/json', {
    origins: originStr,
    destinations: destStr,
    mode
  });

  const rows = (data.rows || []).map((row, i) => ({
    originIndex: i,
    elements: (row.elements || []).map((el, j) => ({
      destinationIndex: j,
      status: el.status,
      distance: formatDistance(el.distance?.value),
      duration: formatDuration(el.duration?.value)
    }))
  }));

  return { rows, originAddresses: data.origin_addresses, destinationAddresses: data.destination_addresses };
};

/**
 * Reverse geocode coordinates → address
 */
const reverseGeocode = async ({ lat, lng }) => {
  const data = await googleFetch('/geocode/json', { latlng: `${lat},${lng}` });
  const r = data.results?.[0];
  return {
    address: r?.formatted_address || '',
    placeId: r?.place_id
  };
};

module.exports = {
  getServerKey,
  getBrowserKey,
  placeAutocomplete,
  placeDetails,
  getDirections,
  getDistanceMatrix,
  reverseGeocode
};

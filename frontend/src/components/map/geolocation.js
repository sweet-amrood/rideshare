import {
  reverseGeocode,
  reverseGeocodeLater,
  pointFromCoords,
  PENDING_ADDRESS_LABEL
} from './geocode';

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'RideShare-Carpool/1.0 (university project)'
};

/** Prefer cached / network position — much faster than cold GPS fix. */
export const FAST_POSITION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 120000
};

/** Accurate fix when needed (driver online, live tracking). */
export const ACCURATE_POSITION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 15000
};

export function geolocationErrorMessage(error) {
  if (!error) return 'Could not get your location';
  if (error.message?.includes('secure')) {
    return 'Location needs HTTPS or localhost. Open the app via http://localhost in dev.';
  }
  switch (error.code) {
    case 1:
      return 'Location blocked. Allow location for this site in browser settings, then try again.';
    case 2:
      return 'Position unavailable. Turn on device location/GPS and try again.';
    case 3:
      return 'Location timed out. Try again or tap the map to set pickup.';
    default:
      return error.message || 'Could not get your location';
  }
}

export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(Object.assign(new Error('Geolocation is not supported'), { code: 0 }));
      return;
    }
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(
        Object.assign(new Error('Geolocation requires a secure context (HTTPS or localhost)'), {
          code: 0
        })
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      ...FAST_POSITION_OPTIONS,
      ...options
    });
  });
}

/**
 * GPS point for pickup — returns quickly; optional callback when address label is ready.
 */
export async function resolveCurrentLocationAsPoint(options = {}) {
  const { onAddressResolved, positionOptions } = options;
  const pos = await getCurrentPosition(positionOptions || FAST_POSITION_OPTIONS);
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid coordinates from device');
  }

  const point = pointFromCoords(lat, lng, PENDING_ADDRESS_LABEL);

  if (onAddressResolved) {
    reverseGeocodeLater(lat, lng, (label) => {
      onAddressResolved(pointFromCoords(lat, lng, label));
    });
  } else {
    try {
      const label = await reverseGeocode(lat, lng, NOMINATIM_HEADERS);
      return pointFromCoords(lat, lng, label);
    } catch {
      return pointFromCoords(lat, lng, `Current location`);
    }
  }

  return point;
}

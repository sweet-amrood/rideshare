import { mapsService } from '@/api/services/maps.service';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'RideShare-Carpool/1.0 (university project)'
};

const GEOCODE_TIMEOUT_MS = 6000;
const addressCache = new Map();
const CACHE_MAX = 80;

function cacheKey(lat, lng) {
  return `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
}

function remember(key, value) {
  if (addressCache.size >= CACHE_MAX) {
    const first = addressCache.keys().next().value;
    addressCache.delete(first);
  }
  addressCache.set(key, value);
}

async function reverseGeocodeGoogle(lat, lng) {
  try {
    const res = await mapsService.reverseGeocode({ lat, lng });
    const address = res?.data?.address || res?.address;
    if (address?.trim()) return address.trim();
  } catch {
    /* use Nominatim fallback */
  }
  return null;
}

async function reverseGeocodeNominatim(lat, lng, headers = DEFAULT_HEADERS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json`,
      { headers: { ...DEFAULT_HEADERS, ...headers }, signal: controller.signal }
    );

    if (!res.ok) {
      throw new Error(`Address lookup failed (${res.status})`);
    }

    const data = await res.json();
    return (
      data.display_name?.split(',').slice(0, 3).join(',') ||
      data.address?.road ||
      data.address?.suburb ||
      null
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(lat, lng, headers = DEFAULT_HEADERS) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Invalid coordinates');
  }

  const key = cacheKey(lat, lng);
  if (addressCache.has(key)) return addressCache.get(key);

  const googleLabel = await reverseGeocodeGoogle(lat, lng);
  if (googleLabel) {
    remember(key, googleLabel);
    return googleLabel;
  }

  try {
    const nominatimLabel = await reverseGeocodeNominatim(lat, lng, headers);
    const label = nominatimLabel || 'Selected location';
    remember(key, label);
    return label;
  } catch {
    const fallback = 'Selected location';
    remember(key, fallback);
    return fallback;
  }
}

/** Fire-and-forget label refresh (map clicks / GPS). */
export function reverseGeocodeLater(lat, lng, onResolved) {
  if (!onResolved) return;
  reverseGeocode(lat, lng)
    .then((label) => onResolved(label))
    .catch(() => onResolved('Selected location'));
}

export function pointFromCoords(lat, lng, label) {
  return {
    lat: Number(lat),
    lng: Number(lng),
    name: label,
    address: label
  };
}

export const PENDING_ADDRESS_LABEL = 'Getting address…';

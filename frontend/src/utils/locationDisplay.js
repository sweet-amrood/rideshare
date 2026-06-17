const COORD_PAIR_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

/** True if string looks like "31.52, 74.35" rather than a place name. */
export function looksLikeCoordinates(value) {
  if (value == null) return false;
  const s = String(value).trim();
  if (!s) return false;
  if (COORD_PAIR_RE.test(s)) return true;
  if (/^-?\d+\.\d{3,}/.test(s) && /,/.test(s)) return true;
  return false;
}

export function formatLocationLabel(value, fallback = 'Location') {
  if (!value) return fallback;
  const s = String(value).trim();
  if (!s || looksLikeCoordinates(s)) return fallback;
  return s;
}

/** Prefer address fields; avoid raw coordinate strings in UI. */
export function resolveLocationDisplay(point, fallback = 'Location') {
  if (!point) return fallback;
  const candidates = [
    point.address,
    point.name,
    point.label,
    point.formattedAddress
  ].filter(Boolean);
  for (const c of candidates) {
    if (!looksLikeCoordinates(c)) return c;
  }
  return fallback;
}

export function resolveRideEndpoint(ride, kind) {
  const loc = kind === 'origin' ? ride?.origin : ride?.destination;
  const fallback = kind === 'origin' ? 'Pickup' : 'Drop-off';
  return resolveLocationDisplay(
    { address: loc?.address, name: loc?.name },
    fallback
  );
}

export function resolveBookingPoint(point, fallback) {
  return resolveLocationDisplay(point, fallback);
}

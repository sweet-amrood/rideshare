/** Max route detour (km) a new passenger may add — rides exceeding this are hidden from search. */
const MAX_DETOUR_KM = 5;

/** Default per-side pickup/destination proximity (km) when driver has not set a preference. */
const DEFAULT_SIDE_DETOUR_KM = 3;

/** Driver-adjustable per-side proximity upper bound (km). */
const MAX_SIDE_DETOUR_KM = 15;

/** @deprecated Kept for legacy references; route detour cap is fixed at MAX_DETOUR_KM. */
const MAX_DETOUR_FRACTION = 0.2;

const WAYPOINT_TYPES = {
  PICKUP: 'pickup',
  DROPOFF: 'dropoff'
};

module.exports = {
  MAX_DETOUR_KM,
  MAX_DETOUR_FRACTION,
  DEFAULT_SIDE_DETOUR_KM,
  MAX_SIDE_DETOUR_KM,
  WAYPOINT_TYPES
};

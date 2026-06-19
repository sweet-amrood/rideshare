/**
 * Commuter roles: RIDER (passenger) or DRIVER (offer rides) — one active role at a time.
 */

import { paths } from '@/app/router/paths';

export const ROLES = {
  RIDER: 'RIDER',
  DRIVER: 'DRIVER'
};

export function normalizeRoles(roles) {
  const list = Array.isArray(roles) ? roles.filter(Boolean) : [];
  return list.length ? list : [ROLES.RIDER];
}

export function isRider(roles) {
  return normalizeRoles(roles).includes(ROLES.RIDER);
}

export function isDriver(roles) {
  return normalizeRoles(roles).includes(ROLES.DRIVER);
}

export function isBoth(roles) {
  const r = normalizeRoles(roles);
  return r.includes(ROLES.RIDER) && r.includes(ROLES.DRIVER);
}

export function formatRoleLabel(roles) {
  const r = normalizeRoles(roles);
  if (r.includes(ROLES.RIDER) && r.includes(ROLES.DRIVER)) return 'Passenger & Driver';
  if (r.includes(ROLES.DRIVER)) return 'Driver';
  return 'Passenger';
}

export function hasAnyRole(roles, required) {
  const r = normalizeRoles(roles);
  const need = Array.isArray(required) ? required : [required];
  return need.some((role) => r.includes(role));
}

/** Main app navigation — filtered by role */
export const APP_NAV_ITEMS = [
  { to: paths.dashboard, label: 'Dashboard', shortLabel: 'Home', iconKey: 'dashboard', end: true, roles: [ROLES.RIDER, ROLES.DRIVER] },
  { to: paths.find, label: 'Book Ride', shortLabel: 'Book', iconKey: 'find', roles: [ROLES.RIDER] },
  { to: paths.carpooling, label: 'Carpooling', shortLabel: 'Carpool', iconKey: 'carpool', roles: [ROLES.RIDER, ROLES.DRIVER] },
  { to: paths.bookings, label: 'My bookings', shortLabel: 'Bookings', iconKey: 'bookings', roles: [ROLES.RIDER] },
  { to: paths.offer, label: 'Driver hub', shortLabel: 'Driver', iconKey: 'driver', roles: [ROLES.DRIVER] },
  { to: paths.map, label: 'Live Map', shortLabel: 'Map', iconKey: 'map', roles: [ROLES.RIDER, ROLES.DRIVER] },
  { to: paths.profile, label: 'Profile', shortLabel: 'Profile', iconKey: 'profile', roles: [ROLES.RIDER, ROLES.DRIVER] }
];

export function getNavItemsForRoles(roles) {
  const r = normalizeRoles(roles);
  return APP_NAV_ITEMS.filter((item) => item.roles.some((role) => r.includes(role)));
}

/** Profile hub tabs — passenger vs driver sections */
export const PROFILE_TABS = [
  { id: 'about', label: 'About', group: 'account', roles: [ROLES.RIDER, ROLES.DRIVER] },
  { id: 'preferences', label: 'Passenger prefs', group: 'passenger', roles: [ROLES.RIDER] },
  { id: 'vehicles', label: 'Vehicles', group: 'driver', roles: [ROLES.DRIVER] },
  { id: 'verification', label: 'Verification', group: 'account', roles: [ROLES.RIDER, ROLES.DRIVER] },
  { id: 'privacy', label: 'Privacy', group: 'account', roles: [ROLES.RIDER, ROLES.DRIVER] },
  { id: 'reviews', label: 'Reviews', group: 'account', roles: [ROLES.RIDER, ROLES.DRIVER] }
];

export function getProfileTabsForRoles(roles) {
  const r = normalizeRoles(roles);
  return PROFILE_TABS.filter((tab) => tab.roles.some((role) => r.includes(role)));
}

export function getDefaultHomePath(roles) {
  if (isDriver(roles) && !isRider(roles)) return paths.offer;
  if (isRider(roles)) return paths.find;
  return paths.dashboard;
}

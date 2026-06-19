import { isMobileViewport } from '@/utils/device';

export const USER_MODE_KEY = 'userMode';

export const USER_MODES = {
  APP: 'app',
  WEBSITE: 'website'
};

export function getUserMode() {
  try {
    const value = localStorage.getItem(USER_MODE_KEY);
    if (value === USER_MODES.APP || value === USER_MODES.WEBSITE) return value;
  } catch {
    /* private browsing */
  }
  return null;
}

export function setUserMode(mode) {
  if (mode !== USER_MODES.APP && mode !== USER_MODES.WEBSITE) return;
  try {
    localStorage.setItem(USER_MODE_KEY, mode);
    window.dispatchEvent(new CustomEvent('userModeChange', { detail: mode }));
  } catch {
    /* ignore */
  }
}

export function clearUserMode() {
  try {
    localStorage.removeItem(USER_MODE_KEY);
    window.dispatchEvent(new CustomEvent('userModeChange', { detail: null }));
  } catch {
    /* ignore */
  }
}

export function userModeLabel(mode) {
  if (mode === USER_MODES.APP) return 'Passenger / Driver app';
  if (mode === USER_MODES.WEBSITE) return 'Marketing website';
  return 'Not set';
}

/**
 * Entry mode for `/`: saved preference wins; otherwise device default
 * (mobile → app, desktop → marketing website).
 */
export function resolveEntryMode() {
  const stored = getUserMode();
  if (stored) return stored;
  return isMobileViewport() ? USER_MODES.APP : USER_MODES.WEBSITE;
}

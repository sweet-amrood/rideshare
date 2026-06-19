import { MOBILE_BREAKPOINT_PX } from '@/app/router/paths';

/** Sync viewport check for entry routing (no subscription). */
export function isMobileViewport(breakpoint = MOBILE_BREAKPOINT_PX) {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
}

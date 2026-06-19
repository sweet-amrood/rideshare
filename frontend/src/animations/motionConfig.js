/** Shared motion tokens — fast, subtle, spring-based */

export const springSnappy = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };
export const springGentle = { type: 'spring', stiffness: 300, damping: 28, mass: 0.9 };
export const springSoft = { type: 'spring', stiffness: 260, damping: 26 };

export const easeOut = [0.22, 1, 0.36, 1];

export const fadeFast = { duration: 0.2, ease: easeOut };
export const fadeMedium = { duration: 0.28, ease: easeOut };
export const fadeSlow = { duration: 0.38, ease: easeOut };

export const staggerFast = 0.05;
export const staggerMedium = 0.07;
export const staggerSlow = 0.09;

/** Returns motion props disabled when user prefers reduced motion */
export function motionSafe(reduceMotion, props) {
  if (!reduceMotion) return props;
  const safe = {};
  if (props.initial !== undefined) safe.initial = false;
  if (props.animate !== undefined) safe.animate = props.animate?.opacity !== undefined ? { opacity: 1 } : undefined;
  if (props.exit !== undefined) safe.exit = { opacity: 0 };
  if (props.whileHover !== undefined) safe.whileHover = undefined;
  if (props.whileTap !== undefined) safe.whileTap = undefined;
  if (props.transition !== undefined) safe.transition = { duration: 0.01 };
  return { ...props, ...safe };
}

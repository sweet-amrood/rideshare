import { springGentle, staggerFast } from './motionConfig';

export const sidebarVariants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 }
};

export const sidebarTransition = springGentle;

export const navListVariants = {
  animate: { transition: { staggerChildren: staggerFast, delayChildren: 0.08 } }
};

export const navItemVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 }
};

export const navLabelVariants = {
  initial: { opacity: 0, width: 0 },
  animate: { opacity: 1, width: 'auto' },
  exit: { opacity: 0, width: 0 }
};

export const mobileNavItemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 }
};

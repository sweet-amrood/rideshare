import { staggerFast, staggerMedium } from './motionConfig';

export const listContainerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: staggerFast, delayChildren: 0.04 }
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 }
  }
};

export const listItemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8, scale: 0.98 }
};

export const listContainerSlow = {
  ...listContainerVariants,
  animate: {
    transition: { staggerChildren: staggerMedium, delayChildren: 0.06 }
  }
};

export const tableRowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 }
};

import { fadeFast, springGentle } from './motionConfig';

export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

export const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 }
};

export const modalTransition = springGentle;
export const backdropTransition = fadeFast;

export const drawerVariants = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' }
};

export const drawerTransition = { type: 'spring', stiffness: 340, damping: 32 };

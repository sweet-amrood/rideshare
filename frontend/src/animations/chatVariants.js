import { springSoft, fadeFast } from './motionConfig';

export const messageVariants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.96 }
};

export const messageTransition = fadeFast;

export const typingIndicatorVariants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 }
};

export const typingDotVariants = {
  animate: {
    y: [0, -3, 0],
    transition: { duration: 0.55, repeat: Infinity, ease: 'easeInOut' }
  }
};

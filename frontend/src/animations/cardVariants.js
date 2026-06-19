import { fadeMedium, springSoft } from './motionConfig';

export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12, scale: 0.98 }
};

export const cardTransition = fadeMedium;

export const cardHover = {
  y: -2,
  transition: springSoft
};

export const cardTap = { scale: 0.99 };

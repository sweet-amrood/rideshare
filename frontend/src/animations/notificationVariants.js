import { springGentle, fadeFast } from './motionConfig';

export const notificationPanelVariants = {
  initial: { opacity: 0, x: 16, scale: 0.96 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 12, scale: 0.97 }
};

export const notificationPanelTransition = springGentle;

export const notificationItemVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 }
};

export const toastDismissVariants = {
  initial: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }
};

export const badgePulseVariants = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  pulse: {
    scale: [1, 1.12, 1],
    transition: { duration: 0.45, ease: 'easeInOut' }
  }
};

export const badgeSpring = springGentle;
export const badgeFade = fadeFast;

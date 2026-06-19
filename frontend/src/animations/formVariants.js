import { springSoft } from './motionConfig';

export const fieldErrorVariants = {
  initial: { opacity: 0, y: -4, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -4, height: 0 }
};

export const fieldSuccessVariants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 }
};

export const inputFocusVariants = {
  rest: { scale: 1 },
  focus: { scale: 1.005 }
};

export const formMessageTransition = springSoft;

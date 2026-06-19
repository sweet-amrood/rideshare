import { motion, useReducedMotion } from 'framer-motion';
import {
  listContainerVariants,
  listContainerSlow,
  listItemVariants
} from '@/animations/listVariants';

export function StaggerList({
  children,
  className = '',
  slow = false,
  as = 'div',
  ...props
}) {
  const Component = motion[as] || motion.div;
  const variants = slow ? listContainerSlow : listContainerVariants;

  return (
    <Component
      className={className}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      {...props}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className = '', layout = false, ...props }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={layout}
      variants={listItemVariants}
      transition={reduceMotion ? { duration: 0.01 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

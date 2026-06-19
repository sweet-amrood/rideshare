import { motion, useReducedMotion } from 'framer-motion';
import { cardHover, cardTap, cardTransition, cardVariants } from '@/animations/cardVariants';

export default function AnimatedCard({
  children,
  className = '',
  layout = false,
  hover = true,
  as = 'div',
  ...props
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as] || motion.div;

  return (
    <Component
      layout={layout}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduceMotion ? { duration: 0.01 } : cardTransition}
      whileHover={hover && !reduceMotion ? cardHover : undefined}
      whileTap={hover && !reduceMotion ? cardTap : undefined}
      className={className}
      {...props}
    >
      {children}
    </Component>
  );
}

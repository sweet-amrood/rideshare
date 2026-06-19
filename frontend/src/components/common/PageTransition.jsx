import { motion, useReducedMotion } from 'framer-motion';
import { pageTransition, pageVariants } from '@/animations/pageVariants';

export default function PageTransition({ children, className = '' }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={reduceMotion ? { duration: 0.01 } : pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

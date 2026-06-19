import { motion, useReducedMotion } from 'framer-motion';
import { fadeMedium } from '@/animations/motionConfig';

export default function ScrollReveal({
  children,
  className = '',
  delay = 0,
  y = 24,
  once = true,
  amount = 0.2,
  ...props
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ ...fadeMedium, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

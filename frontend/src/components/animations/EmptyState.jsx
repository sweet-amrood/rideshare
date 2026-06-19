import { motion, useReducedMotion } from 'framer-motion';
import { cardTransition, cardVariants } from '@/animations/cardVariants';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      transition={reduceMotion ? { duration: 0.01 } : cardTransition}
    >
      {Icon && (
        <motion.div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/8"
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, ...cardTransition }}
        >
          <Icon className="h-7 w-7 text-white/25" />
        </motion.div>
      )}
      {title && (
        <p className="text-sm font-semibold text-white/60 m-0">{title}</p>
      )}
      {description && (
        <p className="text-xs text-white/40 mt-2 max-w-xs leading-relaxed m-0">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

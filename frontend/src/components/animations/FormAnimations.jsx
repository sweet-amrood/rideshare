import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { fieldErrorVariants, formMessageTransition } from '@/animations/formVariants';

export function FormMessage({ show, children, variant = 'error', className = '' }) {
  const reduceMotion = useReducedMotion();
  const styles =
    variant === 'success'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
      : 'text-red-400 bg-red-500/10 border-red-500/25';

  return (
    <AnimatePresence mode="wait">
      {show && children && (
        <motion.p
          key="form-message"
          variants={fieldErrorVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={reduceMotion ? { duration: 0.01 } : formMessageTransition}
          className={`text-xs px-3 py-2 rounded-lg border ${styles} ${className}`}
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function ProgressBar({ value = 0, className = '', barClassName = '' }) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={`h-1.5 rounded-full bg-white/10 overflow-hidden ${className}`}>
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 ${barClassName}`}
        initial={{ width: reduceMotion ? `${clamped}%` : '0%' }}
        animate={{ width: `${clamped}%` }}
        transition={reduceMotion ? { duration: 0.01 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

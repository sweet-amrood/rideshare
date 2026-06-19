import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  backdropVariants,
  backdropTransition,
  modalVariants,
  modalTransition
} from '@/animations/modalVariants';

export default function AnimatedModal({
  open = true,
  onClose,
  children,
  className = '',
  zIndex = 50,
  closeOnBackdrop = true,
  portal = false
}) {
  const reduceMotion = useReducedMotion();

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ zIndex }}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={reduceMotion ? { duration: 0.01 } : backdropTransition}
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden
          />
          <div
            className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none"
            style={{ zIndex: zIndex + 1 }}
          >
            <motion.div
              key="modal-content"
              role="dialog"
              aria-modal="true"
              className={`pointer-events-auto ${className}`}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={reduceMotion ? { duration: 0.01 } : modalTransition}
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

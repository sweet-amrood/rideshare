import { motion, useReducedMotion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { springGentle } from '@/animations/motionConfig';
import { navItemVariants } from '@/animations/sidebarVariants';

export function MotionNavLink({ to, end, className, children, layoutId = 'nav-active-pill' }) {
  const reduceMotion = useReducedMotion();

  return (
    <NavLink to={to} end={end} className={className} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <motion.div
          className="relative w-full"
          variants={navItemVariants}
          whileHover={reduceMotion ? undefined : { x: 2 }}
          transition={springGentle}
        >
          {isActive && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-xl bg-brand-500/12 border border-brand-500/25"
              transition={reduceMotion ? { duration: 0.01 } : springGentle}
            />
          )}
          <span className="relative z-10 flex items-center gap-3">{children(isActive)}</span>
        </motion.div>
      )}
    </NavLink>
  );
}

export function TabIndicator({ active, layoutId = 'tab-indicator', className = '' }) {
  const reduceMotion = useReducedMotion();

  if (!active) return null;

  return (
    <motion.div
      layoutId={layoutId}
      className={`absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full ${className}`}
      transition={reduceMotion ? { duration: 0.01 } : springGentle}
    />
  );
}

import { motion, useReducedMotion } from 'framer-motion';
import { badgePulseVariants, badgeSpring } from '@/animations/notificationVariants';

export default function AnimatedBadge({
  count,
  className = '',
  max = 9,
  pulse = true
}) {
  const reduceMotion = useReducedMotion();
  const display = count > max ? `${max}+` : count;

  if (!count || count <= 0) return null;

  return (
    <motion.span
      className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-slateCustom-900 ${className}`}
      variants={badgePulseVariants}
      initial="initial"
      animate={pulse && !reduceMotion ? ['animate', 'pulse'] : 'animate'}
      transition={badgeSpring}
      key={count}
    >
      {display}
    </motion.span>
  );
}

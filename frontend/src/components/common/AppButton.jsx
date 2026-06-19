import { motion, useReducedMotion } from 'framer-motion';
import { buttonMotion } from '@/animations/buttonVariants';

export default function AppButton({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  disabled = false,
  type = 'button',
  motionProps = {},
  ...props
}) {
  const reduceMotion = useReducedMotion();

  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-200 cursor-pointer no-underline outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[30px]',
    md: 'text-sm px-5 py-2.5 min-h-[38px]',
    lg: 'text-[15px] px-6 py-3 min-h-[44px]'
  };

  const variants = {
    primary:
      'text-white border-0 [background:linear-gradient(135deg,#4f5ef4_0%,#7c3aed_100%)] hover:shadow-[0_8px_30px_-6px_rgba(79,94,244,0.55)]',
    secondary:
      'bg-transparent text-white/85 hover:text-white border border-brand-500/35 hover:border-brand-500/70 hover:bg-brand-500/10',
    ghost:
      'bg-transparent text-brand-300 hover:text-brand-100 hover:bg-brand-500/10 border border-transparent',
    danger:
      'text-white border-0 [background:linear-gradient(135deg,#ef4444_0%,#b91c1c_100%)] hover:shadow-[0_8px_25px_-6px_rgba(239,68,68,0.5)]',
    success:
      'text-white border-0 [background:linear-gradient(135deg,#10b981_0%,#06b6d4_100%)] hover:shadow-[0_8px_25px_-6px_rgba(16,185,129,0.5)]',
    outline:
      'bg-transparent text-white/80 border border-white/15 hover:border-white/30 hover:bg-white/5'
  };

  const width = fullWidth ? 'w-full' : 'w-auto max-w-full';

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileHover={!disabled && !reduceMotion ? buttonMotion.hover : undefined}
      whileTap={!disabled && !reduceMotion ? buttonMotion.tap : undefined}
      transition={buttonMotion.spring}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${width} ${className}`}
      {...motionProps}
      {...props}
    >
      {children}
    </motion.button>
  );
}

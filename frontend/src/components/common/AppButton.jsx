/**
 * Primary action button — no white border/outline on focus
 */
export default function AppButton({
  children,
  className = '',
  variant = 'primary',
  fullWidth = false,
  size = 'md',
  disabled = false,
  type = 'button',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors cursor-pointer no-underline outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 min-h-[32px]',
    md: 'text-sm px-5 py-2 min-h-[36px]',
    lg: 'text-sm px-6 py-2.5 min-h-[40px]'
  };

  const variants = {
    primary:
      'bg-brand-500 hover:bg-brand-600 text-white border-2 border-brand-400 hover:border-brand-300 shadow-md shadow-brand-500/15',
    secondary:
      'bg-transparent text-white/85 border-2 border-brand-500/40 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-100',
    ghost: 'bg-transparent text-brand-300 hover:text-brand-100 hover:bg-brand-500/10 border-2 border-transparent'
  };

  const width = fullWidth ? 'w-full' : 'w-auto max-w-full';

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

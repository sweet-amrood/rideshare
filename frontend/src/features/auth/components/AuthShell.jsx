import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiOutlineTruck } from 'react-icons/hi2';
import { env } from '@/config/env';
import { paths } from '@/app/router/paths';

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-[420px]',
  variant = 'default'
}) {
  const isCompact = variant === 'compact';

  return (
    <motion.div {...fadeUp} className={`w-full ${maxWidth} mx-auto`}>
      <div className="glass-panel rounded-2xl shadow-2xl relative overflow-hidden border border-white/[0.06]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-brand-600" />

        <div className={`${isCompact ? 'p-5 sm:p-6' : 'p-5 sm:p-6 md:p-7'} space-y-5`}>
          {/* Header */}
          <div className="space-y-2">
            <Link
              to={paths.login}
              className="inline-flex items-center gap-2.5 group no-underline"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 group-hover:bg-brand-500/25 transition-colors shrink-0">
                <HiOutlineTruck className="h-5 w-5" />
              </span>
              <div className="text-left min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-400/70 leading-none mb-1">
                  {env.appName}
                </p>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight m-0">
                  {title}
                </h1>
              </div>
            </Link>
            {subtitle && (
              <p className="text-sm text-white/50 leading-relaxed pl-[52px]">{subtitle}</p>
            )}
          </div>

          {/* Form body */}
          <div className="space-y-4">{children}</div>

          {footer && (
            <div className="pt-4 border-t border-white/[0.06] text-center">{footer}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { HiOutlineTruck } from 'react-icons/hi2';
import { env } from '@/config/env';

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: 'easeOut' }
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-md',
  compact = false
}) {
  return (
    <motion.div {...fadeUp} className={`w-full ${maxWidth} mx-auto`}>
      <div className="glass-panel rounded-xl sm:rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-brand-500 via-indigo-500 to-brand-600" />

        <div className={`${compact ? 'p-3.5 sm:p-4 space-y-2.5' : 'p-4 sm:p-5 space-y-3'}`}>
          <div className="text-center space-y-0.5">
            <Link to="/login" className="inline-flex items-center justify-center gap-1.5 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400 group-hover:bg-brand-500/25 transition-colors">
                <HiOutlineTruck className="h-5 w-5" />
              </span>
            </Link>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-400 leading-snug max-w-sm mx-auto">{subtitle}</p>
            )}
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-400/70">
              {env.appName}
            </p>
          </div>

          <div className="space-y-2.5">{children}</div>

          {footer && (
            <div className="pt-2 border-t border-white/5 text-center">{footer}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="h-screen max-h-[100dvh] overflow-hidden bg-slateCustom-900 bg-grid flex">
      {/* Brand panel — desktop */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex lg:w-[42%] xl:w-[45%] flex-col justify-between p-12 border-r border-white/5 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 via-transparent to-indigo-900/30 pointer-events-none" />
        <div className="relative z-10">
          <p className="text-brand-400 font-bold text-xs uppercase tracking-[0.25em] mb-4">Trusted commuting</p>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
            Carpool with people you trust.
          </h2>
          <p className="mt-6 text-slate-400 text-lg max-w-md leading-relaxed">
            University and corporate circles. Verified emails. Real-time ride tracking.
          </p>
        </div>
        <ul className="relative z-10 space-y-3 text-sm text-slate-500">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            JWT-secured sessions
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Email & domain verification
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Split costs offline
          </li>
        </ul>
      </motion.aside>

      {/* Form panel — fit viewport, no page scroll */}
      <div className="flex-1 flex items-center justify-center min-h-0 p-3 sm:p-4 px-4 sm:px-6">
        <div className="w-full max-w-md max-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

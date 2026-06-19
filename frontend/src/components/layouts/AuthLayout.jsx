import { Outlet, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Shield, MapPin, Zap } from 'lucide-react';
import { paths } from '@/app/router/paths';

const FEATURES = [
  { icon: Shield, label: 'Verified community', sub: 'University & corporate circles only' },
  { icon: MapPin, label: 'Real-time tracking', sub: 'Live GPS for every shared trip' },
  { icon: Zap, label: 'Instant matching', sub: 'Route-aware seat allocation' }
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen max-h-[100dvh] h-[100dvh] overflow-hidden bg-slateCustom-900 flex flex-col lg:flex-row">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="orb orb-brand w-[700px] h-[700px] -top-56 -left-56 opacity-20" />
        <div className="orb orb-violet w-[500px] h-[500px] bottom-0 right-0 opacity-15" />
        <div className="orb orb-cyan w-[300px] h-[300px] top-1/3 left-1/3 opacity-10" />
      </div>
      <div className="bg-grid absolute inset-0 opacity-60 pointer-events-none" />

      {/* ── LEFT BRAND PANEL (desktop) ── */}
      <motion.aside
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-[38%] xl:w-[40%] flex-col justify-center relative overflow-y-auto overflow-x-hidden shrink-0 px-10 xl:px-14 py-10"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 40% 30%, rgba(79,94,244,0.2) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.12) 0%, transparent 50%)'
          }}
        />

        <div className="absolute top-1/4 right-6 h-28 w-28 rounded-3xl opacity-10 animate-float pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #4f5ef4, #8b5cf6)', animationDelay: '0s' }} />
        <div className="absolute bottom-1/4 left-6 h-16 w-16 rounded-2xl opacity-8 animate-float pointer-events-none"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #4f5ef4)', animationDelay: '1.2s' }} />

        <div className="relative z-10 w-full max-w-[400px] mx-auto space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shadow-glow shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}
            >
              <Car className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base text-white tracking-wider leading-none">
                RIDE SHARE
              </div>
              <div className="text-[9px] text-brand-400/80 font-bold uppercase tracking-[0.22em] mt-1">
                Commuter Hub
              </div>
            </div>
          </div>

          {/* Headline block */}
          <div className="space-y-3">
            <p className="text-brand-400 font-bold text-[11px] uppercase tracking-[0.18em]">
              Trusted commuting
            </p>
            <h2 className="text-[1.75rem] xl:text-[2rem] font-extrabold text-white leading-[1.15]">
              Carpool with people{' '}
              <span className="gradient-text">you trust.</span>
            </h2>
            <p className="text-white/45 text-sm leading-relaxed">
              Verified university and corporate networks. Split costs fairly with dynamic per-km
              pricing.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(79,94,244,0.07)',
                  border: '1px solid rgba(79,94,244,0.15)'
                }}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,94,244,0.18)' }}
                >
                  <Icon className="h-4 w-4 text-brand-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/90 leading-tight">{label}</div>
                  <div className="text-xs text-white/40 mt-0.5 leading-snug">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats — grouped with content, not pinned to viewport bottom */}
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { val: '4.8★', label: 'Avg rating' },
              { val: '100%', label: 'Verified users' },
              { val: '0 Rs.', label: 'Platform fee' }
            ].map(({ val, label }) => (
              <div
                key={label}
                className="text-center px-2 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div className="font-extrabold text-sm gradient-text-brand leading-none">{val}</div>
                <div className="text-[9px] text-white/40 font-medium mt-1 leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        {/* Mobile / tablet brand strip */}
        <div className="lg:hidden shrink-0 px-5 pt-5 pb-1 sm:px-8 sm:pt-6">
          <Link to={paths.login} className="inline-flex items-center gap-2.5 no-underline">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}
            >
              <Car className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wide leading-none">
                RIDE SHARE
              </div>
              <div className="text-[8px] text-brand-400/80 font-bold uppercase tracking-[0.2em] mt-0.5">
                Commuter Hub
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full flex items-start sm:items-center justify-center px-4 py-4 sm:px-8 sm:py-6 lg:py-8">
            <div className="w-full max-w-[420px] my-auto pb-6 sm:pb-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

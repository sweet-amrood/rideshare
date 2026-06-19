import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  Car,
  CheckCircle2,
  MapPin,
  Shield,
  Star,
  Users,
  Zap
} from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ScrollReveal from '@/components/animations/ScrollReveal';
import useUserMode from '@/hooks/useUserMode';
import { useAuth } from '@/hooks/useAuth';

const STATS = [
  { value: '12k+', label: 'Trips completed' },
  { value: '2.4k', label: 'Verified commuters' },
  { value: '98%', label: 'On-time arrivals' },
  { value: '40%', label: 'Avg. cost saved' }
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified commuters',
    text: 'University and corporate networks you can trust — every profile is organization-linked.'
  },
  {
    icon: MapPin,
    title: 'Live route matching',
    text: 'GPS-aware carpools and on-demand rides matched to your actual pickup and drop-off.'
  },
  {
    icon: Users,
    title: 'Split costs fairly',
    text: 'Dynamic per-km pricing with transparent breakdowns before you confirm a seat.'
  },
  {
    icon: Zap,
    title: 'Instant booking',
    text: 'Book a seat, join a carpool, or request a driver in seconds from your phone.'
  }
];

const STEPS = [
  {
    step: '01',
    title: 'Join your network',
    text: 'Sign up with your university or workplace email and complete quick verification.'
  },
  {
    step: '02',
    title: 'Find or offer a ride',
    text: 'Search by route as a passenger, or publish your commute as a driver.'
  },
  {
    step: '03',
    title: 'Ride together',
    text: 'Track live, chat with your group, and pay your fair share automatically.'
  }
];

const TRUST = [
  'Campus & corporate verified',
  'Live GPS trip tracking',
  'In-app group chat',
  'Transparent fare estimates'
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { setMode, USER_MODES } = useUserMode();
  const { user, token, isInitialized } = useAuth();
  const isLoggedIn = Boolean(isInitialized && (user || token));

  const openApp = () => {
    setMode(USER_MODES.APP);
    navigate(isLoggedIn ? paths.dashboard : paths.app);
  };

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb orb-brand w-[520px] h-[520px] -top-32 -left-40 opacity-30 animate-pulse-glow" />
          <div className="orb orb-violet w-[420px] h-[420px] top-1/4 -right-32 opacity-25 animate-pulse-glow" />
          <div className="orb orb-cyan w-[280px] h-[280px] bottom-0 left-1/3 opacity-15 animate-pulse-glow" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(79,94,244,0.18), transparent 70%)'
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5">
              <Star className="h-3.5 w-3.5 text-brand-300" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-brand-300">
                Trusted campus & workplace commuting
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Share rides with people{' '}
              <span className="gradient-text">you trust.</span>
            </h1>

            <p className="text-white/60 text-base sm:text-xl leading-relaxed max-w-2xl">
              Ride Share connects verified passengers and drivers for carpools and on-demand trips.
              Save money, cut traffic, and commute smarter — together.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <AppButton type="button" size="lg" className="sm:min-w-[220px]" onClick={openApp}>
                {isLoggedIn ? 'Go to dashboard' : 'Get started free'}
                <ArrowRight className="h-4 w-4" />
              </AppButton>
              <Link to={paths.about} className="no-underline">
                <AppButton variant="secondary" size="lg" className="w-full sm:min-w-[180px]">
                  How it works
                </AppButton>
              </Link>
            </div>

            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-4">
              {TRUST.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-xs text-white/50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.06] text-center sm:text-left"
              >
                <p className="text-2xl sm:text-3xl font-extrabold gradient-text">{value}</p>
                <p className="text-xs text-white/45 mt-1">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
            Simple process
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How Ride Share works</h2>
          <p className="text-white/55 text-sm sm:text-base">
            From signup to your first shared commute — three steps, no hassle.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map(({ step, title, text }, i) => (
            <ScrollReveal key={step} delay={i * 0.06}>
              <div className="glass-card rounded-2xl p-6 h-full border border-white/[0.06] space-y-4">
                <span className="text-3xl font-extrabold text-brand-500/40">{step}</span>
                <h3 className="font-bold text-white text-lg">{title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-white/[0.04]">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
            Platform features
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Everything you need to commute together
          </h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <ScrollReveal key={title} delay={i * 0.05}>
              <div className="glass-card rounded-2xl p-5 space-y-3 border border-white/[0.06] h-full">
                <div className="h-10 w-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-300" />
                </div>
                <h3 className="font-bold text-white text-sm">{title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Ride types ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <ScrollReveal>
          <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/[0.06]">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
                  Flexible options
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Carpools, on-demand rides, and more
                </h2>
                <p className="text-white/55 text-sm leading-relaxed">
                  Whether you share a daily campus route or need a one-off trip across town, Ride
                  Share adapts to how you actually move.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Users, label: 'Carpool', desc: 'Split daily routes' },
                  { icon: Car, label: 'On-demand', desc: 'Car & bike rides' },
                  { icon: Building2, label: 'Corporate', desc: 'Workplace networks' }
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 text-center space-y-2"
                  >
                    <Icon className="h-5 w-5 text-brand-300 mx-auto" />
                    <p className="font-semibold text-white text-sm">{label}</p>
                    <p className="text-[11px] text-white/45">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── CTA ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28">
        <ScrollReveal>
          <div className="relative overflow-hidden rounded-3xl p-8 sm:p-14 text-center space-y-6 border border-brand-500/20">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(135deg, rgba(79,94,244,0.15) 0%, rgba(124,58,237,0.1) 50%, transparent 100%)'
              }}
            />
            <div className="relative z-10 space-y-5">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
                Ready to commute smarter?
              </h2>
              <p className="text-white/55 text-sm sm:text-base max-w-lg mx-auto">
                {isLoggedIn
                  ? 'Your account is ready. Open the app to book rides or manage your routes.'
                  : 'Join as a passenger, driver, or both. Create a free account and start sharing rides today.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <AppButton type="button" size="lg" onClick={openApp}>
                  {isLoggedIn ? 'Open dashboard' : 'Get started'}
                  <ArrowRight className="h-4 w-4" />
                </AppButton>
                {!isLoggedIn && (
                  <Link to={paths.register} className="no-underline">
                    <AppButton variant="outline" size="lg">
                      Create account
                    </AppButton>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}

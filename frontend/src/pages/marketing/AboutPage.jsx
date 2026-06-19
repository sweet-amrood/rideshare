import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Heart, Leaf, Shield, Target, Users } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ScrollReveal from '@/components/animations/ScrollReveal';
import useUserMode from '@/hooks/useUserMode';
import { useAuth } from '@/hooks/useAuth';

const VALUES = [
  {
    icon: Shield,
    title: 'Safety first',
    text: 'Verified organizations, transparent profiles, and live trip tracking for peace of mind.'
  },
  {
    icon: Users,
    title: 'Community driven',
    text: 'Built around real commuter networks — campuses, offices, and shared destinations.'
  },
  {
    icon: Leaf,
    title: 'Sustainable impact',
    text: 'Fewer solo drives means less congestion and lower emissions per passenger.'
  },
  {
    icon: Heart,
    title: 'Fair for everyone',
    text: 'Drivers recover costs; passengers save money. Pricing is clear before you book.'
  }
];

export default function AboutPage() {
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
      <section className="relative border-b border-white/[0.04]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-brand w-96 h-96 -top-24 right-0 opacity-20" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl space-y-5"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">About us</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              Built for real commuters
            </h1>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed">
              Ride Share is a commuter hub for university campuses and workplaces. We help people
              carpool on shared routes, split fuel costs fairly, and request on-demand rides when
              schedules do not align.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-8">
        <ScrollReveal className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-brand-300">
              <Target className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Our mission</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Make shared commuting the default choice
            </h2>
            <p className="text-white/60 leading-relaxed">
              Every account is tied to a verified organization. Drivers publish routes; passengers
              search by pickup and destination; everyone sees transparent fare estimates before
              booking.
            </p>
            <p className="text-white/60 leading-relaxed">
              We believe commuting should be social, affordable, and reliable — not a daily grind
              spent alone in traffic.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-4 border border-white/[0.06]">
            <h3 className="font-bold text-white text-lg">What you can do</h3>
            <ul className="text-sm text-white/60 space-y-3">
              {[
                'Book on-demand rides (car, bike, rickshaw)',
                'Search and join carpools on your route',
                'Publish rides and manage passenger requests as a driver',
                'Track trips live and chat with your group'
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-brand-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <ScrollReveal className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">Our values</p>
          <h2 className="text-3xl font-extrabold text-white">Why commuters choose us</h2>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 gap-4">
          {VALUES.map(({ icon: Icon, title, text }, i) => (
            <ScrollReveal key={title} delay={i * 0.05}>
              <div className="glass-card rounded-2xl p-6 border border-white/[0.06] h-full space-y-3">
                <div className="h-10 w-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-300" />
                </div>
                <h3 className="font-bold text-white">{title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.1} className="mt-12 text-center">
          <AppButton type="button" onClick={openApp}>
            {isLoggedIn ? 'Open dashboard' : 'Open the app'}
            <ArrowRight className="h-4 w-4" />
          </AppButton>
        </ScrollReveal>
      </section>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Shield, Users, Zap } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ScrollReveal from '@/components/animations/ScrollReveal';

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified commuters',
    text: 'University and corporate networks you can trust.'
  },
  {
    icon: MapPin,
    title: 'Live route matching',
    text: 'GPS-aware carpools and on-demand rides on your route.'
  },
  {
    icon: Users,
    title: 'Split costs fairly',
    text: 'Dynamic per-km pricing — transparent for everyone.'
  },
  {
    icon: Zap,
    title: 'Instant booking',
    text: 'Book a seat or request a driver in seconds.'
  }
];

export default function LandingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20 space-y-20">
      <ScrollReveal className="text-center space-y-6 max-w-3xl mx-auto">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
          Trusted campus & workplace commuting
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08]">
          Share rides with people{' '}
          <span className="gradient-text">you trust.</span>
        </h1>
        <p className="text-white/55 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Ride Share connects verified passengers and drivers for carpools and on-demand trips —
          save money, cut traffic, and commute smarter.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to={paths.app} className="no-underline w-full sm:w-auto">
            <AppButton size="lg" fullWidth className="sm:min-w-[200px]">
              Get started
              <ArrowRight className="h-4 w-4" />
            </AppButton>
          </Link>
          <Link to={paths.about} className="no-underline w-full sm:w-auto">
            <AppButton variant="secondary" size="lg" fullWidth className="sm:min-w-[200px]">
              Learn more
            </AppButton>
          </Link>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.06}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="glass-card rounded-2xl p-5 space-y-3 border border-white/[0.06]"
            >
              <div className="h-10 w-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                <Icon className="h-5 w-5 text-brand-300" />
              </div>
              <h3 className="font-bold text-white text-sm">{title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1} className="glass-panel rounded-2xl p-8 sm:p-12 text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to commute smarter?</h2>
        <p className="text-white/50 text-sm max-w-lg mx-auto">
          Join as a passenger, driver, or both. Open the app to book rides or publish your route.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={paths.register} className="no-underline">
            <AppButton>Create account</AppButton>
          </Link>
          <Link to={paths.login} className="no-underline">
            <AppButton variant="outline">Sign in</AppButton>
          </Link>
        </div>
      </ScrollReveal>
    </div>
  );
}

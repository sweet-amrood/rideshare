import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, HelpCircle, Mail, MapPin, MessageSquare } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ScrollReveal from '@/components/animations/ScrollReveal';

const FAQ = [
  {
    q: 'How do I get verified?',
    a: 'Sign up with your university or corporate email. Our team validates your organization before you can book or offer rides.'
  },
  {
    q: 'Is Ride Share free to use?',
    a: 'Creating an account is free. Passengers pay their share of the trip based on transparent per-km pricing set before booking.'
  },
  {
    q: 'Can I be both a driver and passenger?',
    a: 'Yes. Switch roles anytime in the app — commute as a driver on some days and book rides on others.'
  },
  {
    q: 'How fast do you respond to support emails?',
    a: 'We typically reply within one business day. For active trips, use in-app chat for immediate communication.'
  }
];

export default function ContactPage() {
  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-white/[0.04]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="orb orb-violet w-80 h-80 -top-20 left-1/4 opacity-20" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-3xl space-y-5"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight">
              Get in touch
            </h1>
            <p className="text-white/60 text-base sm:text-lg leading-relaxed">
              Questions about verification, partnerships, or campus rollout? We are here to help —
              reach out anytime.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10">
          <ScrollReveal className="space-y-4">
            <h2 className="text-xl font-bold text-white">Contact channels</h2>
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 flex gap-4 items-start border border-white/[0.06]">
                <Mail className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">Email</p>
                  <a
                    href="mailto:support@rideshare.app"
                    className="text-brand-300 text-sm no-underline hover:text-brand-200"
                  >
                    support@rideshare.app
                  </a>
                  <p className="text-xs text-white/45 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Response within 1 business day
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 flex gap-4 items-start border border-white/[0.06]">
                <MessageSquare className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">In-app support</p>
                  <p className="text-sm text-white/55 leading-relaxed">
                    Signed-in users can message their trip group or driver from the live chat on
                    active rides.
                  </p>
                </div>
              </div>
              <div className="glass-card rounded-2xl p-5 flex gap-4 items-start border border-white/[0.06]">
                <MapPin className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white text-sm">Coverage</p>
                  <p className="text-sm text-white/55 leading-relaxed">
                    Piloting with university and corporate commuter networks. More cities coming
                    soon.
                  </p>
                </div>
              </div>
            </div>

            <Link to={paths.app} className="inline-block no-underline pt-2">
              <AppButton>Open the app</AppButton>
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={0.06} className="space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-brand-400" />
              <h2 className="text-xl font-bold text-white">Frequently asked</h2>
            </div>
            <div className="space-y-3">
              {FAQ.map(({ q, a }) => (
                <div
                  key={q}
                  className="glass-card rounded-2xl p-5 border border-white/[0.06] space-y-2"
                >
                  <p className="font-semibold text-white text-sm">{q}</p>
                  <p className="text-sm text-white/55 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}

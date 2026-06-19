import { Mail, MapPin, MessageSquare } from 'lucide-react';
import ScrollReveal from '@/components/animations/ScrollReveal';

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      <ScrollReveal className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">Contact</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Get in touch</h1>
        <p className="text-white/60 leading-relaxed">
          Questions about verification, partnerships, or campus rollout? Reach out — we typically
          respond within one business day.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="space-y-4">
        <div className="glass-card rounded-2xl p-5 flex gap-4 items-start">
          <Mail className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white text-sm">Email</p>
            <a
              href="mailto:support@rideshare.app"
              className="text-brand-300 text-sm no-underline hover:text-brand-200"
            >
              support@rideshare.app
            </a>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex gap-4 items-start">
          <MessageSquare className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white text-sm">In-app support</p>
            <p className="text-sm text-white/55">
              Signed-in users can message their trip group or driver from the live chat on active
              rides.
            </p>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex gap-4 items-start">
          <MapPin className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-white text-sm">Coverage</p>
            <p className="text-sm text-white/55">
              Piloting with university and corporate commuter networks. More cities coming soon.
            </p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ScrollReveal from '@/components/animations/ScrollReveal';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      <ScrollReveal className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">About us</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Built for real commuters</h1>
        <p className="text-white/60 leading-relaxed">
          Ride Share is a commuter hub for university campuses and workplaces. We help people
          carpool on shared routes, split fuel costs fairly, and request on-demand rides when
          schedules do not align.
        </p>
        <p className="text-white/60 leading-relaxed">
          Every account is tied to a verified organization. Drivers publish routes; passengers
          search by pickup and destination; everyone sees transparent fare estimates before
          booking.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={0.05} className="glass-card rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-white">What you can do</h2>
        <ul className="text-sm text-white/60 space-y-2 list-disc pl-5">
          <li>Book on-demand rides (car, bike, rickshaw)</li>
          <li>Search and join carpools on your route</li>
          <li>Publish rides and manage passenger requests as a driver</li>
          <li>Track trips live and chat with your group</li>
        </ul>
      </ScrollReveal>

      <Link to={paths.app} className="inline-block no-underline">
        <AppButton>Open the app</AppButton>
      </Link>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { paths } from '@/app/router/paths';

export default function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
        <p>© {new Date().getFullYear()} Ride Share · Commuter Hub</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to={paths.about} className="text-white/50 hover:text-white no-underline">
            About
          </Link>
          <Link to={paths.contact} className="text-white/50 hover:text-white no-underline">
            Contact
          </Link>
          <Link to={paths.app} className="text-brand-400 hover:text-brand-300 no-underline">
            App
          </Link>
        </div>
      </div>
    </footer>
  );
}

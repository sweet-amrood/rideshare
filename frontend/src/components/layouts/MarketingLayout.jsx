import { Link, Outlet, useLocation } from 'react-router-dom';
import { Car } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';

const NAV = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.about, label: 'About' },
  { to: paths.contact, label: 'Contact' }
];

export default function MarketingLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slateCustom-900 text-white flex flex-col bg-grid">
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(8, 12, 20, 0.92)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to={paths.home} className="inline-flex items-center gap-2.5 no-underline shrink-0">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}
            >
              <Car className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-wide text-white">RIDE SHARE</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-6">
            {NAV.map(({ to, label, end }) => {
              const active = end ? location.pathname === to : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm font-semibold no-underline transition-colors ${
                    active ? 'text-brand-300' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <Link to={paths.login} className="hidden sm:inline-flex no-underline">
              <AppButton variant="ghost" size="sm">
                Sign in
              </AppButton>
            </Link>
            <Link to={paths.app} className="no-underline">
              <AppButton size="sm">Open app</AppButton>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} Ride Share · Commuter Hub</p>
          <div className="flex gap-4">
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
    </div>
  );
}

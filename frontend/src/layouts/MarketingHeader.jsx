import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { paths } from '@/app/router/paths';
import AppButton from '@/components/common/AppButton';
import ModeSwitcher from '@/components/common/ModeSwitcher';
import useUserMode from '@/hooks/useUserMode';
import { useAuth } from '@/hooks/useAuth';

const NAV = [
  { to: paths.home, label: 'Home', end: true },
  { to: paths.about, label: 'About' },
  { to: paths.contact, label: 'Contact' }
];

export default function MarketingHeader({ hidden = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setMode, USER_MODES } = useUserMode();
  const { user, token, isInitialized } = useAuth();
  const isLoggedIn = Boolean(isInitialized && (user || token));

  const openApp = () => {
    setMode(USER_MODES.APP);
    navigate(isLoggedIn ? paths.dashboard : paths.app);
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/[0.06] transition-all duration-500 ease-out ${
        hidden ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
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
          <ModeSwitcher variant="compact" className="hidden sm:flex" />
          {!isLoggedIn && (
            <Link to={paths.login} className="hidden md:inline-flex no-underline">
              <AppButton variant="ghost" size="sm">
                Sign in
              </AppButton>
            </Link>
          )}
          <AppButton type="button" size="sm" onClick={openApp}>
            {isLoggedIn ? 'Open dashboard' : 'Open app'}
          </AppButton>
        </div>
      </div>
    </header>
  );
}

import { useNavigate } from 'react-router-dom';
import { Globe, Smartphone } from 'lucide-react';
import useUserMode from '@/hooks/useUserMode';
import { paths } from '@/app/router/paths';
import { userModeLabel } from '@/utils/userMode';
import AppButton from '@/components/common/AppButton';

/**
 * Switch between app and marketing website modes.
 * @param {'compact' | 'menu' | 'settings'} variant
 */
export default function ModeSwitcher({ variant = 'compact', className = '' }) {
  const navigate = useNavigate();
  const { mode, effectiveMode, setMode, USER_MODES } = useUserMode();

  const goApp = () => {
    setMode(USER_MODES.APP);
    navigate(paths.app);
  };

  const goWebsite = () => {
    setMode(USER_MODES.WEBSITE);
    navigate(paths.home);
  };

  if (variant === 'settings') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <h3 className="text-lg font-bold text-white">Experience mode</h3>
          <p className="text-sm text-white/75 mt-1">
            Choose whether Ride Share opens the commuter app or the marketing website by default.
          </p>
        </div>
        <p className="text-xs text-white/45">
          Current:{' '}
          <span className="text-brand-300 font-semibold">
            {userModeLabel(mode ?? effectiveMode)}
            {!mode ? ' (device default)' : ''}
          </span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <AppButton
            type="button"
            variant={effectiveMode === USER_MODES.APP ? 'primary' : 'secondary'}
            onClick={goApp}
            className="flex-1"
          >
            <Smartphone className="h-4 w-4" />
            Passenger / Driver app
          </AppButton>
          <AppButton
            type="button"
            variant={effectiveMode === USER_MODES.WEBSITE ? 'primary' : 'secondary'}
            onClick={goWebsite}
            className="flex-1"
          >
            <Globe className="h-4 w-4" />
            Explore website
          </AppButton>
        </div>
      </div>
    );
  }

  if (variant === 'menu') {
    return (
      <div className={`flex flex-col gap-1 min-w-[180px] p-1 ${className}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 py-1">
          Continue as
        </p>
        <button
          type="button"
          onClick={goApp}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border-0 cursor-pointer transition-colors ${
            effectiveMode === USER_MODES.APP
              ? 'bg-brand-500/20 text-brand-200'
              : 'bg-transparent text-white/75 hover:bg-white/5'
          }`}
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          App
        </button>
        <button
          type="button"
          onClick={goWebsite}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border-0 cursor-pointer transition-colors ${
            effectiveMode === USER_MODES.WEBSITE
              ? 'bg-brand-500/20 text-brand-200'
              : 'bg-transparent text-white/75 hover:bg-white/5'
          }`}
        >
          <Globe className="h-4 w-4 shrink-0" />
          Website
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={goApp}
        title="Switch to app"
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors ${
          effectiveMode === USER_MODES.APP
            ? 'bg-brand-500/25 text-brand-200'
            : 'bg-white/5 text-white/55 hover:text-white hover:bg-white/10'
        }`}
      >
        App
      </button>
      <button
        type="button"
        onClick={goWebsite}
        title="Switch to website"
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-0 cursor-pointer transition-colors ${
          effectiveMode === USER_MODES.WEBSITE
            ? 'bg-brand-500/25 text-brand-200'
            : 'bg-white/5 text-white/55 hover:text-white hover:bg-white/10'
        }`}
      >
        Site
      </button>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  getUserMode,
  resolveEntryMode,
  setUserMode as persistUserMode,
  USER_MODES
} from '@/utils/userMode';

export default function useUserMode() {
  const [mode, setModeState] = useState(() => getUserMode());

  useEffect(() => {
    const onChange = (e) => setModeState(e.detail ?? getUserMode());
    window.addEventListener('userModeChange', onChange);
    return () => window.removeEventListener('userModeChange', onChange);
  }, []);

  const setMode = useCallback((next) => {
    persistUserMode(next);
    setModeState(next);
  }, []);

  return {
    mode,
    effectiveMode: mode ?? resolveEntryMode(),
    isApp: (mode ?? resolveEntryMode()) === USER_MODES.APP,
    isWebsite: (mode ?? resolveEntryMode()) === USER_MODES.WEBSITE,
    hasPreference: mode === USER_MODES.APP || mode === USER_MODES.WEBSITE,
    setMode,
    USER_MODES
  };
}

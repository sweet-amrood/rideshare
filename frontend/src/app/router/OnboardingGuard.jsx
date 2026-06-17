import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { needsDriverSetup } from '@/utils/commuterRole';
import { isDriver } from '@/utils/roles';

/** Paths that require completed driver setup before access */
const DRIVER_SETUP_PATHS = ['/offer', '/driver'];

/**
 * Ensures commuter onboarding is done. Driver document setup is only required
 * for driver-specific routes — users can stay in passenger mode without finishing it.
 */
export default function OnboardingGuard() {
  const { onboardingComplete, user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const onOnboarding = path.startsWith('/onboarding');
  const onCompleteProfile = path === '/complete-profile';

  if (user?.profileCompleted === false && !onCompleteProfile) {
    return <Navigate to="/complete-profile" replace />;
  }

  const mustFinishDriverSetup =
    user &&
    isDriver(user.roles) &&
    needsDriverSetup(user.roles, user.driverSetupComplete, user.verification, user.driverApplicant) &&
    DRIVER_SETUP_PATHS.some((prefix) => path.startsWith(prefix));

  if (!onboardingComplete) {
    if (!onOnboarding) return <Navigate to="/onboarding" replace />;
    return <Outlet />;
  }

  if (mustFinishDriverSetup) {
    return <Navigate to="/onboarding/driver-setup" replace state={{ from: path }} />;
  }

  return <Outlet />;
}

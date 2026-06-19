import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { needsDriverSetup } from '@/utils/commuterRole';
import { isDriver } from '@/utils/roles';
import { paths } from './paths';

const DRIVER_SETUP_PATHS = [paths.offer, paths.app + '/driver'];

export default function OnboardingGuard() {
  const { onboardingComplete, user } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const onOnboarding = path.startsWith(paths.onboarding);
  const onCompleteProfile = path === paths.completeProfile;

  if (user?.profileCompleted === false && !onCompleteProfile) {
    return <Navigate to={paths.completeProfile} replace />;
  }

  const mustFinishDriverSetup =
    user &&
    isDriver(user.roles) &&
    needsDriverSetup(user.roles, user.driverSetupComplete, user.verification, user.driverApplicant) &&
    DRIVER_SETUP_PATHS.some((prefix) => path.startsWith(prefix));

  if (!onboardingComplete) {
    if (!onOnboarding) return <Navigate to={paths.onboarding} replace />;
    return <Outlet />;
  }

  if (mustFinishDriverSetup) {
    return <Navigate to={paths.driverSetup} replace state={{ from: path }} />;
  }

  return <Outlet />;
}

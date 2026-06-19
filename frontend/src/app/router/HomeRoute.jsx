import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingScreen from '@/components/common/LoadingScreen';
import { useAuth } from '@/hooks/useAuth';
import { resolveEntryMode, USER_MODES } from '@/utils/userMode';
import { paths } from './paths';

const LandingPage = lazy(() => import('@/pages/marketing/LandingPage'));

/**
 * Marketing home (`/`): logged-out users always see the landing page.
 * Logged-in users with app preference may auto-redirect to /app.
 */
export default function HomeRoute() {
  const { user, token, isInitialized } = useAuth();
  const isLoggedIn = Boolean(isInitialized && (user || token));

  if (!isInitialized) {
    return <LoadingScreen message="Loading home…" fullscreen />;
  }

  if (isLoggedIn && resolveEntryMode() === USER_MODES.APP) {
    return <Navigate to={paths.app} replace />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading home…" fullscreen />}>
      <LandingPage />
    </Suspense>
  );
}

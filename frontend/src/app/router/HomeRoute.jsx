import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import MarketingPageLoader from '@/components/common/MarketingPageLoader';
import { resolveEntryMode, USER_MODES } from '@/utils/userMode';
import { paths } from './paths';

const LandingPage = lazy(() => import('@/pages/marketing/LandingPage'));

/**
 * Marketing home (`/`): localStorage preference overrides device default
 * (desktop → website, mobile → app).
 */
export default function HomeRoute() {
  if (resolveEntryMode() === USER_MODES.APP) {
    return <Navigate to={paths.app} replace />;
  }

  return (
    <Suspense fallback={<MarketingPageLoader message="Loading home…" />}>
      <LandingPage />
    </Suspense>
  );
}

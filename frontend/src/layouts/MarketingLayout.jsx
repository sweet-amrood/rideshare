import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '@/components/common/PageTransition';
import LoadingScreen from '@/components/common/LoadingScreen';
import MarketingHeader from './MarketingHeader';
import MarketingFooter from './MarketingFooter';

export default function MarketingLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slateCustom-900 text-white flex flex-col bg-grid">
      <MarketingHeader />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Suspense fallback={<LoadingScreen message="Loading page…" fullscreen />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </main>

      <MarketingFooter />
    </div>
  );
}

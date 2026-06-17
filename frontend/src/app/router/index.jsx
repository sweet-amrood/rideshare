import { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f5ef4] border-t-transparent"
        role="status"
        aria-label="Loading page"
      />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      {useRoutes(routes)}
    </Suspense>
  );
}

import { Navigate, useLocation } from 'react-router-dom';
import useIsMobile from '@/hooks/useIsMobile';
import { paths } from './paths';

/**
 * Sends mobile visitors from marketing entry to the app shell.
 * Only used on `/` — never wraps /app routes (prevents redirect loops).
 */
export default function MobileRedirect({ children }) {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (isMobile) {
    return <Navigate to={paths.app} replace state={{ from: location.pathname }} />;
  }

  return children;
}

import { Navigate, useLocation } from 'react-router-dom';
import { APP_BASE } from './paths';

/** Legacy URLs like /dashboard → /app/dashboard */
export default function AppPathRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={`${APP_BASE}${location.pathname}${location.search}${location.hash}`}
      replace
    />
  );
}

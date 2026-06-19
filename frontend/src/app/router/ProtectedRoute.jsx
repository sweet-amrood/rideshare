import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/common/LoadingScreen';
import { paths } from './paths';

export default function ProtectedRoute() {
  const { token, user, loading, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized || loading) {
    return <LoadingScreen />;
  }

  if (!token || !user) {
    return <Navigate to={paths.login} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

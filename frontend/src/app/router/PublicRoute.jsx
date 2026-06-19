import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/common/LoadingScreen';
import { paths } from './paths';

export default function PublicRoute({ children }) {
  const { token, user, loading, isInitialized, onboardingComplete } = useAuth();

  if (!isInitialized || loading) {
    return <LoadingScreen />;
  }

  if (token && user) {
    if (user.profileCompleted === false || user.requiresProfileCompletion) {
      return <Navigate to={paths.completeProfile} replace />;
    }
    return (
      <Navigate to={onboardingComplete ? paths.dashboard : paths.onboarding} replace />
    );
  }

  return children;
}

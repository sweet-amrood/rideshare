import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { hasAnyRole, normalizeRoles } from '@/utils/roles';

/**
 * Restricts a route to users with at least one of `allow` roles.
 */
import { paths } from '@/app/router/paths';

export default function RoleRoute({ allow, redirectTo = paths.dashboard, children }) {
  const { user } = useAuth();
  const location = useLocation();
  const roles = normalizeRoles(user?.roles);
  const required = Array.isArray(allow) ? allow : [allow];

  if (!hasAnyRole(roles, required)) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname, reason: 'role' }} />;
  }

  return children;
}

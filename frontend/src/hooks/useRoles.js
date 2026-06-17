import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  normalizeRoles,
  isRider,
  isDriver,
  isBoth,
  formatRoleLabel,
  hasAnyRole,
  getNavItemsForRoles,
  getProfileTabsForRoles,
  getDefaultHomePath,
  ROLES
} from '@/utils/roles';

export function useRoles() {
  const { user } = useAuth();

  return useMemo(() => {
    const roles = normalizeRoles(user?.roles);
    return {
      roles,
      isRider: isRider(roles),
      isDriver: isDriver(roles),
      isBoth: isBoth(roles),
      roleLabel: formatRoleLabel(roles),
      hasRole: (role) => hasAnyRole(roles, role),
      navItems: getNavItemsForRoles(roles),
      profileTabs: getProfileTabsForRoles(roles),
      defaultHomePath: getDefaultHomePath(roles),
      ROLES
    };
  }, [user?.roles]);
}

export default useRoles;

import { profileService } from '@/api/services/profile.service';
import { isDriver } from '@/utils/roles';

export function activeCommuterRole(roles = []) {
  if (roles.includes('DRIVER') && !roles.includes('RIDER')) return 'DRIVER';
  return 'RIDER';
}

export function hasDriverDocuments(verification) {
  return !!(
    verification?.cnicUrl?.trim?.() &&
    verification?.selfieUrl?.trim?.() &&
    verification?.licenseUrl?.trim?.()
  );
}

export function isDriverApplicationPending(user) {
  return Boolean(
    user?.driverApplicant &&
      user?.verification?.status === 'PENDING' &&
      hasDriverDocuments(user?.verification)
  );
}

export function isDriverFullyApproved(user) {
  if (!isDriver(user?.roles)) return false;
  if (user?.driverSetupComplete === true && user?.verification?.status === 'APPROVED') {
    return true;
  }
  return user?.verification?.status === 'APPROVED' && hasDriverDocuments(user?.verification);
}

export function needsDriverSetup(
  roles = [],
  driverSetupComplete,
  verification,
  driverApplicant = false
) {
  if (!isDriver(roles)) return false;
  if (verification?.status === 'APPROVED' && hasDriverDocuments(verification)) return false;
  if (driverApplicant && verification?.status === 'PENDING') return false;
  return driverSetupComplete !== true;
}

/** Persist role change and return updated user from API */
export async function persistCommuterRole(role) {
  const res = await profileService.updateProfile({ roles: [role] });
  return res.data?.user;
}

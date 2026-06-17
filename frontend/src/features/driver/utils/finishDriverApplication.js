import { persistCommuterRole } from '@/utils/commuterRole';

/**
 * After driver docs are uploaded: switch to passenger mode and return updated user.
 */
export async function finishDriverApplicationAsPassenger({ setUser, data }) {
  const u = await persistCommuterRole('RIDER');
  const merged = {
    ...(data?.user || {}),
    ...(u || {}),
    roles: ['RIDER'],
    driverSetupComplete: false,
    driverApplicant: true,
    verification: u?.verification || data?.user?.verification
  };
  setUser({
    roles: merged.roles,
    driverSetupComplete: merged.driverSetupComplete,
    driverApplicant: merged.driverApplicant,
    verification: merged.verification,
    driverAvailability: merged.driverAvailability
  });
  return merged;
}

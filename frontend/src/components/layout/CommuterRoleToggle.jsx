import { useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineUserGroup, HiOutlineTruck } from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import {
  activeCommuterRole,
  isDriverApplicationPending,
  isDriverFullyApproved,
  needsDriverSetup,
  persistCommuterRole
} from '@/utils/commuterRole';

const OPTIONS = [
  { id: 'RIDER', label: 'Passenger', short: 'Passenger', icon: HiOutlineUserGroup },
  { id: 'DRIVER', label: 'Driver', short: 'Driver', icon: HiOutlineTruck }
];

export default function CommuterRoleToggle({ onRoleChange, size = 'default' }) {
  const { user, setUser } = useAuth();
  const current = activeCommuterRole(user?.roles);
  const [saving, setSaving] = useState(false);
  const isCompact = size === 'compact';
  const driverPending = isDriverApplicationPending(user);

  const applyUser = (u) => {
    if (!u) return;
    setUser({
      roles: u.roles,
      driverSetupComplete: u.driverSetupComplete,
      driverApplicant: u.driverApplicant,
      driverAvailability: u.driverAvailability,
      verification: u.verification
    });
    onRoleChange?.(u);
  };

  const switchRole = async (selected) => {
    if (selected === current || saving) return;

    if (selected === 'DRIVER') {
      if (isDriverApplicationPending(user)) {
        toast.error(
          'Your driver application is under admin review. You can use Driver mode once it is approved.'
        );
        return;
      }
      if (current === 'RIDER') {
        const ok = window.confirm(
          'Switch to Driver mode?\n\nYou will need approved documents and a vehicle to offer rides. You can switch back to Passenger anytime.'
        );
        if (!ok) return;
      }
    }

    setSaving(true);
    try {
      const u = await persistCommuterRole(selected);
      applyUser(u);

      if (selected === 'RIDER') {
        toast.success('Passenger mode');
        return;
      }

      if (isDriverApplicationPending(u)) {
        toast.error('Driver application still pending — stay in Passenger mode for now');
        await persistCommuterRole('RIDER');
        applyUser({ ...u, roles: ['RIDER'] });
        return;
      }
      if (needsDriverSetup(u?.roles, u?.driverSetupComplete, u?.verification, u?.driverApplicant)) {
        toast.success('Driver mode — finish setup from Profile when ready');
      } else if (isDriverFullyApproved(u)) {
        toast.success('Driver mode');
        if (!u?.driverAvailability?.isOnline) {
          toast('Tap Go online in the menu to receive passenger requests', {
            icon: '📡',
            duration: 5000
          });
        }
      } else {
        toast.success('Driver mode');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not switch role');
    } finally {
      setSaving(false);
    }
  };

  const index = current === 'DRIVER' ? 1 : 0;

  return (
    <div className="w-full" role="group" aria-label="Commuter role">
      <div
        className={`relative flex w-full rounded-md bg-brand-500/10 border border-brand-500/25 p-0.5 ${
          isCompact ? 'h-7' : 'h-8'
        }`}
      >
        <span
          aria-hidden
          className="absolute top-0.5 bottom-0.5 rounded-[5px] bg-[#5b4ef5] transition-all duration-200 ease-out"
          style={{
            width: 'calc(50% - 2px)',
            left: index === 0 ? '2px' : 'calc(50%)'
          }}
        />

        {OPTIONS.map(({ id, label, short, icon: Icon }) => {
          const on = current === id;
          return (
            <button
              key={id}
              type="button"
              disabled={saving || (id === 'DRIVER' && driverPending)}
              title={
                id === 'DRIVER' && driverPending
                  ? 'Driver application under admin review'
                  : undefined
              }
              onClick={() => switchRole(id)}
              className={`choice-btn relative z-10 flex-1 flex items-center justify-center gap-1 mx-0.5 rounded-[5px] border-2 bg-transparent outline-none cursor-pointer transition-all ${
                on
                  ? 'border-brand-500 text-white'
                  : 'border-transparent text-white/45 hover:border-brand-500/60 hover:text-brand-100'
              } ${saving ? 'opacity-60' : ''}`}
            >
              <Icon
                className={`shrink-0 ${isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${
                  on ? 'text-white' : 'text-white/70'
                }`}
              />
              <span className={`font-medium ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                {isCompact ? short : label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

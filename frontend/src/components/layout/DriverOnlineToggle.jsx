import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Radio } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import { isDriver } from '@/utils/roles';
import { useAppSocket } from '@/hooks/useAppSocket';
import {
  resolveCurrentLocationAsPoint,
  ACCURATE_POSITION_OPTIONS,
  FAST_POSITION_OPTIONS,
  geolocationErrorMessage
} from '@/components/map/geolocation';

async function resolveLocationForOnline() {
  try {
    const pt = await resolveCurrentLocationAsPoint({
      positionOptions: FAST_POSITION_OPTIONS
    });
    return { lat: pt.lat, lng: pt.lng };
  } catch (fastErr) {
    try {
      const pt = await resolveCurrentLocationAsPoint({
        positionOptions: ACCURATE_POSITION_OPTIONS
      });
      return { lat: pt.lat, lng: pt.lng };
    } catch {
      return { error: geolocationErrorMessage(fastErr) };
    }
  }
}

export default function DriverOnlineToggle({ onNeedsVehiclePick }) {
  const { user, setUser } = useAuth();
  const [isOnline, setIsOnline] = useState(user?.driverAvailability?.isOnline ?? false);
  const [saving, setSaving] = useState(false);
  const { emitDriverLocation } = useAppSocket({});

  useEffect(() => {
    setIsOnline(user?.driverAvailability?.isOnline ?? false);
  }, [user?.driverAvailability?.isOnline]);

  useEffect(() => {
    if (!isOnline || !isDriver(user?.roles)) return undefined;
    const tick = async () => {
      try {
        const pt = await resolveCurrentLocationAsPoint({
          positionOptions: FAST_POSITION_OPTIONS
        });
        await profileService.updateDriverStatus({ lat: pt.lat, lng: pt.lng });
        emitDriverLocation(pt.lat, pt.lng);
      } catch {
        /* ignore background location errors */
      }
    };
    tick();
    const id = setInterval(tick, 25000);
    return () => clearInterval(id);
  }, [isOnline, user?.roles, emitDriverLocation]);

  if (!isDriver(user?.roles)) return null;

  const toggle = async () => {
    setSaving(true);
    try {
      if (!isOnline) {
        const statusRes = await profileService.getDriverStatus();
        const approved = statusRes.data?.approvedVehicles || [];
        const activeId = statusRes.data?.activeVehicleId;

        if (approved.length === 0) {
          toast.error('Add a vehicle in Profile and wait for admin approval before going online.');
          return;
        }
        if (approved.length > 1 && !activeId) {
          toast.error('Select which vehicle you are driving from the dropdown above.');
          onNeedsVehiclePick?.();
          return;
        }
      }

      let payload = { isOnline: !isOnline };

      if (!isOnline) {
        const loc = await resolveLocationForOnline();
        if (loc?.lat != null && loc?.lng != null) {
          payload = { ...payload, lat: loc.lat, lng: loc.lng };
        } else if (loc?.error) {
          toast(loc.error, { icon: '📍', duration: 5000 });
          toast('Going online without GPS — passengers may not see your exact position.', {
            icon: 'ℹ️',
            duration: 4000
          });
        }
      }

      const res = await profileService.updateDriverStatus(payload);
      setIsOnline(res.data?.isOnline ?? !isOnline);
      setUser({
        driverAvailability: {
          ...user?.driverAvailability,
          ...res.data
        }
      });
      toast.success(res.data?.isOnline ? 'Online — receiving requests' : 'Offline');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update status';
      toast.error(msg);
      if (msg.toLowerCase().includes('choose which vehicle')) {
        onNeedsVehiclePick?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      disabled={saving}
      onClick={toggle}
      className={`modal-option-btn w-full flex items-center justify-center gap-2 h-8 rounded-md text-[12px] font-medium border-2 transition-all ${
        isOnline
          ? 'bg-emerald-600/90 text-white border-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-transparent text-white/70 border-slateCustom-500 hover:border-emerald-500/50 hover:text-emerald-200 hover:bg-emerald-500/10'
      }`}
    >
      <Radio className={`h-3.5 w-3.5 shrink-0 ${isOnline ? 'animate-pulse' : ''}`} />
      <span>{saving ? 'Updating…' : isOnline ? 'Online' : 'Go online'}</span>
    </button>
  );
}

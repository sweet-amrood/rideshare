import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Radio } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import { isDriver } from '@/utils/roles';
import { useAppSocket } from '@/hooks/useAppSocket';
import {
  resolveCurrentLocationAsPoint,
  ACCURATE_POSITION_OPTIONS
} from '@/components/map/geolocation';

export default function DriverOnlineToggle() {
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
          positionOptions: ACCURATE_POSITION_OPTIONS
        });
        await profileService.updateDriverStatus({ lat: pt.lat, lng: pt.lng });
        emitDriverLocation(pt.lat, pt.lng);
      } catch {
        /* ignore */
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
      let payload = { isOnline: !isOnline };
      if (!isOnline) {
        const pt = await resolveCurrentLocationAsPoint({
          positionOptions: ACCURATE_POSITION_OPTIONS
        });
        payload = { ...payload, lat: pt.lat, lng: pt.lng };
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
      toast.error(err.response?.data?.message || 'Could not update status');
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
          : 'bg-transparent text-white/70 border-slateCustom-500 hover:border-brand-500 hover:text-brand-100 hover:bg-brand-500/10'
      }`}
    >
      <Radio className={`h-3.5 w-3.5 shrink-0 ${isOnline ? 'animate-pulse' : ''}`} />
      <span>{saving ? 'Updating…' : isOnline ? 'Online' : 'Go online'}</span>
    </button>
  );
}

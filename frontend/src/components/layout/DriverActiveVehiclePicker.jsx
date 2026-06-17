import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Car, Bike, CircleDot, ChevronDown, Loader2 } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import { isDriver } from '@/utils/roles';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';

const TYPE_ICON = { CAR: Car, BIKE: Bike, RICKSHAW: CircleDot };

function vehicleLabel(v) {
  const plate = v.licensePlate || v.plateNumber;
  return plate || [v.make, v.model].filter(Boolean).join(' ') || '—';
}

export default function DriverActiveVehiclePicker({ onNeedsPick }) {
  const { user, setUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [activeId, setActiveId] = useState(user?.driverAvailability?.activeVehicleId || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!isDriver(user?.roles)) return;
    try {
      const res = await profileService.getDriverStatus();
      const list = res.data?.approvedVehicles || [];
      setVehicles(list);
      const id = res.data?.activeVehicleId ? String(res.data.activeVehicleId) : '';
      setActiveId(id);
      if (list.length > 1 && !id) onNeedsPick?.(true);
      else onNeedsPick?.(false);
      if (res.data?.activeVehicleId) {
        setUser({
          driverAvailability: {
            ...user?.driverAvailability,
            activeVehicleId: res.data.activeVehicleId,
            activeVehicleType: res.data.activeVehicleType,
            isOnline: res.data.isOnline
          }
        });
      }
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [user?.roles, onNeedsPick, setUser, user?.driverAvailability]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isDriver(user?.roles)) return null;

  if (loading) {
    return (
      <div className="h-8 flex items-center text-[11px] text-white/30">
        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
        Loading…
      </div>
    );
  }

  if (vehicles.length === 0) return null;

  const pick = async (vehicleId) => {
    setSaving(true);
    try {
      const res = await profileService.updateDriverStatus({ activeVehicleId: vehicleId });
      setActiveId(String(vehicleId));
      setUser({ driverAvailability: res.data });
      toast.success('Vehicle updated', { duration: 1800 });
      onNeedsPick?.(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (vehicles.length === 1) {
    const v = vehicles[0];
    return (
      <p className="text-[11px] text-white/45 truncate leading-none py-0.5">
        <span className="text-white/65">{getVehicleTypeLabel(v.vehicleType)}</span>
        <span className="text-white/30"> · {vehicleLabel(v)}</span>
      </p>
    );
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor="active-vehicle-select">
        Active vehicle
      </label>
      <select
        id="active-vehicle-select"
        value={activeId}
        disabled={saving}
        onChange={(e) => pick(e.target.value)}
        className="w-full h-8 appearance-none rounded-lg border border-slateCustom-600 bg-slateCustom-800/60 pl-2.5 pr-7 text-[12px] text-white/85 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/30 disabled:opacity-50"
      >
        <option value="" className="bg-slateCustom-800 text-white/60">
          Vehicle
        </option>
        {vehicles.map((v) => (
          <option key={v._id} value={v._id} className="bg-slateCustom-800">
            {getVehicleTypeLabel(v.vehicleType)} · {vehicleLabel(v)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/25" />
    </div>
  );
}

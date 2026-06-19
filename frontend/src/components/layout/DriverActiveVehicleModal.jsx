import { useEffect, useState } from 'react';
import { Car, Bike, CircleDot, Loader2, X } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import { useAuth } from '@/hooks/useAuth';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';
import AnimatedModal from '@/components/animations/AnimatedModal';

const TYPE_ICON = { CAR: Car, BIKE: Bike, RICKSHAW: CircleDot };

function vehicleLabel(v) {
  const plate = v.licensePlate || v.plateNumber;
  const name = [v.make, v.model].filter(Boolean).join(' ').trim();
  return plate || name || '';
}

export default function DriverActiveVehicleModal({ open, vehicles: vehiclesProp = [], onDone }) {
  const { setUser } = useAuth();
  const [vehicles, setVehicles] = useState(vehiclesProp);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vehiclesProp.length) setVehicles(vehiclesProp);
  }, [vehiclesProp]);

  useEffect(() => {
    if (!open) return;
    if (vehicles.length === 1) setSelected(String(vehicles[0]._id));
    else if (!vehicles.length) {
      profileService.getDriverStatus().then((res) => {
        setVehicles(res.data?.approvedVehicles || []);
      });
    }
  }, [open, vehicles.length]);

  const confirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await profileService.updateDriverStatus({ activeVehicleId: selected });
      setUser({ driverAvailability: res.data });
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const loading = vehicles.length === 0;
  const showList = vehicles.length >= 2;

  return (
    <AnimatedModal open={open} onClose={onDone} zIndex={60}>
      <div
        className="glass-panel relative w-full max-w-[320px] rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="active-vehicle-title"
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2 border-b border-slateCustom-700/50">
          <div>
            <h2
              id="active-vehicle-title"
              className="text-[15px] font-semibold text-white leading-tight"
            >
              Select vehicle
            </h2>
            <p className="text-[12px] text-white/55 mt-0.5 leading-snug">
              Only matching requests will appear.
            </p>
          </div>
          <button
            type="button"
            onClick={onDone}
            className="modal-option-btn p-1.5 rounded-md border-2 border-slateCustom-600 text-white/40 hover:text-white hover:border-brand-500 shrink-0 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-white/40">
            <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
          </div>
        ) : showList ? (
          <ul
            className="list-none m-0 p-3 space-y-2 [&>li]:list-none"
            role="radiogroup"
            aria-label="Vehicle"
            style={{ listStyle: 'none' }}
          >
            {vehicles.map((v) => {
              const Icon = TYPE_ICON[v.vehicleType] || Car;
              const active = String(v._id) === String(selected);
              const sub = vehicleLabel(v);
              return (
                <li key={v._id} className="list-none" style={{ listStyle: 'none' }}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(String(v._id))}
                    className={`modal-option-btn group w-full flex items-center gap-3 px-3 min-h-[44px] rounded-lg border-2 text-left transition-all duration-200 cursor-pointer outline-none ${
                      active
                        ? 'border-brand-500 bg-brand-500/15 text-white ring-2 ring-brand-500/25'
                        : 'border-slateCustom-500 bg-transparent text-white/75 hover:border-brand-500 hover:bg-brand-500/10 hover:text-brand-100 hover:ring-2 hover:ring-brand-500/20'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? 'text-brand-400'
                          : 'text-white/35 group-hover:text-brand-400'
                      }`}
                      strokeWidth={1.5}
                    />
                    <span className="flex-1 min-w-0 text-[13px] leading-tight truncate">
                      <span className={active ? 'font-medium' : 'group-hover:text-brand-50'}>
                        {getVehicleTypeLabel(v.vehicleType)}
                      </span>
                      {sub && (
                        <span
                          className={
                            active ? 'text-brand-200/70' : 'text-white/40 group-hover:text-brand-300/90'
                          }
                        >
                          {' '}
                          · {sub}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="px-4 py-3 border-t border-slateCustom-700/50">
          <button
            type="button"
            disabled={!selected || saving || loading}
            onClick={confirm}
            className="btn-primary w-full h-9 rounded-lg text-[13px] border-2 border-brand-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:border-slateCustom-600"
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}

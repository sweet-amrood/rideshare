import { MapPin, Bike, Car } from 'lucide-react';

const statusColors = {
  COMPLETED: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  CANCELLED: 'text-red-300 bg-red-950/40 border-red-500/30',
  default: 'text-white/70 bg-slateCustom-800 border-slateCustom-600'
};

export default function RideRequestHistoryCard({ ride }) {
  const st = ride.status || 'UNKNOWN';
  const badge = statusColors[st] || statusColors.default;
  const VehicleIcon = ride.vehicleType === 'CAR' ? Car : Bike;

  return (
    <article className="glass-panel p-5 rounded-2xl border-l-4 border-l-emerald-500 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badge}`}>
            On-demand · {st.replace('_', ' ')}
          </span>
          {ride.requestRef && (
            <p className="text-[10px] text-white/50 mt-1 font-mono">{ride.requestRef}</p>
          )}
        </div>
        <p className="text-lg font-bold text-brand-300">Rs. {ride.agreedFare ?? '—'}</p>
      </div>

      {ride.driver?.name && (
        <p className="text-sm text-white">
          Driver: <strong>{ride.driver.name}</strong>
        </p>
      )}

      <div className="text-xs text-white/75 space-y-1">
        <p className="flex gap-2">
          <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
          {ride.pickup?.address || 'Pickup'}
        </p>
        <p className="flex gap-2">
          <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
          {ride.dropoff?.address || 'Drop-off'}
        </p>
        <p className="flex gap-2 items-center">
          <VehicleIcon className="h-3.5 w-3.5 shrink-0" />
          {ride.vehicleType || 'Ride'} ·{' '}
          {new Date(ride.completedAt || ride.cancelledAt || ride.createdAt).toLocaleString()}
        </p>
      </div>
    </article>
  );
}

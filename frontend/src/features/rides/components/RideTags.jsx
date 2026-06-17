import { getVehicleTypeLabel } from '../constants/searchByVehicleType';

export default function RideTags({ ride, className = '' }) {
  const r = ride.restrictions || {};
  const a = ride.amenities || {};
  const vType = ride.vehicleId?.vehicleType;
  const tags = [];

  if (vType) {
    tags.push({ label: getVehicleTypeLabel(vType), tone: 'brand' });
  }
  if (r.womenOnly) tags.push({ label: 'Women only', tone: 'pink' });
  if (r.universityOnly) tags.push({ label: 'University', tone: 'blue' });
  if (r.officeOnly) tags.push({ label: 'Office', tone: 'slate' });
  if (vType === 'CAR') {
    if (a.hasAC) tags.push({ label: 'AC', tone: 'cyan' });
    else tags.push({ label: 'Non-AC', tone: 'amber' });
  }
  if (a.smoking && a.smoking !== 'NO') tags.push({ label: a.smoking.replace(/_/g, ' '), tone: 'orange' });
  if (a.luggageAllowed && a.luggageAllowed !== 'NONE') {
    tags.push({ label: `Luggage: ${a.luggageAllowed}`, tone: 'emerald' });
  }
  if (ride.isRecurring || ride.rideType === 'RECURRING') {
    tags.push({ label: 'Recurring', tone: 'violet' });
  }

  if (!tags.length) return null;

  const tones = {
    brand: 'bg-brand-500/15 text-brand-200 border-brand-500/30',
    pink: 'bg-pink-500/15 text-pink-200 border-pink-500/30',
    blue: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
    slate: 'bg-slate-500/15 text-slate-200 border-slate-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    orange: 'bg-orange-500/15 text-orange-200 border-orange-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
    violet: 'bg-violet-500/15 text-violet-200 border-violet-500/30'
  };

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {tags.map((t) => (
        <span
          key={t.label}
          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${tones[t.tone]}`}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}

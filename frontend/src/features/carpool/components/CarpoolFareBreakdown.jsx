import { MapPin, Users, TrendingDown } from 'lucide-react';

export default function CarpoolFareBreakdown({ quote, compact = false }) {
  if (!quote) return null;

  if (compact) {
    return (
      <p className="text-[11px] text-white/65 leading-snug">
        <span className="text-brand-300 font-semibold">Rs. {quote.costPerSeatNow}/seat</span> now
        {quote.costPerSeatIfFull != null && (
          <>
            {' '}
            ·{' '}
            <span className="text-emerald-300/90">
              ~Rs. {quote.costPerSeatIfFull}/seat if {quote.totalPassengerSeats} join
            </span>
          </>
        )}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-3 space-y-2 text-xs text-white/75">
      <p className="font-bold text-white text-sm flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-brand-400" />
        Distance-based fare split
      </p>
      <ul className="space-y-1">
        <li className="flex justify-between gap-2">
          <span>Main route</span>
          <span>{quote.mainDistanceKm} km</span>
        </li>
        {quote.detourDistanceKm > 0 && (
          <li className="flex justify-between gap-2">
            <span>Off-route (pickup/drop detours)</span>
            <span>+{quote.detourDistanceKm} km</span>
          </li>
        )}
        <li className="flex justify-between gap-2 font-medium text-white/90">
          <span>Total trip distance</span>
          <span>{quote.totalDistanceKm} km</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Estimated fuel cost</span>
          <span>Rs. {quote.totalFuelCost}</span>
        </li>
      </ul>
      <div className="pt-2 border-t border-white/10 space-y-1">
        <p className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-brand-400" />
          <strong className="text-brand-200">Rs. {quote.costPerSeatNow}/seat</strong>
          <span className="text-white/55">
            with {quote.seatsAfterJoin} passenger seat{quote.seatsAfterJoin !== 1 ? 's' : ''} on
            trip
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-emerald-200/90">
          <MapPin className="h-3.5 w-3.5" />
          If all <strong>{quote.totalPassengerSeats}</strong> seats fill (main route only):{' '}
          <strong>~Rs. {quote.costPerSeatIfFull}/seat</strong> average
        </p>
      </div>
    </div>
  );
}

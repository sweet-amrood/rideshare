import { MapPin, Users, TrendingDown } from 'lucide-react';

function resolvePassengerFare(quote) {
  if (!quote) return null;

  const ratePerKm = quote.ratePerKm ?? quote.costPerKm;
  const mainKm = Number(quote.mainDistanceKm ?? 0);
  const detourKm = Number(quote.detourDistanceKm ?? 0);
  const billableKm =
    Number(quote.totalDistanceKm ?? 0) > 0
      ? Number(quote.totalDistanceKm)
      : mainKm + detourKm;
  const seats = Math.max(1, Number(quote.seatsBooked) || 1);

  const tripFareRs =
    quote.tripFareRs ?? (ratePerKm != null ? Math.ceil(mainKm * ratePerKm) : null);
  const detourFareRs =
    quote.detourFareRs ?? (ratePerKm != null ? Math.ceil(detourKm * ratePerKm) : null);

  const perSeatFromParts =
    tripFareRs != null && detourFareRs != null
      ? Math.max(1, tripFareRs + detourFareRs)
      : ratePerKm != null && billableKm > 0
        ? Math.max(1, Math.ceil(billableKm * ratePerKm))
        : null;

  const perSeat = quote.farePerSeat ?? quote.costPerSeatNow ?? perSeatFromParts;
  const total =
    quote.yourTotal ??
    quote.totalFareCost ??
    quote.totalFuelCost ??
    (perSeat != null ? perSeat * seats : null);

  return {
    ratePerKm,
    mainKm,
    detourKm,
    billableKm,
    seats,
    tripFareRs,
    detourFareRs,
    perSeat,
    total
  };
}

export default function CarpoolFareBreakdown({ quote, compact = false }) {
  if (!quote) return null;

  if (quote.accepted === false) {
    const message =
      quote.rejectionReason || 'This ride cannot accommodate your route.';
    if (compact) {
      return <p className="text-[11px] text-amber-300/90 leading-snug">{message}</p>;
    }
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100/90">
        {message}
      </div>
    );
  }

  const fare = resolvePassengerFare(quote);
  if (!fare) return null;

  if (compact) {
    return (
      <p className="text-[11px] text-white/65 leading-snug">
        {fare.perSeat != null ? (
          <span className="text-brand-300 font-semibold">Rs. {fare.perSeat}/seat</span>
        ) : (
          <span className="text-white/50">Fare calculating…</span>
        )}
        {fare.ratePerKm != null && (
          <span className="text-white/45"> · {fare.ratePerKm} PKR/km</span>
        )}
        {fare.detourKm > 0 && (
          <span className="text-amber-300/85"> · +{fare.detourKm} km detour</span>
        )}
        {quote.hasAC && <span className="text-cyan-300/80"> · AC</span>}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-500/25 bg-brand-500/5 p-3 space-y-2 text-xs text-white/75">
      <p className="font-bold text-white text-sm flex items-center gap-2">
        <TrendingDown className="h-4 w-4 text-brand-400" />
        Distance-based fare split
        {quote.hasAC && (
          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
            AC rate
          </span>
        )}
      </p>
      <ul className="space-y-1">
        <li className="flex justify-between gap-2">
          <span>Your trip distance</span>
          <span>{fare.mainKm} km</span>
        </li>
        {fare.detourKm > 0 && (
          <li className="flex justify-between gap-2">
            <span>Your route detour</span>
            <span>+{fare.detourKm} km</span>
          </li>
        )}
        <li className="flex justify-between gap-2 font-medium text-white/90">
          <span>Billable distance</span>
          <span>{fare.billableKm} km</span>
        </li>
        {fare.ratePerKm != null && (
          <li className="flex justify-between gap-2">
            <span>Platform rate</span>
            <span>Rs. {fare.ratePerKm}/km</span>
          </li>
        )}
        {fare.tripFareRs != null && (
          <li className="flex justify-between gap-2">
            <span>Trip fare</span>
            <span>
              Rs. {fare.tripFareRs}
              {fare.ratePerKm != null && (
                <span className="text-white/45 text-[10px]">
                  {' '}
                  ({fare.mainKm} km × {fare.ratePerKm})
                </span>
              )}
            </span>
          </li>
        )}
        {fare.detourKm > 0 && fare.detourFareRs != null && (
          <li className="flex justify-between gap-2 text-amber-100/90">
            <span>Detour fare</span>
            <span>
              +Rs. {fare.detourFareRs}
              {fare.ratePerKm != null && (
                <span className="text-white/45 text-[10px]">
                  {' '}
                  ({fare.detourKm} km × {fare.ratePerKm})
                </span>
              )}
            </span>
          </li>
        )}
        <li className="flex justify-between gap-2 font-semibold text-white border-t border-white/10 pt-1.5 mt-1">
          <span>Your fare{fare.seats > 1 ? ` (${fare.seats} seats)` : ''}</span>
          <span className="text-brand-200">
            {fare.total != null ? `Rs. ${fare.total}` : '—'}
          </span>
        </li>
      </ul>
      <div className="pt-2 border-t border-white/10 space-y-1">
        {fare.perSeat != null && (
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-brand-400" />
            <strong className="text-brand-200">Rs. {fare.perSeat}/seat</strong>
            <span className="text-white/55">for this booking</span>
          </p>
        )}
        {quote.costPerSeatIfFull != null && (
          <p className="flex items-center gap-1.5 text-white/45 text-[10px]">
            <MapPin className="h-3 w-3" />
            Reference only — full car on driver route (~Rs. {quote.costPerSeatIfFull}/seat avg)
          </p>
        )}
      </div>
    </div>
  );
}

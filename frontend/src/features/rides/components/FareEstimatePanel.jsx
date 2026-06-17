import { useEffect, useState } from 'react';
import { Banknote } from 'lucide-react';
import { rideRequestService } from '@/api/services/rideRequest.service';

export default function FareEstimatePanel({
  pickup,
  destination,
  vehicleType,
  preferAC = false,
  offeredFare,
  onOfferedFareChange,
  onEstimateLoaded,
  role = 'passenger',
  /** modal: full pricing UI without formula breakdown blocks */
  variant = 'default'
}) {
  const compact = variant === 'modal' || variant === 'compact';
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState('');
  const isPassenger = role === 'passenger';

  useEffect(() => {
    if (offeredFare != null) setManual(String(offeredFare));
  }, [offeredFare]);

  useEffect(() => {
    if (!pickup?.lat || !destination?.lat || !vehicleType) return;

    let cancelled = false;
    setLoading(true);
    rideRequestService
      .estimateFare({
        originLng: pickup.lng,
        originLat: pickup.lat,
        destLng: destination.lng,
        destLat: destination.lat,
        vehicleType,
        hasAC: preferAC || undefined
      })
      .then((res) => {
        if (cancelled || !res.success) return;
        setEstimate(res.data);
        onEstimateLoaded?.(res.data);
        onOfferedFareChange?.(res.data.recommendedFare);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, destination?.lat, destination?.lng, vehicleType, preferAC]);

  if (!estimate && loading) {
    return <p className="text-sm text-white/60">Calculating total trip fare…</p>;
  }
  if (!estimate) return null;

  const min = isPassenger ? estimate.minFare : estimate.recommendedFare;
  const max = estimate.maxFare;
  const value = offeredFare ?? estimate.recommendedFare;

  const applyManual = () => {
    const n = parseInt(manual, 10);
    if (!n || n < min || n > max) return;
    onOfferedFareChange?.(n);
  };

  return (
    <div
      className={
        compact
          ? 'rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2.5'
          : 'rounded-xl border border-brand-500/25 bg-brand-500/5 p-4 space-y-4'
      }
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p
            className={
              compact
                ? 'text-[11px] text-white/40'
                : 'text-[10px] uppercase font-bold text-brand-400 tracking-wider flex items-center gap-1.5'
            }
          >
            {!compact && <Banknote className="h-3.5 w-3.5" />}
            {compact ? 'Estimated fare' : isPassenger ? 'Total fare for full ride' : 'Recommended total fare'}
          </p>
          <p
            className={
              compact
                ? 'text-xl font-semibold text-white mt-0.5 tabular-nums'
                : 'text-3xl font-extrabold text-white mt-1 tabular-nums'
            }
          >
            Rs. {estimate.recommendedFare}
          </p>
          <p className={`${compact ? 'text-[11px] text-white/40 mt-0.5' : 'text-xs text-emerald-200/70 mt-1'}`}>
            {compact
              ? `Rs. ${estimate.factors?.ratePerKm ?? estimate.factors?.perKmRate ?? '—'}/km × ${
                  estimate.distanceKm
                } km${
                  estimate.factors?.nightMultiplier > 1
                    ? ` · night ×${estimate.factors.nightMultiplier}`
                    : ''
                }${
                  estimate.factors?.peakMultiplier > 1
                    ? ` · peak ×${estimate.factors.peakMultiplier}`
                    : ''
                }${preferAC ? ' · AC +15%' : ''}`
              : isPassenger
                ? `Total trip price = rate per km × distance, then night / peak surcharges${
                    preferAC ? ' + 15% AC' : ''
                  }.`
                : 'Same platform formula for the full trip.'}
          </p>
          {!compact && estimate.formulaDisplay && (
            <p className="text-[10px] text-brand-300/80 mt-2 leading-relaxed font-mono">
              {estimate.formulaDisplay}
            </p>
          )}
          {!compact && (estimate.formulaSteps || estimate.factors) && (
            <p className="text-[10px] text-emerald-300/90 mt-1 tabular-nums font-mono">
              = {estimate.formulaSteps ||
                `${estimate.factors?.ratePerKm ?? estimate.factors?.perKmRate} × ${estimate.distanceKm}${
                  estimate.factors?.nightMultiplier > 1 ? ` × ${estimate.factors.nightMultiplier}` : ''
                }${estimate.factors?.peakMultiplier > 1 ? ` × ${estimate.factors.peakMultiplier}` : ''}`}{' '}
              → Rs. {estimate.recommendedFare} total
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-white/40">{estimate.distanceKm} km</p>
        </div>
      </div>

      <div
        className={
          compact
            ? 'pt-0.5'
            : 'rounded-lg bg-black/30 border border-brand-500/15 px-3 py-2.5'
        }
      >
        <p
          className={
            compact
              ? 'text-[11px] text-white/45 mb-1.5'
              : 'text-[10px] uppercase font-bold text-white/70 tracking-wider mb-2'
          }
        >
          {isPassenger
            ? `Choose your total offer (Rs. ${min} – ${max} for this ride)`
            : `Counter total fare (Rs. ${min} – ${max})`}
        </p>
        <input
          type="range"
          min={min}
          max={max}
          step={10}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onOfferedFareChange?.(Number(e.target.value))}
          className="w-full accent-brand-500"
          aria-label={isPassenger ? 'Total trip fare offer' : 'Counter total fare'}
        />
        <div className="flex justify-between text-xs mt-2">
          <span className="text-white/55">
            Min <span className="text-white/80 font-semibold">Rs. {min}</span>
          </span>
          <span className="font-extrabold text-brand-300 text-sm tabular-nums">
            Rs. {value}{' '}
            <span className="text-[10px] font-bold text-brand-400/80 uppercase">total</span>
          </span>
          <span className="text-white/55">
            Max <span className="text-white/80 font-semibold">Rs. {max}</span>
          </span>
        </div>
      </div>

      {!compact && (
        <div className="flex gap-2 items-end">
          <label className="flex-1 text-[10px] uppercase font-bold text-white/60">
            Or type total (Rs.)
            <input
              type="number"
              min={min}
              max={max}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder={`${min} – ${max} total`}
              className="mt-1 w-full bg-black/40 border border-emerald-500/25 rounded-lg px-3 py-2 text-white text-sm block normal-case font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>
          <button
            type="button"
            onClick={applyManual}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30 hover:bg-brand-500/30"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

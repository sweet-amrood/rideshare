import { useEffect, useState } from 'react';
import { DollarSign, Route, Sparkles } from 'lucide-react';
import { estimateRidePrice } from '../services/ride.service';
import { useRoadDistanceKm } from '@/hooks/useRoadDistanceKm';

export default function PricingCalculator({
  variant = 'driver',
  totalSeats,
  hasAC = true,
  onCostPerSeatChange,
  onDistanceKmChange,
  originCoords,
  destinationCoords
}) {
  const isDriver = variant === 'driver';
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const { distanceKm, loading: distanceLoading } = useRoadDistanceKm(originCoords, destinationCoords);

  useEffect(() => {
    if (distanceKm != null) onDistanceKmChange?.(distanceKm);
  }, [distanceKm, onDistanceKmChange]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!originCoords || !destinationCoords) {
        setPricing(null);
        return;
      }
      if (distanceLoading) return;

      setLoading(true);
      try {
        const server = await estimateRidePrice({
          totalSeats,
          originCoords,
          destinationCoords,
          distanceKm,
          hasAC
        });
        if (!cancelled) {
          setPricing(server);
          onCostPerSeatChange?.(server.costPerSeat);
        }
      } catch {
        if (!cancelled) setPricing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [totalSeats, hasAC, distanceKm, originCoords, destinationCoords, distanceLoading, onCostPerSeatChange]);

  const box = isDriver
    ? 'rounded-xl border border-emerald-500/25 bg-slateCustom-800/60 p-4 space-y-3'
    : 'rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3';
  const title = isDriver ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-slate-800';
  const muted = isDriver ? 'text-white/70' : 'text-slate-600';

  return (
    <div className={box}>
      <h3 className={`${title} flex items-center gap-2`}>
        <DollarSign className={`w-4 h-4 ${isDriver ? 'text-emerald-400' : 'text-brand-600'}`} />
        Fare cost split
      </h3>

      <p className={`text-[11px] ${muted}`}>
        Platform rate from admin settings{hasAC ? ' (AC premium applied)' : ' (non-AC)'}. No manual
        entry needed.
      </p>

      {originCoords?.length >= 2 && destinationCoords?.length >= 2 && (
        <p className={`text-xs ${muted} flex items-center gap-1 flex-wrap`}>
          <Route className="w-3.5 h-3.5" />
          Route distance:{' '}
          <strong className={isDriver ? 'text-white' : ''}>
            {distanceLoading ? 'Calculating…' : distanceKm != null ? `${distanceKm} km` : '—'}
          </strong>
        </p>
      )}

      {pricing && (
        <div className={`space-y-2 text-sm ${isDriver ? 'text-white/85' : 'text-slate-700'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={isDriver ? 'text-white/60' : 'text-slate-500'}>
              {pricing.ratePerKm ?? pricing.platformRatePerKm} PKR/km
            </span>
            {hasAC && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                <Sparkles className="h-3 w-3" />
                AC
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            <span>
              <strong className={isDriver ? 'text-emerald-300' : ''}>{pricing.costPerSeat} PKR</strong>{' '}
              / seat
            </span>
            <span className={isDriver ? 'text-white/50' : 'text-slate-500'}>
              {pricing.totalFareCost ?? pricing.totalFuelCost} PKR total ÷ {pricing.passengerSeats}{' '}
              seats
            </span>
            {loading && <span className="text-xs opacity-60">Updating…</span>}
          </div>
        </div>
      )}

      {!pricing && !distanceLoading && originCoords && destinationCoords && (
        <p className={`text-xs ${muted}`}>Set pickup and destination to preview fare split.</p>
      )}
    </div>
  );
}

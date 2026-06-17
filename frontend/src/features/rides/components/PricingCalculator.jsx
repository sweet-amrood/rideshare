import { useEffect, useState } from 'react';
import { DollarSign, Fuel, Route } from 'lucide-react';
import { calculateSeatPricing, estimateDistanceKm } from '../utils/pricing';
import { estimateRidePrice } from '../services/ride.service';

export default function PricingCalculator({
  variant = 'default',
  totalSeats,
  totalFuelCost,
  onFuelChange,
  onCostPerSeatChange,
  originCoords,
  destinationCoords,
  autoFuelFromDistance,
  onAutoFuelChange
}) {
  const isDriver = variant === 'driver';
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);

  const distanceKm = estimateDistanceKm(originCoords, destinationCoords);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const local = calculateSeatPricing({
        totalFuelCost,
        passengerSeats: totalSeats,
        distanceKm,
        autoFuelFromDistance
      });
      if (!cancelled) setPricing(local);

      if (!originCoords || !destinationCoords) return;
      setLoading(true);
      try {
        const server = await estimateRidePrice({
          totalSeats,
          totalFuelCost: totalFuelCost || undefined,
          originCoords,
          destinationCoords,
          distanceKm,
          autoFuelFromDistance
        });
        if (!cancelled) {
          setPricing(server);
          onCostPerSeatChange?.(server.costPerSeat);
        }
      } catch {
        if (!cancelled) onCostPerSeatChange?.(local.costPerSeat);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    totalSeats,
    totalFuelCost,
    distanceKm,
    autoFuelFromDistance,
    originCoords,
    destinationCoords,
    onCostPerSeatChange
  ]);

  useEffect(() => {
    if (pricing?.costPerSeat) onCostPerSeatChange?.(pricing.costPerSeat);
  }, [pricing?.costPerSeat, onCostPerSeatChange]);

  const box = isDriver
    ? 'rounded-xl border border-emerald-500/25 bg-slateCustom-800/60 p-4 space-y-4'
    : 'rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4';
  const title = isDriver ? 'text-sm font-bold text-white' : 'text-sm font-semibold text-slate-800';
  const muted = isDriver ? 'text-white/70' : 'text-slate-600';
  const input = isDriver
    ? 'mt-1 w-full rounded-lg border border-slateCustom-600 bg-slateCustom-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500/50'
    : 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className={box}>
      <h3 className={`${title} flex items-center gap-2`}>
        <Fuel className={`w-4 h-4 ${isDriver ? 'text-emerald-400' : 'text-brand-600'}`} />
        Fuel cost split
      </h3>

      {distanceKm != null && (
        <p className={`text-xs ${muted} flex items-center gap-1`}>
          <Route className="w-3.5 h-3.5" />
          Est. distance: <strong className={isDriver ? 'text-white' : ''}>{distanceKm} km</strong>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className={muted}>Total fuel cost (PKR)</span>
          <input
            type="number"
            min="0"
            value={totalFuelCost}
            onChange={(e) => onFuelChange(e.target.value)}
            placeholder="Auto from distance"
            className={input}
          />
        </label>
        <label className={`flex items-end gap-2 text-sm pb-2 ${muted}`}>
          <input
            type="checkbox"
            checked={autoFuelFromDistance}
            onChange={(e) => onAutoFuelChange?.(e.target.checked)}
            className={`rounded ${isDriver ? 'accent-emerald-500' : 'border-slate-300'}`}
          />
          <span>Estimate fuel from distance if empty</span>
        </label>
      </div>

      {pricing && (
        <div className={`flex flex-wrap gap-4 text-sm ${isDriver ? 'text-white/85' : 'text-slate-700'}`}>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>
              <strong className={isDriver ? 'text-emerald-300' : ''}>{pricing.costPerSeat} PKR</strong> / seat
            </span>
          </div>
          <span className={isDriver ? 'text-white/50' : 'text-slate-500'}>
            Split {pricing.totalFuelCost} PKR among {pricing.passengerSeats} seats
          </span>
          {loading && <span className="text-xs opacity-60">Syncing…</span>}
        </div>
      )}
    </div>
  );
}

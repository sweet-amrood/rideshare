import { useEffect, useState } from 'react';
import { Car, Bike, CircleDot, X, Wind, Luggage, Users, Shield } from 'lucide-react';
import FareEstimatePanel from './FareEstimatePanel';
import {
  RIDE_TYPE_OPTIONS,
  SEARCH_PREFS_BY_TYPE
} from '../constants/searchByVehicleType';

const TYPE_ICONS = {
  CAR: Car,
  BIKE: Bike,
  RICKSHAW: CircleDot
};

export default function RideTypeSearchModal({
  open,
  onClose,
  onSearch,
  loading = false,
  departureDate,
  pickup,
  destination
}) {
  const [vehicleType, setVehicleType] = useState('CAR');
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [preferAC, setPreferAC] = useState(false);
  const [luggage, setLuggage] = useState('');
  const [womenOnly, setWomenOnly] = useState(false);
  const [offeredFare, setOfferedFare] = useState(null);
  const canEstimate = pickup?.lat && destination?.lat;

  const prefs = SEARCH_PREFS_BY_TYPE[vehicleType] || SEARCH_PREFS_BY_TYPE.CAR;

  useEffect(() => {
    if (!open) return;
    const p = SEARCH_PREFS_BY_TYPE[vehicleType];
    setSeatsNeeded(p.defaultSeats);
    setPreferAC(false);
    setLuggage('');
    setOfferedFare(null);
  }, [vehicleType, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({
      vehicleType,
      seatsNeeded: Math.min(prefs.maxSeats, Math.max(1, seatsNeeded)),
      hasAC: prefs.showAC && preferAC ? true : undefined,
      luggageAllowed: luggage || undefined,
      womenOnly: womenOnly || undefined,
      departureDate: departureDate || undefined,
      passengerOfferedFare: offeredFare
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slateCustom-900/90 backdrop-blur-sm">
      <div
        className="glass-panel w-full max-w-[340px] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="ride-type-title"
      >
        <div className="flex justify-between items-center px-4 pt-4 pb-2 border-b border-slateCustom-700/50">
          <h2 id="ride-type-title" className="text-[15px] font-semibold text-white">
            Find a ride
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="modal-option-btn p-1.5 rounded-md border-2 border-slateCustom-600 text-white/40 hover:text-white hover:border-brand-500 -mr-1 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] text-white/40 mb-1.5">Vehicle</p>
            <div className="flex rounded-lg border border-slateCustom-600/80 bg-slateCustom-900/50 p-0.5">
              {RIDE_TYPE_OPTIONS.map(({ id, label }) => {
                const Icon = TYPE_ICONS[id] || Car;
                const active = vehicleType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVehicleType(id)}
                    className={`choice-btn flex-1 flex items-center justify-center gap-1 min-h-[32px] rounded-md border-2 text-[11px] font-medium transition-all cursor-pointer ${
                      active
                        ? 'border-brand-500 bg-brand-500 text-white shadow-sm ring-1 ring-brand-400/40'
                        : 'border-slateCustom-500 bg-transparent text-white/45 hover:border-brand-500 hover:text-brand-100 hover:bg-brand-500/10'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                    {label.split(' / ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5 rounded-lg border border-slateCustom-700/50 bg-slateCustom-800/30 px-3 py-2.5">
            <label className="flex items-center justify-between gap-2 text-[13px]">
              <span className="text-white/60 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-white/40" />
                Seats
              </span>
              <input
                type="number"
                min={1}
                max={prefs.maxSeats}
                value={seatsNeeded}
                onChange={(e) =>
                  setSeatsNeeded(
                    Math.min(prefs.maxSeats, Math.max(1, parseInt(e.target.value, 10) || 1))
                  )
                }
                className="w-14 h-8 text-center rounded-md border border-white/10 bg-white/[0.04] text-[13px] text-white"
                disabled={vehicleType === 'BIKE'}
              />
            </label>

            {prefs.showAC && (
              <label className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
                <input
                  type="checkbox"
                  checked={preferAC}
                  onChange={(e) => setPreferAC(e.target.checked)}
                  className="rounded border-white/20 accent-[#5b4ef5] h-3.5 w-3.5"
                />
                <Wind className="h-3.5 w-3.5 text-cyan-400/80 shrink-0" />
                <span className="text-white/75">AC (+15%)</span>
              </label>
            )}

            {prefs.showLuggage && (
              <label className="flex items-center justify-between gap-2 text-[13px]">
                <span className="text-white/60 flex items-center gap-1.5">
                  <Luggage className="h-3.5 w-3.5 text-white/40" />
                  Luggage
                </span>
                <select
                  value={luggage}
                  onChange={(e) => setLuggage(e.target.value)}
                  className="max-w-[8.5rem] h-8 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[12px] text-white"
                >
                  <option value="">Any</option>
                  {prefs.luggageOptions.map((v) => (
                    <option key={v} value={v}>
                      {v === 'NONE' ? 'None' : v.charAt(0) + v.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="flex items-center gap-2 text-[13px] cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={womenOnly}
                onChange={(e) => setWomenOnly(e.target.checked)}
                className="rounded border-white/20 accent-[#5b4ef5] h-3.5 w-3.5"
              />
              <Shield className="h-3.5 w-3.5 text-pink-400/80 shrink-0" />
              <span className="text-white/75">Women only</span>
            </label>
          </div>

          {canEstimate && (
            <FareEstimatePanel
              variant="modal"
              pickup={pickup}
              destination={destination}
              vehicleType={vehicleType}
              preferAC={prefs.showAC && preferAC}
              offeredFare={offeredFare}
              onOfferedFareChange={setOfferedFare}
              role="passenger"
            />
          )}

          <div className="flex gap-2 pt-1 border-t border-slateCustom-700/50 -mx-4 px-4 pb-4 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline modal-option-btn flex-1 h-9 rounded-lg text-[13px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (canEstimate && offeredFare == null)}
              className="btn-primary flex-1 h-9 rounded-lg text-[13px] border-2 border-brand-400 disabled:opacity-40 disabled:border-slateCustom-600"
            >
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

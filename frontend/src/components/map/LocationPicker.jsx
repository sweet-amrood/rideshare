import { MapPin, Flag } from 'lucide-react';
import { MOCK_LOCATIONS } from './constants';

const selectClass =
  'w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50';

/**
 * Pickup / destination selects backed by preset coordinates (no Google API).
 */
export default function LocationPicker({
  pickupIndex,
  destinationIndex,
  onPickupChange,
  onDestinationChange
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1">
          Pickup
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-brand-400 pointer-events-none" />
          <select
            className={selectClass}
            value={pickupIndex}
            onChange={(e) => onPickupChange(e.target.value)}
          >
            <option value="">Choose pickup...</option>
            {MOCK_LOCATIONS.map((loc, i) => (
              <option key={loc.name} value={i}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1">
          Destination
        </label>
        <div className="relative">
          <Flag className="absolute left-3 top-3 h-4 w-4 text-red-400 pointer-events-none" />
          <select
            className={selectClass}
            value={destinationIndex}
            onChange={(e) => onDestinationChange(e.target.value)}
          >
            <option value="">Choose destination...</option>
            {MOCK_LOCATIONS.map((loc, i) => (
              <option key={loc.name} value={i}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function getLocationByIndex(index) {
  if (index === '' || index == null) return null;
  const loc = MOCK_LOCATIONS[Number(index)];
  if (!loc) return null;
  return { ...loc, address: loc.name };
}

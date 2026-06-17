import { MapPin, Crosshair, MousePointer2, X } from 'lucide-react';

/**
 * Clickable pickup/destination field — activates map picking; pickup supports GPS auto.
 */
export default function LocationAddressButton({
  type = 'pickup',
  point,
  active = false,
  locating = false,
  onSelect,
  onAuto,
  onClear
}) {
  const isPickup = type === 'pickup';
  const hasPoint = Boolean(point?.lat);

  return (
    <div
      className={`rounded-xl border transition-all ${
        active
          ? isPickup
            ? 'border-green-500 ring-2 ring-green-500/40 bg-green-500/10'
            : 'border-red-500 ring-2 ring-red-500/40 bg-red-500/10'
          : hasPoint
            ? isPickup
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
            : 'border-slateCustom-700 bg-slateCustom-800/40'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-start gap-2.5 p-3 text-left border-0 bg-transparent cursor-pointer outline-none rounded-xl"
      >
        <MapPin
          className={`h-4 w-4 shrink-0 mt-0.5 ${isPickup ? 'text-green-400' : 'text-red-400'}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
            {isPickup ? 'Pickup' : 'Destination'}
          </p>
          <p className={`text-sm truncate ${hasPoint ? 'text-white' : 'text-white/45'}`}>
            {hasPoint
              ? point.address || point.name
              : isPickup
                ? 'Choose pickup'
                : 'Choose destination'}
          </p>
          {active && (
            <p
              className={`text-[10px] mt-1 font-semibold ${
                isPickup ? 'text-green-400' : 'text-red-400'
              }`}
            >
              Selected — pick on map{isPickup ? ' or use my location' : ''}
            </p>
          )}
        </div>
        {hasPoint && onClear && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.stopPropagation();
                onClear();
              }
            }}
            className="p-1 rounded-md text-white/50 hover:text-white hover:bg-white/10 shrink-0"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {active && (
        <div className="px-3 pb-3 flex flex-col sm:flex-row gap-2 border-t border-white/10 pt-2">
          <button
            type="button"
            onClick={onSelect}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border ${
              isPickup
                ? 'border-green-500/50 bg-green-500/15 text-green-200'
                : 'border-red-500/50 bg-red-500/15 text-red-200'
            }`}
          >
            <MousePointer2 className="h-3.5 w-3.5" />
            Pick on map
          </button>
          {isPickup && onAuto && (
            <button
              type="button"
              disabled={locating}
              onClick={(e) => {
                e.stopPropagation();
                onAuto();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border border-brand-500/50 bg-brand-500/15 text-brand-200 disabled:opacity-60"
            >
              <Crosshair className={`h-3.5 w-3.5 ${locating ? 'animate-pulse' : ''}`} />
              {locating ? 'Locating…' : 'My location'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

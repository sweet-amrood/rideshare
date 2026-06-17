import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { mapsService } from '@/api/services/maps.service';

const inputClass =
  'w-full bg-slateCustom-800/95 border border-slateCustom-600 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-500/50';

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Server-proxied Places autocomplete (API key stays on backend).
 */
export default function PlaceAutocomplete({
  label,
  placeholder = 'Search location...',
  value,
  onChange,
  bias,
  icon: Icon = MapPin,
  disabled = false
}) {
  const listId = useId();
  const wrapperRef = useRef(null);
  const sessionRef = useRef(`sess_${Math.random().toString(36).slice(2)}`);

  const [query, setQuery] = useState(value?.address || '');
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 280);

  useEffect(() => {
    setQuery(value?.address || '');
  }, [value?.address]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchPredictions = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await mapsService.autocomplete({
        input: debouncedQuery,
        sessionToken: sessionRef.current,
        lat: bias?.lat,
        lng: bias?.lng
      });
      setPredictions(res.data?.predictions || []);
      setOpen(true);
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, bias?.lat, bias?.lng]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const selectPlace = async (prediction) => {
    setQuery(prediction.description);
    setOpen(false);
    setLoading(true);
    try {
      const res = await mapsService.placeDetails({
        placeId: prediction.placeId,
        sessionToken: sessionRef.current
      });
      sessionRef.current = `sess_${Math.random().toString(36).slice(2)}`;
      if (res.data?.place) {
        onChange?.({
          placeId: res.data.place.placeId,
          address: res.data.place.address,
          name: res.data.place.name,
          lat: res.data.place.lat,
          lng: res.data.place.lng
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const res = await mapsService.reverseGeocode({ lat, lng });
        const address = res.data?.address || 'Current location';
        setQuery(address);
        onChange?.({ lat, lng, address, name: 'Current location' });
      } catch {
        onChange?.({ lat, lng, address: 'Current location', name: 'Current location' });
      }
    });
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-400 pointer-events-none" />
        <input
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => predictions.length && setOpen(true)}
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 animate-spin" />
        )}
      </div>

      {open && predictions.length > 0 && (
        <ul
          id={listId}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-slateCustom-600 bg-slateCustom-900 shadow-xl"
        >
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-brand-500/20 border-0 bg-transparent"
                onClick={() => selectPlace(p)}
              >
                <span className="font-semibold block">{p.mainText}</span>
                {p.secondaryText && <span className="text-[11px] text-white/60">{p.secondaryText}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {label?.toLowerCase().includes('pickup') && (
        <button
          type="button"
          onClick={useMyLocation}
          className="mt-1.5 text-[11px] font-semibold text-brand-400 border-0 bg-transparent p-0 outline-none hover:text-brand-300"
        >
          Use my location
        </button>
      )}
    </div>
  );
}

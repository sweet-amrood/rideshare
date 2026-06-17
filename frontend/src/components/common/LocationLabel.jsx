import { useEffect, useState } from 'react';
import { reverseGeocode } from '@/components/map/geocode';
import { looksLikeCoordinates, formatLocationLabel } from '@/utils/locationDisplay';

/**
 * Shows a human place name; reverse-geocodes when only coordinates are stored.
 */
export default function LocationLabel({
  address,
  coordinates,
  fallback = 'Location',
  className = ''
}) {
  const [label, setLabel] = useState(() => formatLocationLabel(address, fallback));

  useEffect(() => {
    const initial = formatLocationLabel(address, fallback);
    if (!looksLikeCoordinates(address) && address?.trim()) {
      setLabel(initial);
      return;
    }
    const [lng, lat] = coordinates || [];
    if (lat == null || lng == null) {
      setLabel(fallback);
      return;
    }
    let cancelled = false;
    reverseGeocode(lat, lng)
      .then((name) => {
        if (!cancelled) setLabel(name || fallback);
      })
      .catch(() => {
        if (!cancelled) setLabel(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [address, coordinates, fallback]);

  return <span className={className}>{label}</span>;
}

import { useEffect, useState } from 'react';
import { fetchShortestRoute } from '@/utils/osrmShortestRoute';
import { estimateDistanceKm } from '@/features/rides/utils/pricing';

/** Road-network distance (OSRM) with haversine fallback — matches TripMapView route stats. */
export function useRoadDistanceKm(originCoords, destCoords) {
  const [distanceKm, setDistanceKm] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!originCoords?.length || !destCoords?.length) {
      setDistanceKm(null);
      return undefined;
    }

    const origin = { lat: originCoords[1], lng: originCoords[0] };
    const destination = { lat: destCoords[1], lng: destCoords[0] };
    let cancelled = false;

    setLoading(true);
    fetchShortestRoute(origin, destination)
      .then((route) => {
        if (cancelled) return;
        setDistanceKm(route?.distanceKm ?? estimateDistanceKm(originCoords, destCoords));
      })
      .catch(() => {
        if (!cancelled) setDistanceKm(estimateDistanceKm(originCoords, destCoords));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [originCoords?.[0], originCoords?.[1], destCoords?.[0], destCoords?.[1]]);

  return { distanceKm, loading };
}

export default useRoadDistanceKm;

import { useState, useCallback } from 'react';
import { mapsService } from '@/api/services/maps.service';

/**
 * Fetches directions, distance, ETA for pickup → destination.
 */
export function useTripRoute() {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRoute = useCallback(async (pickup, destination) => {
    if (!pickup?.lat || !destination?.lat) {
      setRoute(null);
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const res = await mapsService.directions({
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: destination.lat, lng: destination.lng }
      });
      if (res.success && res.data.route) {
        setRoute(res.data.route);
        return res.data.route;
      }
      setRoute(null);
      return null;
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load route');
      setRoute(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError('');
  }, []);

  return { route, loading, error, loadRoute, clearRoute };
}

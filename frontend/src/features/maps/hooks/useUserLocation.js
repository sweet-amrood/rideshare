import { useEffect, useState, useCallback } from 'react';

/**
 * Watches browser geolocation for live user position on the map.
 */
export function useUserLocation(enabled = true) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(() => {
    if (!enabled || !navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
        setLoading(false);
      },
      () => {
        setError('Location permission denied');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setLoading(false);
      return undefined;
    }

    const onSuccess = (pos) => {
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setError(null);
      setLoading(false);
    };

    const onError = () => {
      setError('Location unavailable');
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000
    });

    const watchId = navigator.geolocation.watchPosition(onSuccess, undefined, {
      enableHighAccuracy: true,
      maximumAge: 20000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return { position, error, loading, refresh };
}

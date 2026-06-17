import { useEffect, useState } from 'react';
import { mapsService } from '@/api/services/maps.service';
import { env } from '@/config/env';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MAP_LIBRARIES } from '../constants';

/**
 * Loads Google Maps JS API key securely:
 * 1. Authenticated bootstrap from backend (preferred)
 * 2. Fallback to VITE_GOOGLE_MAPS_API_KEY for local dev
 */
export function useMapsBootstrap() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await mapsService.bootstrap();
        if (!cancelled && res.success) {
          setConfig(res.data);
          setError('');
          return;
        }
      } catch {
        /* try env fallback */
      }

      const fallbackKey = env.googleMapsApiKey;
      if (!cancelled) {
        if (fallbackKey) {
          setConfig({
            googleMapsApiKey: fallbackKey,
            libraries: MAP_LIBRARIES,
            defaultCenter: DEFAULT_CENTER,
            defaultZoom: DEFAULT_ZOOM
          });
          setError('');
        } else {
          setError(
            'Google Maps is not configured. Add GOOGLE_MAPS_BROWSER_KEY on the server or VITE_GOOGLE_MAPS_API_KEY for dev.'
          );
        }
      }
    };

    load().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading, error, isReady: !!config?.googleMapsApiKey };
}

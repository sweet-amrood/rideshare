import { useMemo } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MAP_LIBRARIES } from '../constants';

/**
 * Loads Google Maps JS once; children render when ready.
 */
export default function GoogleMapProvider({ apiKey, children, loadingFallback = null }) {
  const libraries = useMemo(() => MAP_LIBRARIES, []);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'ride-share-google-maps',
    googleMapsApiKey: apiKey,
    libraries
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-sm text-red-400">
        Failed to load Google Maps: {loadError.message}
      </div>
    );
  }

  if (!isLoaded) {
    return loadingFallback || (
      <div className="flex items-center justify-center h-full text-white/80 text-sm">Loading map...</div>
    );
  }

  return children;
}

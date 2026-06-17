import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { LAHORE_CENTER, DEFAULT_ZOOM, USER_LOCATION_ZOOM } from './constants';

fixLeafletDefaultIcons();

const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="h-4 w-4 rounded-full bg-brand-500 border-2 border-white shadow-lg"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 0.8 });
    }
  }, [map, center, zoom]);

  return null;
}

/**
 * Reusable OpenStreetMap view (Leaflet + react-leaflet).
 *
 * @param {string} className - Tailwind size classes (default: full screen height)
 * @param {boolean} showUserLocation - Request geolocation and show user marker
 * @param {{ lat: number, lng: number }} center - Optional override for map center
 * @param {number} zoom - Initial zoom level
 */
export default function MapView({
  className = 'h-screen w-full',
  showUserLocation = true,
  center: centerProp,
  zoom = DEFAULT_ZOOM
}) {
  const defaultCenter = useMemo(
    () => [LAHORE_CENTER.lat, LAHORE_CENTER.lng],
    []
  );

  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    if (!showUserLocation || !navigator.geolocation) return;

    const onSuccess = (pos) => {
      setUserPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
      setGeoError(null);
    };

    const onError = () => {
      setGeoError('Location permission denied or unavailable.');
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });

    const watchId = navigator.geolocation.watchPosition(onSuccess, undefined, {
      enableHighAccuracy: true,
      maximumAge: 30000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation]);

  const flyTarget = userPosition
    ? [userPosition.lat, userPosition.lng]
    : centerProp
      ? [centerProp.lat, centerProp.lng]
      : null;

  const flyZoom = userPosition ? USER_LOCATION_ZOOM : zoom;

  return (
    <div className={`relative ${className}`}>
      {geoError && (
        <div className="absolute top-3 left-1/2 z-[1000] -translate-x-1/2 rounded-lg bg-slateCustom-800/95 border border-slateCustom-600 px-4 py-2 text-xs text-white/90 shadow-lg pointer-events-none">
          {geoError} Showing Lahore.
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full rounded-none z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={defaultCenter}>
          <Popup>
            <strong>Lahore, Pakistan</strong>
            <br />
            Default Ride Share hub
          </Popup>
        </Marker>

        {userPosition && (
          <>
            <Marker position={[userPosition.lat, userPosition.lng]} icon={userLocationIcon}>
              <Popup>
                <strong>Your location</strong>
              </Popup>
            </Marker>
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={120}
              pathOptions={{ color: '#4f5ef4', fillColor: '#4f5ef4', fillOpacity: 0.15 }}
            />
          </>
        )}

        {flyTarget && <MapController center={flyTarget} zoom={flyZoom} />}
      </MapContainer>
    </div>
  );
}

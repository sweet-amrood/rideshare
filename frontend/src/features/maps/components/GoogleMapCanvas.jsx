import { useMemo, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, Circle, useGoogleMap } from '@react-google-maps/api';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';

const mapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] }
];

const containerStyle = { width: '100%', height: '100%' };

/**
 * Core map: pickup/destination markers, route polyline, live user, nearby ride markers.
 */
export default function GoogleMapCanvas({
  center,
  zoom = DEFAULT_ZOOM,
  pickup,
  destination,
  routePath = [],
  userPosition,
  nearbyMarkers = [],
  onMapLoad,
  fitBoundsTrigger
}) {
  const mapCenter = useMemo(() => {
    if (center) return center;
    if (userPosition) return userPosition;
    return DEFAULT_CENTER;
  }, [center, userPosition]);

  const boundsPoints = useMemo(() => {
    const pts = [];
    if (pickup?.lat) pts.push(pickup);
    if (destination?.lat) pts.push(destination);
    if (userPosition?.lat) pts.push(userPosition);
    routePath.forEach((p) => pts.push(p));
    nearbyMarkers.forEach((m) => m.position && pts.push(m.position));
    return pts;
  }, [pickup, destination, userPosition, routePath, nearbyMarkers]);

  function FitBounds() {
    const map = useGoogleMap();
    useEffect(() => {
      if (!map || boundsPoints.length < 2 || !window.google?.maps) return;
      const bounds = new window.google.maps.LatLngBounds();
      boundsPoints.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      map.fitBounds(bounds, { top: 80, right: 40, bottom: 40, left: 340 });
    }, [map, fitBoundsTrigger, boundsPoints]);
    return null;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={zoom}
      options={{
        styles: mapStyles,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      }}
      onLoad={onMapLoad}
    >
      <FitBounds />

      {userPosition && (
        <>
          <Marker position={userPosition} title="You" />
          <Circle
            center={userPosition}
            radius={80}
            options={{
              fillColor: '#4f5ef4',
              fillOpacity: 0.12,
              strokeColor: '#4f5ef4',
              strokeOpacity: 0.4,
              strokeWeight: 1
            }}
          />
        </>
      )}

      {pickup?.lat && (
        <Marker
          position={{ lat: pickup.lat, lng: pickup.lng }}
          label={{ text: 'A', color: '#fff', fontWeight: 'bold' }}
          title={pickup.address}
        />
      )}

      {destination?.lat && (
        <Marker
          position={{ lat: destination.lat, lng: destination.lng }}
          label={{ text: 'B', color: '#fff', fontWeight: 'bold' }}
          title={destination.address}
        />
      )}

      {routePath.length > 1 && (
        <Polyline
          path={routePath}
          options={{
            strokeColor: '#4f5ef4',
            strokeOpacity: 0.9,
            strokeWeight: 5,
            geodesic: true
          }}
        />
      )}

      {nearbyMarkers.map((m) => (
        <Marker key={m.id} position={m.position} title={m.title} onClick={m.onClick} />
      ))}
    </GoogleMap>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { fetchShortestRoute } from '@/utils/osrmShortestRoute';

fixLeafletDefaultIcons();

function pointFromGeo(loc) {
  const c = loc?.location?.coordinates || loc?.coordinates;
  if (!c || c.length < 2) return null;
  return { lat: c[1], lng: c[0] };
}

function FitAll({ points }) {
  const map = useMap();
  const key = points.map((p) => `${p?.lat},${p?.lng}`).join('|');
  useEffect(() => {
    const valid = points.filter((p) => p?.lat != null);
    if (valid.length < 2) return;
    map.fitBounds(
      L.latLngBounds(valid.map((p) => [p.lat, p.lng])),
      { padding: [40, 40], maxZoom: 14, animate: true }
    );
  }, [map, key, points]);
  return null;
}

const originIcon = L.divIcon({
  className: '',
  html: '<div class="h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const destIcon = L.divIcon({
  className: '',
  html: '<div class="h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

/** Preview a published carpool corridor (no auth). */
export default function CarpoolRideRoutePreview({ ride, className = 'h-32' }) {
  const origin = useMemo(() => pointFromGeo(ride?.origin), [ride]);
  const destination = useMemo(() => pointFromGeo(ride?.destination), [ride]);
  const [path, setPath] = useState([]);
  const [km, setKm] = useState('');

  useEffect(() => {
    if (!origin?.lat || !destination?.lat) {
      setPath([]);
      return;
    }
    let cancelled = false;
    fetchShortestRoute(origin, destination).then((r) => {
      if (cancelled) return;
      setPath(r?.path?.length > 1 ? r.path : [origin, destination]);
      setKm(r?.distance || '');
    });
    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  if (!origin?.lat) return null;

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-brand-500/25 ${className}`}
    >
      {km && (
        <span className="absolute top-2 right-2 z-[1000] text-[9px] font-bold bg-brand-500/90 text-white px-2 py-0.5 rounded pointer-events-none">
          {km}
        </span>
      )}
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={12}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
        {destination?.lat && <Marker position={[destination.lat, destination.lng]} icon={destIcon} />}
        {path.length > 1 && (
          <Polyline
            positions={path.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#4f5ef4', weight: 4, opacity: 0.85 }}
          />
        )}
        <FitAll points={[origin, destination].filter(Boolean)} />
      </MapContainer>
    </div>
  );
}

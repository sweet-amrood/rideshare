import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { fetchShortestRoute } from '@/utils/osrmShortestRoute';

fixLeafletDefaultIcons();

const driverIcon = L.divIcon({
  className: '',
  html: '<div class="h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const pickupIcon = L.divIcon({
  className: '',
  html: '<div class="h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-white shadow"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const dropIcon = L.divIcon({
  className: '',
  html: '<div class="h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white shadow"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function pointFromGeo(loc) {
  const c = loc?.coordinates;
  if (!c || c.length < 2) return null;
  return { lat: c[1], lng: c[0] };
}

function FitAll({ points }) {
  const map = useMap();
  const key = points.map((p) => `${p?.lat},${p?.lng}`).join('|');
  useEffect(() => {
    const valid = points.filter((p) => p?.lat != null && p?.lng != null);
    if (valid.length < 2) return;
    map.fitBounds(
      L.latLngBounds(valid.map((p) => [p.lat, p.lng])),
      { padding: [28, 28], maxZoom: 15, animate: false }
    );
  }, [map, key, points]);
  return null;
}

/**
 * Compact preview: green = driver → pickup, brand blue = pickup → dropoff.
 */
export default function DriverRequestRouteMap({ driverPoint, pickup, dropoff, className = 'h-36' }) {
  const pickupPt = useMemo(() => pointFromGeo(pickup?.location), [pickup]);
  const dropPt = useMemo(() => pointFromGeo(dropoff?.location), [dropoff]);
  const [toPickupPath, setToPickupPath] = useState([]);
  const [tripPath, setTripPath] = useState([]);
  const [toPickupKm, setToPickupKm] = useState('');
  const [tripKm, setTripKm] = useState('');

  useEffect(() => {
    if (!driverPoint?.lat || !pickupPt) {
      setToPickupPath([]);
      setToPickupKm('');
      return;
    }
    let cancelled = false;
    fetchShortestRoute(driverPoint, pickupPt).then((r) => {
      if (cancelled) return;
      if (r?.path?.length) {
        setToPickupPath(r.path);
        setToPickupKm(r.distance || '');
      } else {
        setToPickupPath([driverPoint, pickupPt]);
        setToPickupKm('');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [driverPoint?.lat, driverPoint?.lng, pickupPt?.lat, pickupPt?.lng]);

  useEffect(() => {
    if (!pickupPt?.lat || !dropPt?.lat) {
      setTripPath([]);
      setTripKm('');
      return;
    }
    let cancelled = false;
    fetchShortestRoute(pickupPt, dropPt).then((r) => {
      if (cancelled) return;
      if (r?.path?.length) {
        setTripPath(r.path);
        setTripKm(r.distance || '');
      } else {
        setTripPath([pickupPt, dropPt]);
        setTripKm('');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pickupPt?.lat, pickupPt?.lng, dropPt?.lat, dropPt?.lng]);

  if (!pickupPt) return null;

  const center = [pickupPt.lat, pickupPt.lng];
  const boundsPts = [driverPoint, pickupPt, dropPt].filter((p) => p?.lat != null);

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-brand-500/30 bg-slateCustom-900/80 ${className}`}
    >
      <div className="absolute bottom-1.5 left-1.5 right-1.5 z-[1000] flex flex-wrap gap-1.5 pointer-events-none">
        {driverPoint?.lat && (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-600/95 text-white border border-emerald-400/50">
            You → pickup {toPickupKm || '—'}
          </span>
        )}
        {dropPt && (
          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-brand-500/95 text-white border border-brand-400/50">
            Pickup → drop {tripKm || '—'}
          </span>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {driverPoint?.lat && (
          <Marker position={[driverPoint.lat, driverPoint.lng]} icon={driverIcon} />
        )}
        <Marker position={[pickupPt.lat, pickupPt.lng]} icon={pickupIcon} />
        {dropPt && <Marker position={[dropPt.lat, dropPt.lng]} icon={dropIcon} />}

        {toPickupPath.length > 1 && (
          <Polyline
            positions={toPickupPath.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.9 }}
          />
        )}
        {tripPath.length > 1 && (
          <Polyline
            positions={tripPath.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#4f5ef4', weight: 4, opacity: 0.9 }}
          />
        )}

        {boundsPts.length >= 2 && <FitAll points={boundsPts} />}
      </MapContainer>
    </div>
  );
}

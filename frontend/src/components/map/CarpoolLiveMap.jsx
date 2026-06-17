import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, RefreshCw } from 'lucide-react';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { fetchShortestRoute } from '@/utils/osrmShortestRoute';
import { bookingService } from '@/api/services/booking.service';
import { LAHORE_CENTER, DEFAULT_ZOOM } from './constants';

fixLeafletDefaultIcons();

const PASSENGER_COLORS = ['#f59e0b', '#06b6d4', '#a855f7', '#ec4899'];
const PASSENGER_ROUTE_COLORS = ['#fbbf24', '#22d3ee', '#c084fc', '#f472b6'];

function pointFromGeo(loc) {
  if (!loc?.lat) return null;
  return { lat: loc.lat, lng: loc.lng };
}

function FitAll({ points, fitKey }) {
  const map = useMap();
  useEffect(() => {
    const valid = (points || []).filter((p) => p?.lat != null && p?.lng != null);
    if (valid.length < 1) return;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 14, { animate: true });
      return;
    }
    map.fitBounds(
      L.latLngBounds(valid.map((p) => [p.lat, p.lng])),
      { padding: [48, 48], maxZoom: 15, animate: true }
    );
  }, [map, fitKey, points]);
  return null;
}

const driverIcon = L.divIcon({
  className: '',
  html: '<div class="h-4 w-4 rounded-full bg-emerald-400 border-2 border-white shadow-md ring-2 ring-emerald-500/50"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const originIcon = L.divIcon({
  className: '',
  html: '<div class="h-5 w-5 rounded-full bg-green-500 border-2 border-white shadow-md"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const destIcon = L.divIcon({
  className: '',
  html: '<div class="h-5 w-5 rounded-full bg-red-500 border-2 border-white shadow-md"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const passengerIcon = (n, color) =>
  L.divIcon({
    className: '',
    html: `<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md" style="background:${color}">${n}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

/**
 * Live carpool map: driver, ride corridor, each passenger pickup → destination routes.
 */
export default function CarpoolLiveMap({
  rideId,
  className = 'h-[min(20rem,50vh)] min-h-[260px]',
  pollMs = 12000,
  showLegend = true,
  interactive = true
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainPath, setMainPath] = useState([]);
  const [passengerPaths, setPassengerPaths] = useState([]);
  const [driverToOriginPath, setDriverToOriginPath] = useState([]);
  const [mainKm, setMainKm] = useState('');

  const load = useCallback(async () => {
    if (!rideId) return;
    try {
      const res = await bookingService.getLiveMap(rideId);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!pollMs) return undefined;
    const id = setInterval(load, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  const origin = useMemo(() => pointFromGeo(data?.origin), [data]);
  const destination = useMemo(() => pointFromGeo(data?.destination), [data]);
  const driver = useMemo(() => pointFromGeo(data?.driver?.location), [data]);
  const passengers = data?.passengers || [];

  useEffect(() => {
    if (!origin?.lat || !destination?.lat) {
      setMainPath([]);
      return;
    }
    let cancelled = false;
    fetchShortestRoute(origin, destination).then((r) => {
      if (cancelled) return;
      setMainPath(r?.path?.length > 1 ? r.path : [origin, destination]);
      setMainKm(r?.distance || '');
    });
    return () => {
      cancelled = true;
    };
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  useEffect(() => {
    if (!driver?.lat || !origin?.lat) {
      setDriverToOriginPath([]);
      return;
    }
    let cancelled = false;
    fetchShortestRoute(driver, origin).then((r) => {
      if (cancelled) return;
      setDriverToOriginPath(r?.path?.length > 1 ? r.path : [driver, origin]);
    });
    return () => {
      cancelled = true;
    };
  }, [driver?.lat, driver?.lng, origin?.lat, origin?.lng]);

  useEffect(() => {
    if (!destination?.lat || !passengers.length) {
      setPassengerPaths([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      passengers.map(async (p, i) => {
        const pickup = pointFromGeo(p.pickup);
        if (!pickup?.lat) return { index: i, path: [] };
        const r = await fetchShortestRoute(pickup, destination);
        return {
          index: i,
          path: r?.path?.length > 1 ? r.path : pickup?.lat ? [pickup, destination] : []
        };
      })
    ).then((paths) => {
      if (!cancelled) setPassengerPaths(paths);
    });
    return () => {
      cancelled = true;
    };
  }, [passengers, destination?.lat, destination?.lng]);

  const boundsPoints = useMemo(() => {
    const pts = [];
    if (origin) pts.push(origin);
    if (destination) pts.push(destination);
    if (driver) pts.push(driver);
    passengers.forEach((p) => {
      const pu = pointFromGeo(p.pickup);
      if (pu) pts.push(pu);
    });
    mainPath.forEach((p) => pts.push(p));
    return pts;
  }, [origin, destination, driver, passengers, mainPath]);

  const fitKey = `${boundsPoints.length}-${passengers.length}-${data?.lastSyncedAt}`;

  if (loading && !data) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-brand-500/25 bg-slateCustom-900/60 ${className}`}
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!data?.origin?.lat) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-brand-500/25 text-sm text-white/50 ${className}`}
      >
        Map unavailable
      </div>
    );
  }

  const center = origin || LAHORE_CENTER;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-brand-500/30 ${className}`}>
      <button
        type="button"
        onClick={load}
        className="absolute top-2 right-2 z-[1000] p-1.5 rounded-lg bg-slateCustom-900/90 border border-brand-500/40 text-white/80 hover:text-white"
        aria-label="Refresh map"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>

      {showLegend && (
        <div className="absolute bottom-2 left-2 right-2 z-[1000] flex flex-wrap gap-1 pointer-events-none">
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green-600/95 text-white">
            Start
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-600/95 text-white">
            Drop-off
          </span>
          {driver?.lat && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600/95 text-white">
              Driver
            </span>
          )}
          {passengers.map((p, i) => (
            <span
              key={p.bookingId}
              className="px-2 py-0.5 rounded text-[9px] font-bold text-white"
              style={{ background: PASSENGER_COLORS[i % PASSENGER_COLORS.length] }}
            >
              {p.name?.split(' ')[0] || `P${i + 1}`} → dest
            </span>
          ))}
          {mainKm && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-brand-500/95 text-white ml-auto">
              Main {mainKm}
            </span>
          )}
        </div>
      )}

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={interactive}
        dragging={interactive}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mainPath.length > 1 && (
          <Polyline
            positions={mainPath.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#4f5ef4', weight: 5, opacity: 0.45, dashArray: '8 6' }}
          />
        )}

        {driverToOriginPath.length > 1 && (
          <Polyline
            positions={driverToOriginPath.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.75 }}
          />
        )}

        {passengerPaths.map(
          ({ index, path }) =>
            path.length > 1 && (
              <Polyline
                key={`p-route-${index}`}
                positions={path.map((p) => [p.lat, p.lng])}
                pathOptions={{
                  color: PASSENGER_ROUTE_COLORS[index % PASSENGER_ROUTE_COLORS.length],
                  weight: 4,
                  opacity: passengers[index]?.confirmed === false ? 0.5 : 0.85,
                  dashArray: passengers[index]?.confirmed === false ? '6 8' : undefined
                }}
              />
            )
        )}

        {origin?.lat && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>Ride start · {data.origin?.address || 'Origin'}</Popup>
          </Marker>
        )}

        {destination?.lat && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>Destination · {data.destination?.address || 'Drop-off'}</Popup>
          </Marker>
        )}

        {driver?.lat && (
          <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
            <Popup>
              Driver: {data.driver?.name}
              {data.driver?.isOnline ? ' (online)' : ''}
            </Popup>
          </Marker>
        )}

        {passengers.map((p, i) => {
          const pu = pointFromGeo(p.pickup);
          if (!pu?.lat) return null;
          const color = PASSENGER_COLORS[i % PASSENGER_COLORS.length];
          return (
            <Marker
              key={p.bookingId}
              position={[pu.lat, pu.lng]}
              icon={passengerIcon(i + 1, color)}
            >
              <Popup>
                <strong>{p.name}</strong>
                <br />
                Pickup · {p.seats} seat{p.seats > 1 ? 's' : ''}
                <br />
                <span className="text-xs">{p.pickup?.address}</span>
              </Popup>
            </Marker>
          );
        })}

        <FitAll points={boundsPoints} fitKey={fitKey} />
      </MapContainer>
    </div>
  );
}

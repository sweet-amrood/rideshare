import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { LAHORE_CENTER, DEFAULT_ZOOM } from './constants';
import { reverseGeocodeLater, pointFromCoords, PENDING_ADDRESS_LABEL } from './geocode';
import { fetchShortestRoute } from '@/utils/osrmShortestRoute';

fixLeafletDefaultIcons();

const userIcon = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="h-4 w-4 rounded-full bg-brand-500 border-2 border-white shadow-lg"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const pickupIcon = L.divIcon({
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

const rideMarkerIcon = L.divIcon({
  className: '',
  html: '<div class="h-3 w-3 rounded-full bg-amber-400 border border-white shadow-sm"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const makeDivIcon = (html, size = [14, 14], anchor) =>
  L.divIcon({
    className: '',
    html,
    iconSize: size,
    iconAnchor: anchor || [size[0] / 2, size[1] / 2]
  });

function WaveCircles({ center, radiusMeters, animating }) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!animating) return undefined;
    const id = setInterval(() => setPulse((p) => (p + 1) % 100), 120);
    return () => clearInterval(id);
  }, [animating]);

  if (!center?.lat || !radiusMeters) return null;

  const scale = animating ? 1 + (pulse % 30) / 100 : 1;
  const rings = animating
    ? [
        radiusMeters * scale,
        radiusMeters * 0.75 * scale,
        radiusMeters * 0.5 * scale,
        radiusMeters * 0.28 * scale
      ]
    : [radiusMeters];

  return rings.map((r, i) => (
    <Circle
      key={`${r}-${i}-${pulse}`}
      center={[center.lat, center.lng]}
      radius={r}
      pathOptions={{
        color: '#34d399',
        fillColor: '#34d399',
        fillOpacity: 0.04 + i * 0.025,
        weight: i === 0 ? 3 : 2,
        opacity: 0.5 - i * 0.1
      }}
    />
  ));
}

function FitRouteBounds({ points, fitKey = '' }) {
  const map = useMap();
  useEffect(() => {
    const valid = (points || []).filter((p) => p?.lat != null && p?.lng != null);
    if (valid.length < 2) return;
    const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [56, 56], maxZoom: 16, animate: true });
  }, [map, fitKey, points]);
  return null;
}

function FlyToPoint({ point, zoom = 15 }) {
  const map = useMap();
  useEffect(() => {
    if (point?.lat == null || point?.lng == null) return;
    map.flyTo([point.lat, point.lng], zoom, { duration: 0.6 });
  }, [map, point?.lat, point?.lng, zoom]);
  return null;
}

function MapClickHandler({ enabled, activeStep, onStepClick, onResolving }) {
  useMapEvents({
    click: (e) => {
      if (!enabled || !onStepClick) return;
      const { lat, lng } = e.latlng;
      onResolving?.(true);
      onStepClick(activeStep, pointFromCoords(lat, lng, PENDING_ADDRESS_LABEL), {
        refineOnly: false
      });
      reverseGeocodeLater(lat, lng, (label) => {
        onStepClick(activeStep, pointFromCoords(lat, lng, label), { refineOnly: true });
        onResolving?.(false);
      });
    }
  });
  return null;
}

/**
 * Trip map: GPS, markers, OSRM route. Optional tap-to-set pickup/destination.
 */
export default function TripMapView({
  className = 'h-full w-full',
  pickup,
  destination,
  /** OSRM route start (e.g. driver live position). Defaults to pickup. */
  routeFrom = null,
  /** Show red destination pin (route still uses destination coords when false). */
  showDestinationMarker = true,
  showUserLocation = true,
  rideMarkers = [],
  waveCenter = null,
  waveRadiusMeters = 0,
  waveAnimating = false,
  interactive = false,
  onPickupChange,
  onDestinationChange,
  flyToPickup = false,
  activeStep: controlledStep,
  onActiveStepChange
}) {
  const [userPosition, setUserPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [tripInfo, setTripInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [internalStep, setInternalStep] = useState('pickup');
  const [resolvingClick, setResolvingClick] = useState(false);

  const activeStep = controlledStep ?? internalStep;

  useEffect(() => {
    if (controlledStep !== undefined) return;
    if (!pickup?.lat) setInternalStep('pickup');
    else if (!destination?.lat) setInternalStep('destination');
    else setInternalStep('pickup');
  }, [pickup?.lat, destination?.lat, controlledStep]);

  useEffect(() => {
    if (!showUserLocation || !navigator.geolocation) return;

    const onSuccess = (pos) => {
      setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoError(null);
    };
    const onError = () => setGeoError('Location unavailable');

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 60000
    });

    const watchId = navigator.geolocation.watchPosition(onSuccess, undefined, {
      enableHighAccuracy: false,
      maximumAge: 30000,
      timeout: 15000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation]);

  const handleStepClick = useCallback(
    (step, point, options = {}) => {
      const refineOnly = options.refineOnly === true;
      if (step === 'pickup') {
        onPickupChange?.(point);
        if (!refineOnly) {
          if (controlledStep !== undefined) {
            onActiveStepChange?.('destination');
          } else {
            setInternalStep('destination');
          }
        }
      } else {
        onDestinationChange?.(point);
        if (!refineOnly) {
          if (controlledStep !== undefined) {
            onActiveStepChange?.('pickup');
          } else {
            setInternalStep('pickup');
          }
        }
      }
    },
    [onPickupChange, onDestinationChange, controlledStep, onActiveStepChange]
  );

  const routeStart = routeFrom?.lat != null ? routeFrom : pickup;
  const routeEnd = destination;

  useEffect(() => {
    if (!routeStart?.lat || !routeEnd?.lat) {
      setRoutePath([]);
      setTripInfo(null);
      return;
    }

    const samePoint =
      Math.abs(routeStart.lat - routeEnd.lat) < 1e-5 &&
      Math.abs(routeStart.lng - routeEnd.lng) < 1e-5;
    if (samePoint) {
      setRoutePath([]);
      setTripInfo(null);
      return;
    }

    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const shortest = await fetchShortestRoute(routeStart, routeEnd);
        if (shortest?.path?.length) {
          setRoutePath(shortest.path);
          setTripInfo({ distance: shortest.distance, duration: shortest.duration });
        } else {
          setRoutePath([
            { lat: routeStart.lat, lng: routeStart.lng },
            { lat: routeEnd.lat, lng: routeEnd.lng }
          ]);
          setTripInfo(null);
        }
      } catch {
        setRoutePath([
          { lat: routeStart.lat, lng: routeStart.lng },
          { lat: routeEnd.lat, lng: routeEnd.lng }
        ]);
        setTripInfo(null);
      } finally {
        setRouteLoading(false);
      }
    };

    fetchRoute();
  }, [routeStart?.lat, routeStart?.lng, routeEnd?.lat, routeEnd?.lng]);

  const boundsPoints = useMemo(() => {
    const pts = [];
    if (pickup) pts.push(pickup);
    if (destination) pts.push(destination);
    if (userPosition) pts.push(userPosition);
    routePath.forEach((p) => pts.push(p));
    rideMarkers.forEach((m) => m.lat != null && pts.push(m));
    return pts;
  }, [pickup, destination, userPosition, routePath, rideMarkers]);

  const center = useMemo(() => [LAHORE_CENTER.lat, LAHORE_CENTER.lng], []);
  const showRoute = routeStart?.lat && routeEnd?.lat;
  const routeFitKey =
    routePath.length > 1
      ? `route-${routePath.length}-${routePath[0]?.lat}-${routePath[routePath.length - 1]?.lat}`
      : '';
  const shouldFitRoute = routePath.length > 1 && boundsPoints.length >= 2;

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slateCustom-700 ${className}`}>
      {geoError && !userPosition && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-slateCustom-800/95 border border-slateCustom-600 px-3 py-1.5 text-[10px] text-white/80 pointer-events-none">
          {geoError}
        </div>
      )}

      {showRoute && (tripInfo || routeLoading) && (
        <div className="absolute top-3 right-3 z-[1000] rounded-lg bg-slateCustom-900/95 border border-slateCustom-600 px-3 py-2 text-xs text-white shadow-lg pointer-events-none">
          {routeLoading ? 'Calculating route…' : `${tripInfo.distance} · ${tripInfo.duration}`}
        </div>
      )}

      {interactive && resolvingClick && (
        <div className="absolute top-3 left-3 z-[1000] rounded-lg bg-brand-500/90 px-3 py-1.5 text-[10px] font-bold text-white pointer-events-none">
          Locating address…
        </div>
      )}

      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className={`h-full w-full z-0 ${interactive ? 'cursor-crosshair' : ''}`}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {interactive && (
          <MapClickHandler
            enabled
            activeStep={activeStep}
            onStepClick={handleStepClick}
            onResolving={setResolvingClick}
          />
        )}

        {userPosition && (
          <>
            <Marker position={[userPosition.lat, userPosition.lng]} icon={userIcon}>
              <Popup>Your location</Popup>
            </Marker>
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={120}
              pathOptions={{ color: '#4f5ef4', fillColor: '#4f5ef4', fillOpacity: 0.15 }}
            />
          </>
        )}

        {waveCenter?.lat && waveRadiusMeters > 0 && (
          <WaveCircles
            center={waveCenter}
            radiusMeters={waveRadiusMeters}
            animating={waveAnimating}
          />
        )}

        {pickup?.lat && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Pickup</Popup>
          </Marker>
        )}

        {showDestinationMarker && destination?.lat && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {routePath.length > 1 && (
          <Polyline
            positions={routePath.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#4f5ef4', weight: 5, opacity: 0.85 }}
          />
        )}

        {rideMarkers.map((m, i) =>
          m.lat != null ? (
            <Marker
              key={m.id || i}
              position={[m.lat, m.lng]}
              icon={
                m.iconHtml
                  ? makeDivIcon(m.iconHtml, m.iconSize || [32, 32], m.iconAnchor)
                  : rideMarkerIcon
              }
            >
              <Popup>{m.title || 'Driver'}</Popup>
            </Marker>
          ) : null
        )}

        {shouldFitRoute ? (
          <FitRouteBounds points={boundsPoints} fitKey={routeFitKey} />
        ) : flyToPickup && pickup?.lat ? (
          <FlyToPoint point={pickup} zoom={15} />
        ) : boundsPoints.length >= 2 ? (
          <FitRouteBounds points={boundsPoints} fitKey="markers" />
        ) : boundsPoints.length === 1 && pickup?.lat ? (
          <FlyToPoint point={pickup} zoom={14} />
        ) : null}
      </MapContainer>
    </div>
  );
}

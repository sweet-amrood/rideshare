import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { fixLeafletDefaultIcons } from './fixLeafletIcons';
import { LAHORE_CENTER, DEFAULT_ZOOM } from './constants';
import {
  reverseGeocodeLater,
  pointFromCoords,
  PENDING_ADDRESS_LABEL
} from './geocode';

fixLeafletDefaultIcons();

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

function ClickLayer({ activeStep, onMapClick }) {
  useMapEvents({
    click: (e) => {
      if (!activeStep) return;
      onMapClick(activeStep, { lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

/**
 * Click map to set pickup (green) then destination (red).
 */
export default function MapClickPicker({
  className = 'h-[280px] w-full',
  pickup,
  destination,
  onPickupChange,
  onDestinationChange
}) {
  const [activeStep, setActiveStep] = useState('pickup');
  const [resolving, setResolving] = useState(false);

  const applyPoint = useCallback(
    (step, point, refineOnly) => {
      if (step === 'pickup') {
        onPickupChange?.(point);
        if (!refineOnly) setActiveStep('destination');
      } else {
        onDestinationChange?.(point);
        if (!refineOnly) setActiveStep('pickup');
      }
    },
    [onPickupChange, onDestinationChange]
  );

  const handleMapClick = useCallback(
    (step, coords) => {
      setResolving(true);
      const { lat, lng } = coords;
      applyPoint(step, pointFromCoords(lat, lng, PENDING_ADDRESS_LABEL), false);
      reverseGeocodeLater(lat, lng, (label) => {
        applyPoint(step, pointFromCoords(lat, lng, label), true);
        setResolving(false);
      });
    },
    [applyPoint]
  );

  return (
    <div className={`relative rounded-xl overflow-hidden border border-slateCustom-700 ${className}`}>
      <div className="absolute top-2 left-2 right-2 z-[1000] flex flex-wrap gap-2 pointer-events-none">
        <span
          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
            activeStep === 'pickup' ? 'bg-green-500/90 text-white' : 'bg-slateCustom-900/90 text-white/70'
          }`}
        >
          1. Tap pickup
        </span>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
            activeStep === 'destination' ? 'bg-red-500/90 text-white' : 'bg-slateCustom-900/90 text-white/70'
          }`}
        >
          2. Tap destination
        </span>
        {resolving && (
          <span className="text-[10px] bg-brand-500/90 text-white px-2 py-1 rounded-md">Loading…</span>
        )}
      </div>

      <MapContainer
        center={[LAHORE_CENTER.lat, LAHORE_CENTER.lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full z-0 cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickLayer activeStep={activeStep} onMapClick={handleMapClick} />
        {pickup?.lat && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>Pickup: {pickup.name}</Popup>
          </Marker>
        )}
        {destination?.lat && (
          <Marker position={[destination.lat, destination.lng]} icon={destIcon}>
            <Popup>Destination: {destination.name}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

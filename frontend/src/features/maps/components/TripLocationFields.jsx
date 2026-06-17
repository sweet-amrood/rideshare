import PlaceAutocomplete from './PlaceAutocomplete';
import { MapPin, Flag } from 'lucide-react';

/**
 * Reusable pickup + destination fields for Find Ride / Offer Ride forms.
 */
export default function TripLocationFields({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  locationBias,
  disabled = false
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PlaceAutocomplete
        label="Pickup"
        placeholder="Where are you leaving from?"
        value={pickup}
        onChange={onPickupChange}
        bias={locationBias}
        icon={MapPin}
        disabled={disabled}
      />
      <PlaceAutocomplete
        label="Destination"
        placeholder="Where are you going?"
        value={destination}
        onChange={onDestinationChange}
        bias={locationBias || pickup}
        icon={Flag}
        disabled={disabled}
      />
    </div>
  );
}

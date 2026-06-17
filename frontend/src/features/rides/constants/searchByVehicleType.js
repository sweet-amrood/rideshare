import { VEHICLE_TYPES } from '@/features/driver/constants/vehicleCatalog';

export const RIDE_TYPE_OPTIONS = VEHICLE_TYPES.map((t) => ({
  id: t.id,
  label: t.label,
  description:
    t.id === 'CAR'
      ? 'Cars & sedans — AC, more seats, luggage'
      : t.id === 'BIKE'
        ? 'Motorcycle — 1 passenger, low cost'
        : 'Auto rickshaw — short trips, 1–3 seats'
}));

/** Filters shown per ride type when searching */
export const SEARCH_PREFS_BY_TYPE = {
  CAR: {
    maxSeats: 6,
    defaultSeats: 1,
    showAC: true,
    showLuggage: true,
    luggageOptions: ['NONE', 'SMALL', 'MEDIUM', 'LARGE'],
    hints: ['Prefer air conditioning', 'Larger luggage allowed']
  },
  BIKE: {
    maxSeats: 1,
    defaultSeats: 1,
    showAC: false,
    showLuggage: true,
    luggageOptions: ['NONE', 'SMALL'],
    hints: ['Single seat only', 'Small bag only — no large luggage']
  },
  RICKSHAW: {
    maxSeats: 3,
    defaultSeats: 1,
    showAC: false,
    showLuggage: true,
    luggageOptions: ['NONE', 'SMALL', 'MEDIUM', 'LARGE'],
    hints: ['Ideal for short city trips', 'Up to 3 passengers in most rickshaws']
  }
};

export function getVehicleTypeLabel(type) {
  return RIDE_TYPE_OPTIONS.find((o) => o.id === type)?.label || type || 'Ride';
}

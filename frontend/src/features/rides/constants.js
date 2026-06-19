export const RIDE_TYPES = {
  ONE_TIME: 'ONE_TIME',
  RECURRING: 'RECURRING'
};

export const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

export const SMOKING_OPTIONS = [
  { value: 'NO', label: 'No smoking' },
  { value: 'OUTSIDE_ONLY', label: 'Outside only' },
  { value: 'FLEXIBLE', label: 'Flexible' },
  { value: 'YES', label: 'Smoking allowed' }
];

export const LUGGAGE_OPTIONS = [
  { value: 'NONE', label: 'No luggage' },
  { value: 'SMALL', label: 'Small bags' },
  { value: 'MEDIUM', label: 'Medium luggage' },
  { value: 'LARGE', label: 'Large luggage' }
];

export const DEFAULT_FORM = {
  vehicleId: '',
  originAddress: '',
  originCoords: null,
  destinationAddress: '',
  destinationCoords: null,
  rideType: 'ONE_TIME',
  departureDate: '',
  departureTime: '08:00',
  recurrenceDays: [],
  weeksAhead: 4,
  totalSeats: 3,
  costPerSeat: 0,
  distanceKm: null,
  restrictions: {
    womenOnly: false,
    universityOnly: false,
    officeOnly: false,
    sideDetourKm: 3
  },
  amenities: {
    luggageAllowed: 'SMALL',
    hasAC: true,
    smoking: 'NO'
  },
  allowedCommunities: [],
  notes: ''
};

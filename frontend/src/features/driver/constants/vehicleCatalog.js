export const VEHICLE_TYPES = [
  { id: 'CAR', label: 'Car', defaultSeats: 4, plateLabel: 'License plate' },
  { id: 'BIKE', label: 'Bike / motorcycle', defaultSeats: 1, plateLabel: 'Registration number' },
  { id: 'RICKSHAW', label: 'Rickshaw', defaultSeats: 3, plateLabel: 'Registration number' }
];

/** Company / brand names grouped by ride type */
export const COMPANIES_BY_TYPE = {
  CAR: [
    'Toyota',
    'Honda',
    'Suzuki',
    'Hyundai',
    'Kia',
    'Changan',
    'MG',
    'Prince',
    'Daihatsu',
    'Proton',
    'Nissan',
    'Mitsubishi',
    'Other'
  ],
  BIKE: [
    'Honda (CD 70 / 125)',
    'Yamaha',
    'Suzuki',
    'Road Prince',
    'United',
    'Super Power',
    'Metro',
    'Hi Speed',
    'Kawasaki',
    'Other'
  ],
  RICKSHAW: [
    'Qingqi',
    'Sazgar',
    'Loader rickshaw',
    'Pak Suzuki Ravi',
    'TVS',
    'United rickshaw',
    'Sohrab',
    'Other'
  ]
};

export const MODEL_HINTS = {
  CAR: 'e.g. Corolla, Civic, Alto',
  BIKE: 'e.g. CD 70, YBR 125',
  RICKSHAW: 'e.g. Qingqi 3-wheeler'
};

export function getDefaultSeats(vehicleType) {
  return VEHICLE_TYPES.find((t) => t.id === vehicleType)?.defaultSeats ?? 4;
}

export function getPlateLabel(vehicleType) {
  return VEHICLE_TYPES.find((t) => t.id === vehicleType)?.plateLabel ?? 'Registration';
}

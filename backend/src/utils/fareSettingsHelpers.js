const DEFAULT_VEHICLE_RATE = {
  perKmRate: 25,
  baseFare: 0,
  passengerMinDiscountPercent: 13,
  driverMaxIncreasePercent: 25
};

const DEFAULTS_BY_TYPE = {
  BIKE: { perKmRate: 25, baseFare: 0 },
  CAR: { perKmRate: 45, baseFare: 0 },
  RICKSHAW: { perKmRate: 22, baseFare: 0 }
};

const VEHICLE_TYPES = ['CAR', 'BIKE', 'RICKSHAW'];
const RATE_FIELDS = [
  'perKmRate',
  'baseFare',
  'passengerMinDiscountPercent',
  'driverMaxIncreasePercent'
];

const toPlainRate = (stored) => {
  if (!stored) return null;
  const r = stored.toObject ? stored.toObject() : stored;
  let perKmRate = Number(r.perKmRate);
  const baseFare = Number(r.baseFare);
  if (!Number.isFinite(perKmRate) && Number.isFinite(baseFare)) {
    perKmRate = baseFare;
  }
  if (!Number.isFinite(perKmRate)) return null;
  return {
    ratePerKm: perKmRate,
    perKmRate,
    minimumFare: Number.isFinite(baseFare) && baseFare > 0 ? baseFare : 0,
    baseFare: Number.isFinite(baseFare) ? baseFare : 0,
    passengerMinDiscountPercent:
      Number(r.passengerMinDiscountPercent) || DEFAULT_VEHICLE_RATE.passengerMinDiscountPercent,
    driverMaxIncreasePercent:
      Number(r.driverMaxIncreasePercent) || DEFAULT_VEHICLE_RATE.driverMaxIncreasePercent
  };
};

const getVehicleRate = (settings, vehicleType) => {
  const stored = toPlainRate(settings?.vehicleRates?.[vehicleType]);
  if (stored) return stored;

  const def = DEFAULTS_BY_TYPE[vehicleType] || DEFAULT_VEHICLE_RATE;
  const mult = settings?.vehicleMultipliers?.[vehicleType] ?? 1;
  const legacyKm = Number(settings?.perKmRate);
  const legacyBase = Number(settings?.baseFare);

  if (Number.isFinite(legacyKm)) {
    return {
      ratePerKm: Math.round(legacyKm * mult * 10) / 10,
      perKmRate: Math.round(legacyKm * mult * 10) / 10,
      minimumFare: 0,
      baseFare: 0,
      passengerMinDiscountPercent:
        Number(settings?.passengerMinDiscountPercent) ||
        DEFAULT_VEHICLE_RATE.passengerMinDiscountPercent,
      driverMaxIncreasePercent:
        Number(settings?.driverMaxIncreasePercent) || DEFAULT_VEHICLE_RATE.driverMaxIncreasePercent
    };
  }
  if (Number.isFinite(legacyBase)) {
    return {
      ratePerKm: Math.round(legacyBase * mult),
      perKmRate: Math.round(legacyBase * mult),
      minimumFare: 0,
      baseFare: 0,
      passengerMinDiscountPercent:
        Number(settings?.passengerMinDiscountPercent) ||
        DEFAULT_VEHICLE_RATE.passengerMinDiscountPercent,
      driverMaxIncreasePercent:
        Number(settings?.driverMaxIncreasePercent) || DEFAULT_VEHICLE_RATE.driverMaxIncreasePercent
    };
  }

  return {
    ratePerKm: def.perKmRate,
    perKmRate: def.perKmRate,
    minimumFare: def.baseFare,
    baseFare: def.baseFare,
    passengerMinDiscountPercent: DEFAULT_VEHICLE_RATE.passengerMinDiscountPercent,
    driverMaxIncreasePercent: DEFAULT_VEHICLE_RATE.driverMaxIncreasePercent
  };
};

module.exports = {
  DEFAULT_VEHICLE_RATE,
  DEFAULTS_BY_TYPE,
  VEHICLE_TYPES,
  RATE_FIELDS,
  getVehicleRate,
  toPlainRate
};

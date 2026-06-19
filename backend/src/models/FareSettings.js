const mongoose = require('mongoose');

const VehicleRateSchema = new mongoose.Schema(
  {
    perKmRate: { type: Number, default: 25 },
    baseFare: { type: Number, default: 0 },
    passengerMinDiscountPercent: { type: Number, default: 13 },
    driverMaxIncreasePercent: { type: Number, default: 25 }
  },
  { _id: false }
);

const FareSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    currency: { type: String, default: 'PKR' },
    vehicleRates: {
      CAR: { type: VehicleRateSchema, default: () => ({}) },
      BIKE: { type: VehicleRateSchema, default: () => ({}) },
      RICKSHAW: { type: VehicleRateSchema, default: () => ({}) }
    },
    nightMultiplier: { type: Number, default: 1.15 },
    nightStartHour: { type: Number, default: 21 },
    nightEndHour: { type: Number, default: 6 },
    peakHours: [
      {
        startHour: { type: Number, default: 8 },
        endHour: { type: Number, default: 10 },
        multiplier: { type: Number, default: 1.2 }
      },
      {
        startHour: { type: Number, default: 17 },
        endHour: { type: Number, default: 20 },
        multiplier: { type: Number, default: 1.25 }
      }
    ],
    searchWaveRadiiMeters: { type: [Number], default: [1500, 3000, 5000, 8000] },
    driverNotifyRadiusMeters: { type: Number, default: 5000 },
    avgSpeedKmh: { type: Number, default: 22 },
    /** Carpool AC rides: rate × this multiplier (e.g. 1.15 = +15%) */
    acPremiumMultiplier: { type: Number, default: 1.15 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FareSettings', FareSettingsSchema);

const mongoose = require('mongoose');
const {
  BOOKING_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
  CANCELLED_BY,
  BOOKING_VEHICLE_TYPE,
  BOOKING_MODES,
  PENDING_TTL_HOURS
} = require('../constants/booking');

const PointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  { _id: false }
);

const StatusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, enum: ['PASSENGER', 'DRIVER', 'SYSTEM'], default: 'SYSTEM' },
    note: { type: String, default: '' }
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      required: true,
      index: true
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    vehicleType: {
      type: String,
      enum: ['CAR', 'BIKE', 'RICKSHAW'],
      default: BOOKING_VEHICLE_TYPE,
      required: true
    },
    bookingMode: {
      type: String,
      enum: Object.values(BOOKING_MODES),
      default: BOOKING_MODES.CARPOOL,
      index: true
    },
    seatsBooked: { type: Number, required: true, min: 1, max: 6 },
    pickupPoint: {
      address: { type: String, required: true },
      location: { type: PointSchema, required: true }
    },
    dropoffPoint: {
      address: { type: String, required: true },
      location: { type: PointSchema, required: true }
    },
    pricing: {
      costPerSeat: { type: Number, required: true, min: 0 },
      seatsBooked: { type: Number, required: true, min: 1 },
      subtotal: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'PKR' },
      costPerKm: { type: Number, default: 0 },
      ownDistanceKm: { type: Number, default: 0 },
      detourDistanceKm: { type: Number, default: 0 },
      totalFareDistanceKm: { type: Number, default: 0 },
      mainDistanceKm: { type: Number, default: 0 },
      totalDistanceKm: { type: Number, default: 0 },
      totalFuelCost: { type: Number, default: 0 },
      costPerSeatIfFull: { type: Number, default: 0 },
      routeOldDistanceKm: { type: Number, default: 0 },
      routeNewDistanceKm: { type: Number, default: 0 },
      fareFormula: { type: String, default: '' }
    },
    farePaid: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.UNPAID
    },
    refund: {
      amount: { type: Number, default: 0 },
      reason: { type: String, default: '' },
      status: {
        type: String,
        enum: Object.values(REFUND_STATUS),
        default: REFUND_STATUS.NONE
      },
      preparedAt: { type: Date, default: null },
      processedAt: { type: Date, default: null }
    },
    cancellation: {
      by: { type: String, enum: [...Object.values(CANCELLED_BY), null], default: null },
      reason: { type: String, default: '' },
      at: { type: Date, default: null }
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    pendingExpiresAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

BookingSchema.index({ rideId: 1, passengerId: 1 });
BookingSchema.index({ passengerId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ status: 1, pendingExpiresAt: 1 });

BookingSchema.pre('save', function generateRef(next) {
  if (!this.bookingRef) {
    const suffix = Date.now().toString(36).toUpperCase();
    this.bookingRef = `BKG-${suffix}`;
  }
  if (this.isNew && this.status === BOOKING_STATUS.PENDING && !this.pendingExpiresAt) {
    this.pendingExpiresAt = new Date(Date.now() + PENDING_TTL_HOURS * 60 * 60 * 1000);
  }
  this.updatedAt = new Date();
  next();
});

BookingSchema.methods.pushStatus = function (status, by = 'SYSTEM', note = '') {
  this.status = status;
  this.statusHistory.push({ status, at: new Date(), by, note });
};

module.exports = mongoose.model('Booking', BookingSchema);

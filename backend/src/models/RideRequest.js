const mongoose = require('mongoose');
const { RIDE_REQUEST_STATUS, RIDE_PHASE, OFFER_STATUS } = require('../constants/rideRequest');

const PointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  { _id: false }
);

const OfferSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: Object.values(OFFER_STATUS),
      default: OFFER_STATUS.PENDING
    },
    offeredFare: { type: Number, required: true, min: 0 },
    counterFare: { type: Number, default: null },
    distanceToPickupKm: { type: Number, default: 0 },
    etaMinutes: { type: Number, default: 0 },
    driverLocation: { type: PointSchema, default: null },
    driverName: { type: String, default: '' },
    vehicleType: { type: String, enum: ['CAR', 'BIKE', 'RICKSHAW'], default: 'BIKE' },
    message: { type: String, default: '' },
    passengerRespondBy: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const RideRequestSchema = new mongoose.Schema(
  {
    requestRef: { type: String, unique: true, sparse: true, index: true },
    passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleType: { type: String, enum: ['CAR', 'BIKE', 'RICKSHAW'], required: true },
    hasAC: { type: Boolean, default: false },
    pickup: {
      address: { type: String, required: true },
      location: { type: PointSchema, required: true }
    },
    dropoff: {
      address: { type: String, required: true },
      location: { type: PointSchema, required: true }
    },
    distanceKm: { type: Number, default: 0 },
    recommendedFare: { type: Number, required: true },
    passengerOfferedFare: { type: Number, required: true },
    agreedFare: { type: Number, default: null },
    minFare: { type: Number, required: true },
    maxFare: { type: Number, required: true },
    currency: { type: String, default: 'PKR' },
    fareFactors: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: Object.values(RIDE_REQUEST_STATUS),
      default: RIDE_REQUEST_STATUS.SEARCHING,
      index: true
    },
    phase: {
      type: String,
      enum: [...Object.values(RIDE_PHASE), ''],
      default: '',
      index: true
    },
    searchRadiusMeters: { type: Number, default: 1500 },
    notifiedDriverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    driversNotifiedCount: { type: Number, default: 0 },
    offers: { type: [OfferSchema], default: [] },
    acceptedOfferId: { type: mongoose.Schema.Types.ObjectId, default: null },
    acceptedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    driverLiveLocation: { type: PointSchema, default: null },
    pickupPingAt: { type: Date, default: null },
    waitCountdownEndsAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    completedBy: { type: String, enum: ['DRIVER', 'PASSENGER', ''], default: '' },
    passengerClosedAt: { type: Date, default: null },
    driverClosedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ['DRIVER', 'PASSENGER', 'SYSTEM', ''], default: '' },
    cancelReason: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    searchAutoCancelAt: { type: Date, default: null, index: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

RideRequestSchema.index({ 'pickup.location': '2dsphere' });
RideRequestSchema.index({ passengerId: 1, status: 1, createdAt: -1 });
RideRequestSchema.index({ acceptedDriverId: 1, status: 1 });
RideRequestSchema.index({ status: 1, expiresAt: 1 });

RideRequestSchema.pre('save', function assignRef(next) {
  if (!this.requestRef) {
    this.requestRef = `REQ-${Date.now().toString(36).toUpperCase()}`;
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('RideRequest', RideRequestSchema);

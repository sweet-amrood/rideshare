const mongoose = require('mongoose');

const PointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  { _id: false }
);

const RideSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  seriesId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null
  },
  status: {
    type: String,
    enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true
  },
  rideType: {
    type: String,
    enum: ['ONE_TIME', 'RECURRING'],
    default: 'ONE_TIME'
  },
  isRecurring: { type: Boolean, default: false },
  recurrence: {
    daysOfWeek: { type: [Number], default: [] },
    departureTime: { type: String, default: '' },
    endDate: { type: Date, default: null },
    weeksAhead: { type: Number, default: 4 }
  },
  origin: {
    address: { type: String, required: true },
    location: { type: PointSchema, required: true }
  },
  destination: {
    address: { type: String, required: true },
    location: { type: PointSchema, required: true }
  },
  totalSeats: { type: Number, required: true, min: 1, max: 6 },
  availableSeats: { type: Number, required: true, min: 0 },
  bookedSeats: { type: Number, default: 0, min: 0 },
  costPerSeat: { type: Number, required: true, min: 0 },
  pricing: {
    totalFuelCost: { type: Number, default: 0 },
    distanceKm: { type: Number, default: 0 },
    platformRatePerKm: { type: Number, default: 0 },
    fuelRatePerKm: { type: Number, default: 0 },
    acPremiumApplied: { type: Boolean, default: false },
    currency: { type: String, default: 'PKR' },
    splitAmong: { type: Number, default: 0 }
  },
  /** Dynamic carpool route — ordered passenger stops between origin and destination */
  route: {
    waypoints: [
      {
        type: { type: String, enum: ['pickup', 'dropoff'], required: true },
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
        passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        address: { type: String, default: '' },
        location: { type: PointSchema, required: true }
      }
    ],
    currentTotalDistanceKm: { type: Number, default: 0 },
    lastOptimizedAt: { type: Date, default: null }
  },
  restrictions: {
    womenOnly: { type: Boolean, default: false },
    universityOnly: { type: Boolean, default: false },
    officeOnly: { type: Boolean, default: false },
    /** Max km passenger pickup/destination may deviate from driver's route ends (each side). */
    sideDetourKm: { type: Number, default: 3, min: 1, max: 15 }
  },
  amenities: {
    luggageAllowed: {
      type: String,
      enum: ['NONE', 'SMALL', 'MEDIUM', 'LARGE'],
      default: 'SMALL'
    },
    hasAC: { type: Boolean, default: true },
    smoking: {
      type: String,
      enum: ['NO', 'YES', 'OUTSIDE_ONLY', 'FLEXIBLE'],
      default: 'NO'
    }
  },
  departureDate: { type: Date, required: true, index: true },
  allowedCommunities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  notes: { type: String, maxlength: 300, default: '' },
  startedAt: { type: Date, default: null },
  currentPickupBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

RideSchema.index({ 'origin.location': '2dsphere' });
RideSchema.index({ 'destination.location': '2dsphere' });
RideSchema.index({ status: 1, departureDate: 1 });
RideSchema.index({ seriesId: 1 });
RideSchema.index({ driverId: 1, status: 1 });

RideSchema.methods.getSeatSummary = function () {
  return {
    totalSeats: this.totalSeats,
    availableSeats: this.availableSeats,
    bookedSeats: this.bookedSeats,
    isFull: this.availableSeats <= 0
  };
};

module.exports = mongoose.model('Ride', RideSchema);

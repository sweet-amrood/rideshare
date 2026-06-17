const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['CAR', 'BIKE', 'RICKSHAW'],
    default: 'CAR',
    required: true
  },
  company: { type: String, required: true, trim: true },
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true },
  color: { type: String, required: true, trim: true },
  licensePlate: { type: String, required: true, trim: true },
  totalSeats: { type: Number, required: true, min: 1, max: 8 },
  /** Primary thumbnail (first vehicle photo) */
  imageUrl: { type: String, default: '' },
  /** Exterior / interior photos (Cloudinary URLs) */
  photoUrls: { type: [String], default: [] },
  photoPublicIds: { type: [String], default: [] },
  registrationDocUrl: { type: String, default: '' },
  registrationDocPublicId: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  fuelType: {
    type: String,
    enum: ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC', 'CNG', ''],
    default: 'PETROL'
  },
  hasAC: { type: Boolean, default: true },
  insuranceUrl: { type: String, default: '' },
  rejectionReason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

VehicleSchema.index({ licensePlate: 1 }, { unique: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);

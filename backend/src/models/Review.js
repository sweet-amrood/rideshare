const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    revieweeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null
    },
    rideRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RideRequest',
      default: null,
      index: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    tags: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

ReviewSchema.index({ revieweeId: 1, reviewerId: 1, rideId: 1 }, { unique: true, sparse: true });
ReviewSchema.index(
  { revieweeId: 1, reviewerId: 1, rideRequestId: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Review', ReviewSchema);

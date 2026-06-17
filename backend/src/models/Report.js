const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  rideRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'RideRequest', default: null, index: true },
  category: {
    type: String,
    enum: [
      'HARASSMENT',
      'FAKE_PROFILE',
      'UNSAFE_DRIVING',
      'SCAM',
      'INAPPROPRIATE_BEHAVIOR',
      'OTHER'
    ],
    required: true
  },
  description: { type: String, required: true, maxlength: 2000 },
  evidenceUrls: [{ type: String }],
  status: {
    type: String,
    enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
    default: 'OPEN',
    index: true
  },
  adminAction: {
    type: String,
    enum: ['NONE', 'WARNING', 'SUSPEND', 'BAN', 'DISMISS'],
    default: 'NONE'
  },
  adminNotes: { type: String, default: '' },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  createdAt: { type: Date, default: Date.now }
});

ReportSchema.index({ reportedUserId: 1, status: 1 });

module.exports = mongoose.model('Report', ReportSchema);

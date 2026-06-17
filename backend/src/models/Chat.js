const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    default: null,
    index: true
  },
  rideRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideRequest',
    default: null,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: { type: String, default: '' },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

ChatSchema.pre('validate', function (next) {
  if (!this.rideId && !this.rideRequestId) {
    return next(new Error('Chat requires rideId or rideRequestId'));
  }
  next();
});

ChatSchema.index({ rideRequestId: 1, createdAt: 1 });

module.exports = mongoose.model('Chat', ChatSchema);

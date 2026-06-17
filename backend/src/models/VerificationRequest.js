const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  type: {
    type: String,
    enum: [
      'CNIC',
      'PASSPORT',
      'STUDENT_ID',
      'COMPANY_ID',
      'DRIVING_LICENSE',
      'VEHICLE_REGISTRATION',
      'INSURANCE',
      'SELFIE',
      'DOMAIN'
    ],
    required: true
  },
  documentUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT'],
    default: 'PENDING',
    index: true
  },
  rejectionReason: { type: String, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  reviewedAt: { type: Date, default: null },
  history: [
    {
      status: String,
      note: String,
      at: { type: Date, default: Date.now },
      by: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('VerificationRequest', VerificationRequestSchema);

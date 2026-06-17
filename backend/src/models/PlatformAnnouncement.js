const mongoose = require('mongoose');

const PlatformAnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  type: {
    type: String,
    enum: ['ANNOUNCEMENT', 'SAFETY', 'MAINTENANCE', 'VERIFICATION'],
    default: 'ANNOUNCEMENT'
  },
  targetRoles: {
    type: [String],
    enum: ['RIDER', 'DRIVER', 'ALL'],
    default: ['ALL']
  },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PlatformAnnouncement', PlatformAnnouncementSchema);

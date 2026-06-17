const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  domainName: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['UNIVERSITY', 'CORPORATE', 'OTHER'],
    default: 'OTHER'
  },
  passkey: {
    type: String,
    select: false,
    default: null
  },
  memberCount: {
    type: Number,
    default: 0
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Community', CommunitySchema);

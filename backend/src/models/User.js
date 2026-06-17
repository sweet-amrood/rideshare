const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PreferredRouteSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    originAddress: { type: String, trim: true, required: true },
    destinationAddress: { type: String, trim: true, required: true }
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema({
  /** Display name — not unique; many users may share the same name */
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  /** Optional handle — not unique */
  username: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationOTP: { type: String, default: null, select: false },
  emailVerificationExpires: { type: Date, default: null, select: false },
  resetPasswordToken: { type: String, default: null, select: false },
  resetPasswordExpires: { type: Date, default: null, select: false },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  isPhoneVerified: { type: Boolean, default: false },

  profile: {
    profilePictureUrl: { type: String, default: '' },
    avatarPreset: { type: String, default: '' },
    bio: { type: String, maxlength: 500, default: '' },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER', ''],
      default: ''
    },
    universityOrCompany: { type: String, trim: true, default: '' },
    preferredRoutes: { type: [PreferredRouteSchema], default: [] }
  },

  preferences: {
    smoking: {
      type: String,
      enum: ['NO', 'YES', 'OUTSIDE_ONLY', 'FLEXIBLE'],
      default: 'NO'
    },
    music: {
      type: String,
      enum: ['QUIET', 'LOW', 'CHAT_OK', 'ANY'],
      default: 'LOW'
    },
    chat: {
      type: String,
      enum: ['MINIMAL', 'FRIENDLY', 'WORK_ONLY'],
      default: 'FRIENDLY'
    },
    rideNotes: { type: String, maxlength: 200, default: '' }
  },

  privacy: {
    showPhone: { type: Boolean, default: false },
    showEmail: { type: Boolean, default: false },
    showBio: { type: Boolean, default: true },
    showRoutes: { type: Boolean, default: true },
    showRating: { type: Boolean, default: true },
    profileVisibility: {
      type: String,
      enum: ['PUBLIC', 'COMMUNITY', 'PRIVATE'],
      default: 'COMMUNITY'
    }
  },

  emergencyContact: {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    relationship: { type: String, trim: true, default: '' }
  },

  badges: {
    trustedRiderOverride: { type: Boolean, default: false },
    trustedRiderGrantedAt: { type: Date, default: null }
  },

  verification: {
    status: {
      type: String,
      enum: ['UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'UNVERIFIED'
    },
    domainVerified: { type: Boolean, default: false },
    domainType: {
      type: String,
      enum: ['UNIVERSITY', 'CORPORATE', 'NONE'],
      default: 'NONE'
    },
    organizationName: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    cnicUrl: { type: String, default: '' },
    selfieUrl: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null }
  },

  onboardingComplete: { type: Boolean, default: false },
  /** False until name + real phone provided (e.g. after Google sign-up) */
  profileCompleted: { type: Boolean, default: true },
  driverAvailability: {
    isOnline: { type: Boolean, default: false },
    activeVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    activeVehicleType: {
      type: String,
      enum: ['CAR', 'BIKE', 'RICKSHAW', ''],
      default: ''
    },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] }
    },
    updatedAt: { type: Date, default: null }
  },
  driverSetupComplete: { type: Boolean, default: false },
  /** User submitted driver docs; may be on passenger mode until admin approves */
  driverApplicant: { type: Boolean, default: false },
  driverApplicationSubmittedAt: { type: Date, default: null },
  driverSetup: {
    completedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    primaryVehicleType: {
      type: String,
      enum: ['CAR', 'BIKE', 'RICKSHAW', ''],
      default: ''
    }
  },

  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],

  rating: {
    average: { type: Number, default: 5.0 },
    count: { type: Number, default: 0 }
  },

  roles: {
    type: [String],
    enum: ['RIDER', 'DRIVER'],
    default: ['RIDER']
  },

  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'BANNED'],
    default: 'ACTIVE',
    index: true
  },
  adminNotes: { type: String, default: '' },
  warnings: [
    {
      reason: String,
      issuedAt: { type: Date, default: Date.now },
      issuedBy: { type: String, default: 'ADMIN' }
    }
  ],
  trustScore: { type: Number, default: 100, min: 0, max: 100 },

  createdAt: { type: Date, default: Date.now }
});

const { sanitizeDriverAvailability } = require('../utils/userGeo');

UserSchema.pre('save', async function (next) {
  sanitizeDriverAvailability(this);
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.index({ 'driverAvailability.location': '2dsphere' });

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);

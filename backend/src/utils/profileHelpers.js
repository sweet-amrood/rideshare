const { isDriverSetupComplete } = require('./driverSetupHelpers');

/**
 * Verification layers:
 * 1. emailVerified — account email OTP
 * 2. kycApproved — government ID review
 * 3. phoneVerified — SMS (optional)
 * 4. trustedRider — rating + KYC + email
 */

const TRUSTED_RIDER_MIN_RATING = 4.5;
const TRUSTED_RIDER_MIN_REVIEWS = 3;

const computeBadges = (user) => {
  const kycApproved = user.verification?.status === 'APPROVED';
  const emailVerified = !!user.isEmailVerified;
  const phoneVerified = !!user.isPhoneVerified;

  const meetsTrustedCriteria =
    emailVerified &&
    kycApproved &&
    user.rating?.average >= TRUSTED_RIDER_MIN_RATING &&
    user.rating?.count >= TRUSTED_RIDER_MIN_REVIEWS;

  const trustedRider = user.badges?.trustedRiderOverride || meetsTrustedCriteria;

  return {
    emailVerified,
    phoneVerified,
    kycApproved,
    trustedRider
  };
};

const getVerificationArchitecture = (user) => ({
  layers: [
    {
      id: 'email',
      label: 'Email verified',
      complete: !!user.isEmailVerified,
      required: true,
      setup: 'Confirm the code sent to your signup email'
    },
    {
      id: 'phone',
      label: 'Phone verified',
      complete: !!user.isPhoneVerified,
      required: false,
      setup: 'Verify the mobile number on your account'
    },
    ...(user.roles?.includes('DRIVER')
      ? [
          {
            id: 'driverCnic',
            label: 'CNIC (driver)',
            complete: !!user.verification?.cnicUrl,
            required: true,
            setup: 'Required when offering rides as a driver'
          },
          {
            id: 'driverSelfie',
            label: 'Selfie verification',
            complete: !!user.verification?.selfieUrl,
            required: true,
            setup: 'Clear face photo for identity match'
          },
          {
            id: 'driverLicense',
            label: 'Driving license',
            complete: !!user.verification?.licenseUrl,
            required: true,
            setup: 'Valid license for car, bike, or rickshaw'
          }
        ]
      : []),
    {
      id: 'profile',
      label: 'Profile complete',
      complete: !!(user.profile?.bio && user.emergencyContact?.name),
      required: false,
      setup: 'Add a bio and emergency contact in About'
    },
    {
      id: 'trustedRider',
      label: 'Trusted rider badge',
      complete: computeBadges(user).trustedRider,
      criteria: `Email + KYC approved, rating ≥ ${TRUSTED_RIDER_MIN_RATING}, ${TRUSTED_RIDER_MIN_REVIEWS}+ reviews`,
      required: false
    }
  ],
  trustScore: calculateTrustScore(user)
});

const calculateTrustScore = (user) => {
  let score = 0;
  if (user.isEmailVerified) score += 25;
  if (user.verification?.status === 'APPROVED') score += 30;
  if (user.isPhoneVerified) score += 15;
  if (user.profile?.bio) score += 5;
  if (user.emergencyContact?.name) score += 5;
  score += Math.min(20, (user.rating?.average || 5) * 4);
  return Math.min(100, Math.round(score));
};

const sanitizePublicUser = (user, viewerId) => {
  const isOwner = viewerId && String(viewerId) === String(user._id);
  const privacy = user.privacy || {};
  const badges = computeBadges(user);

  const base = {
    _id: user._id,
    name: user.name,
    profilePictureUrl: user.profile?.profilePictureUrl || '',
    badges,
    trustScore: calculateTrustScore(user),
    rating: privacy.showRating !== false ? user.rating : { average: 0, count: 0 },
    roles: user.roles,
    createdAt: user.createdAt
  };

  if (privacy.showBio !== false && user.profile?.bio) base.bio = user.profile.bio;
  if (privacy.showRoutes !== false && user.profile?.preferredRoutes?.length) {
    base.preferredRoutes = user.profile.preferredRoutes;
  }
  if (user.profile?.universityOrCompany) base.universityOrCompany = user.profile.universityOrCompany;
  if (user.preferences) {
    base.preferences = {
      smoking: user.preferences.smoking,
      music: user.preferences.music,
      chat: user.preferences.chat,
      rideNotes: user.preferences.rideNotes
    };
  }
  if (!isOwner) {
    if (privacy.showPhone && user.phoneNumber) base.phoneNumber = user.phoneNumber;
    if (privacy.showEmail && user.email) base.email = user.email;
  }

  if (isOwner) {
    return { ...user.toObject?.() || user, badges, trustScore: calculateTrustScore(user) };
  }

  return base;
};

const { resolveAvatarUrl } = require('./avatarUrl');

const buildProfileResponse = async (user, vehicles = [], reviews = []) => {
  if (user?.save) {
    try {
      const { syncDriverSetupAfterApproval } = require('./driverApprovalSync');
      await syncDriverSetupAfterApproval(user);
    } catch {
      /* non-fatal */
    }
  }
  const raw = user?.toObject ? user.toObject({ virtuals: true }) : { ...user };
  delete raw.password;
  delete raw.emailVerificationOTP;
  delete raw.emailVerificationExpires;
  delete raw.resetPasswordToken;
  delete raw.resetPasswordExpires;

  return {
    user: {
      ...raw,
      badges: computeBadges(user),
      trustScore: calculateTrustScore(user),
      onboardingComplete: user.onboardingComplete !== false,
      driverSetupComplete: isDriverSetupComplete(user),
      driverApplicant: user.driverApplicant === true,
      driverApplicationSubmittedAt: user.driverApplicationSubmittedAt || null,
      profileCompleted: user.profileCompleted !== false,
      avatarUrl: resolveAvatarUrl(user),
      driverAvailability: user.driverAvailability || { isOnline: false }
    },
    vehicles: vehicles.map((v) => (v?.toObject ? v.toObject() : v)),
    reviews,
    verificationArchitecture: getVerificationArchitecture(user)
  };
};

module.exports = {
  computeBadges,
  getVerificationArchitecture,
  calculateTrustScore,
  sanitizePublicUser,
  buildProfileResponse,
  TRUSTED_RIDER_MIN_RATING,
  TRUSTED_RIDER_MIN_REVIEWS
};

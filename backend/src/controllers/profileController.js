const User = require('../models/User');
const Community = require('../models/Community');
const Vehicle = require('../models/Vehicle');
const Review = require('../models/Review');
const { buildProfileResponse, sanitizePublicUser } = require('../utils/profileHelpers');

const { sanitizeDriverAvailability } = require('../utils/userGeo');

const ALLOWED_PROFILE_FIELDS = [
  'bio',
  'gender',
  'universityOrCompany',
  'profilePictureUrl',
  'avatarPreset',
  'preferredRoutes'
];

const ALLOWED_PREFERENCE_FIELDS = ['smoking', 'music', 'chat', 'rideNotes'];

const ALLOWED_PRIVACY_FIELDS = [
  'showPhone',
  'showEmail',
  'showBio',
  'showRoutes',
  'showRating',
  'profileVisibility'
];

/**
 * @route GET /api/v1/users/profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'communities',
      model: Community,
      select: 'name domainName type'
    });

    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const vehicles = await Vehicle.find({ ownerId: req.user._id });
    const reviews = await Review.find({ revieweeId: req.user._id })
      .populate('reviewerId', 'name profile.profilePictureUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      success: true,
      data: await buildProfileResponse(user, vehicles, reviews)
    });
  } catch (error) {
    console.error('[getMyProfile]', error.message);
    next(error);
  }
};

/**
 * @route PUT /api/v1/users/profile
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const {
      profile,
      preferences,
      emergencyContact,
      profilePictureUrl,
      roles,
      onboardingComplete
    } = req.body;

    if (onboardingComplete === true) {
      user.onboardingComplete = true;
    }

    if (profilePictureUrl !== undefined) {
      user.profile.profilePictureUrl = profilePictureUrl;
      if (profilePictureUrl) user.profile.avatarPreset = '';
    }
    if (req.body.avatarPreset !== undefined) {
      user.profile.avatarPreset = req.body.avatarPreset;
      if (req.body.avatarPreset) user.profile.profilePictureUrl = '';
    }
    if (req.body.removeAvatar) {
      user.profile.profilePictureUrl = '';
      user.profile.avatarPreset = '';
    }

    if (profile) {
      ALLOWED_PROFILE_FIELDS.forEach((key) => {
        if (profile[key] !== undefined) {
          user.profile[key] = profile[key];
        }
      });
    }

    if (preferences) {
      ALLOWED_PREFERENCE_FIELDS.forEach((key) => {
        if (preferences[key] !== undefined) {
          user.preferences[key] = preferences[key];
        }
      });
    }

    if (emergencyContact) {
      if (emergencyContact.name !== undefined) user.emergencyContact.name = emergencyContact.name;
      if (emergencyContact.phone !== undefined) user.emergencyContact.phone = emergencyContact.phone;
      if (emergencyContact.relationship !== undefined) {
        user.emergencyContact.relationship = emergencyContact.relationship;
      }
    }

    if (req.body.name !== undefined) {
      const nextName = String(req.body.name).trim();
      if (!nextName) {
        res.status(400);
        throw new Error('Name cannot be empty');
      }
      user.name = nextName;
    }

    if (req.body.phoneNumber !== undefined) {
      const nextPhone = String(req.body.phoneNumber).trim();
      if (!nextPhone) {
        res.status(400);
        throw new Error('Phone number cannot be empty');
      }
      if (nextPhone !== user.phoneNumber) {
        user.phoneNumber = nextPhone;
        user.isPhoneVerified = false;
      }
    }

    if (req.body.username !== undefined) {
      user.username = String(req.body.username).trim().toLowerCase();
    }

    if (req.body.email !== undefined) {
      const nextEmail = String(req.body.email).trim().toLowerCase();
      if (!nextEmail) {
        res.status(400);
        throw new Error('Email cannot be empty');
      }
      if (nextEmail !== user.email) {
        const taken = await User.findOne({ email: nextEmail });
        if (taken && taken._id.toString() !== user._id.toString()) {
          res.status(400);
          throw new Error('An account with this email already exists');
        }
        user.email = nextEmail;
        user.isEmailVerified = false;
        user.emailVerificationOTP = null;
        user.emailVerificationExpires = null;
      }
    }

    const { GOOGLE_PLACEHOLDER_PHONE } = require('../utils/googleAuth');
    if (
      user.name?.trim() &&
      user.phoneNumber?.trim() &&
      user.phoneNumber !== GOOGLE_PLACEHOLDER_PHONE
    ) {
      user.profileCompleted = true;
    }
    if (req.body.profileCompleted === true) {
      user.profileCompleted = true;
    }

    if (roles !== undefined) {
      const validRoles = ['RIDER', 'DRIVER'];
      let nextRoles = roles;
      if (roles === 'BOTH') {
        res.status(400);
        throw new Error('Choose either Passenger (RIDER) or Driver (DRIVER), not both');
      }
      if (typeof nextRoles === 'string') nextRoles = [nextRoles];
      if (Array.isArray(nextRoles)) {
        const filtered = [...new Set(nextRoles.filter((r) => validRoles.includes(r)))];
        if (filtered.length > 1) {
          res.status(400);
          throw new Error('Only one role allowed. Select Passenger or Driver.');
        }
        user.roles = filtered.length ? filtered : ['RIDER'];
      }
    }

    sanitizeDriverAvailability(user);
    await user.save();
    const vehicles = await Vehicle.find({ ownerId: user._id });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: await buildProfileResponse(user, vehicles)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PATCH /api/v1/users/profile/privacy
 */
const updatePrivacy = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    ALLOWED_PRIVACY_FIELDS.forEach((key) => {
      if (req.body[key] !== undefined) {
        user.privacy[key] = req.body[key];
      }
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Privacy settings updated',
      data: { privacy: user.privacy }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/users/:id/public
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate({
      path: 'communities',
      model: Community,
      select: 'name domainName type'
    });
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const reviews = await Review.find({ revieweeId: user._id })
      .populate('reviewerId', 'name profile.profilePictureUrl')
      .sort({ createdAt: -1 })
      .limit(10);

    const publicProfile = sanitizePublicUser(user, req.user?._id);

    return res.status(200).json({
      success: true,
      data: {
        user: publicProfile,
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/users/:id/reviews
 */
const getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.id })
      .populate('reviewerId', 'name profile.profilePictureUrl')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/users/:id/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { rating, comment, rideId, tags } = req.body;
    const revieweeId = req.params.id;

    if (String(revieweeId) === String(req.user._id)) {
      res.status(400);
      throw new Error('You cannot review yourself');
    }

    if (!rating || rating < 1 || rating > 5) {
      res.status(400);
      throw new Error('Rating must be between 1 and 5');
    }

    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      res.status(404);
      throw new Error('User not found');
    }

    const existing = await Review.findOne({
      revieweeId,
      reviewerId: req.user._id,
      ...(rideId ? { rideId } : {})
    });

    if (existing) {
      res.status(400);
      throw new Error('You have already reviewed this user for this ride');
    }

    const review = await Review.create({
      revieweeId,
      reviewerId: req.user._id,
      rideId: rideId || undefined,
      rating,
      comment: comment || '',
      tags: tags || []
    });

    const allReviews = await Review.find({ revieweeId });
    const avg =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    reviewee.rating.average = Math.round(avg * 10) / 10;
    reviewee.rating.count = allReviews.length;
    await reviewee.save();

    await review.populate('reviewerId', 'name profile.profilePictureUrl');

    return res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/v1/users/verification/architecture
 */
const getVerificationArchitecture = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { getVerificationArchitecture: arch } = require('../utils/profileHelpers');

    return res.status(200).json({
      success: true,
      data: arch(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/v1/users/profile/verify-phone
 */
const verifyPhone = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.phoneNumber) {
      res.status(400);
      throw new Error('Add a phone number on your profile first');
    }
    user.isPhoneVerified = true;
    await user.save();
    return res.status(200).json({
      success: true,
      message: 'Phone number marked as verified',
      data: { isPhoneVerified: true }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  updatePrivacy,
  getPublicProfile,
  getUserReviews,
  createReview,
  getVerificationArchitecture,
  verifyPhone
};

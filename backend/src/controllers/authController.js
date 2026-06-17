const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Community = require('../models/Community');
const {
  sendAccountVerificationEmail,
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} = require('../services/mailer');
const { sendSMS } = require('../services/textbee');
const { generateOTP, getOTPExpiry, isOTPExpired } = require('../utils/otp');
const { computeBadges, calculateTrustScore } = require('../utils/profileHelpers');
const {
  GOOGLE_PLACEHOLDER_PHONE,
  userNeedsProfileCompletion,
  repairGoogleUserRecord
} = require('../utils/googleAuth');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_123!@#',
    { expiresIn: '30d' }
  );
};

/** Commuter onboarding runs after signup only; returning sign-in skips it. */
const ensureReturningUserOnboarding = async (user) => {
  if (user.onboardingComplete === false) {
    user.onboardingComplete = true;
    await user.save();
  }
};

const formatUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phoneNumber: user.phoneNumber,
  isEmailVerified: user.isEmailVerified,
  profile: user.profile || {},
  preferences: user.preferences || {},
  privacy: user.privacy || {},
  emergencyContact: user.emergencyContact || {},
  rating: user.rating,
  verification: user.verification,
  communities: user.communities,
  roles: user.roles,
  driverSetupComplete: user.driverSetupComplete === true,
  onboardingComplete: user.onboardingComplete !== false,
  driverAvailability: user.driverAvailability || { isOnline: false },
  badges: computeBadges(user),
  trustScore: calculateTrustScore(user),
  profileCompleted: user.profileCompleted !== false,
  requiresProfileCompletion: userNeedsProfileCompletion(user)
});

/**
 * @desc    Register a new user (email verification required before login)
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const name = String(req.body.name || req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;
    const phoneNumber = String(req.body.phoneNumber || req.body.phone || '').trim();

    if (!name || !email || !password || !phoneNumber) {
      res.status(400);
      throw new Error('Please provide name, email, password, and phone number');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      if (!userExists.isEmailVerified) {
        if (name) userExists.name = name;
        if (phoneNumber) userExists.phoneNumber = phoneNumber;
        const otpCode = generateOTP();
        userExists.emailVerificationOTP = otpCode;
        userExists.emailVerificationExpires = getOTPExpiry();
        await userExists.save();
        const mailResult = await sendAccountVerificationEmail(email, otpCode, userExists.name);
        return res.status(200).json({
          success: true,
          requiresEmailVerification: true,
          email,
          message: 'Account exists but email is not verified. A new verification code has been sent.',
          mockSent: !!mailResult.mock
        });
      }
      res.status(400);
      throw new Error('An account with this email already exists. Sign in or use a different email.');
    }

    const otpCode = generateOTP();
    const user = await User.create({
      name,
      username: (req.body.username || '').trim().toLowerCase() || undefined,
      email,
      password,
      phoneNumber,
      isEmailVerified: false,
      emailVerificationOTP: otpCode,
      emailVerificationExpires: getOTPExpiry()
    });

    const mailResult = await sendAccountVerificationEmail(email, otpCode, name);

    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      email: user.email,
      message: 'Account created. Please verify your email with the code we sent.',
      mockSent: !!mailResult.mock
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify signup email with OTP
 * @route   POST /api/v1/auth/verify-email
 * @access  Public
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400);
      throw new Error('Please provide your email and verification code');
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationOTP +emailVerificationExpires'
    );
    if (!user) {
      res.status(404);
      throw new Error('No account found for this email');
    }

    if (user.isEmailVerified) {
      await ensureReturningUserOnboarding(user);
      return res.status(200).json({
        success: true,
        message: 'Email is already verified. You can sign in.',
        token: generateToken(user._id),
        user: formatUserResponse(user)
      });
    }

    if (!user.emailVerificationOTP || user.emailVerificationOTP !== String(code).trim()) {
      res.status(400);
      throw new Error('Invalid verification code');
    }

    if (isOTPExpired(user.emailVerificationExpires)) {
      res.status(400);
      throw new Error('Verification code has expired. Request a new one.');
    }

    user.isEmailVerified = true;
    user.emailVerificationOTP = null;
    user.emailVerificationExpires = null;
    await user.save();

    await sendSignupConfirmationEmail(user.email, user.name);
    await sendSMS(
      user.phoneNumber,
      `Welcome to Ride Share, ${user.name}! Your email is verified. Link your student or work domain to unlock trusted carpools.`
    );

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. Welcome to Ride Share!',
      token: generateToken(user._id),
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend signup email verification code
 * @route   POST /api/v1/auth/resend-verification
 * @access  Public
 */
const resendEmailVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Please provide your email address');
    }

    const user = await User.findOne({ email }).select(
      '+emailVerificationOTP +emailVerificationExpires'
    );
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for this email, a verification code has been sent.'
      });
    }

    if (user.isEmailVerified) {
      res.status(400);
      throw new Error('This email is already verified. Please sign in.');
    }

    const otpCode = generateOTP();
    user.emailVerificationOTP = otpCode;
    user.emailVerificationExpires = getOTPExpiry();
    await user.save();

    const mailResult = await sendAccountVerificationEmail(email, otpCode, user.name);

    return res.status(200).json({
      success: true,
      message: 'Verification code sent. Please check your inbox.',
      mockSent: !!mailResult.mock
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate User & Get Token
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error('Please provide an email and password');
    }

    const user = await User.findOne({ email }).select('+password +emailVerificationOTP');
    if (!user || !(await user.matchPassword(password))) {
      res.status(401);
      throw new Error('Invalid credentials');
    }

    // Legacy accounts (before email verification) — no pending OTP stored
    if (!user.isEmailVerified && !user.emailVerificationOTP) {
      user.isEmailVerified = true;
      await user.save();
    }

    if (!user.isEmailVerified) {
      const otpCode = generateOTP();
      user.emailVerificationOTP = otpCode;
      user.emailVerificationExpires = getOTPExpiry();
      await user.save();
      await sendAccountVerificationEmail(email, otpCode, user.name);

      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        email: user.email,
        message: 'Please verify your email before signing in. A new code has been sent.'
      });
    }

    await ensureReturningUserOnboarding(user);

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: formatUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset code
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Please provide your email address');
    }

    const user = await User.findOne({ email }).select(
      '+resetPasswordToken +resetPasswordExpires'
    );

    if (user) {
      const otpCode = generateOTP();
      user.resetPasswordToken = otpCode;
      user.resetPasswordExpires = getOTPExpiry();
      await user.save();
      await sendPasswordResetEmail(email, otpCode, user.name);
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists for this email, a password reset code has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password with OTP code
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400);
      throw new Error('Please provide email, reset code, and new password');
    }

    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('Password must be at least 6 characters');
    }

    const user = await User.findOne({ email }).select(
      '+password +resetPasswordToken +resetPasswordExpires'
    );
    if (!user) {
      res.status(400);
      throw new Error('Invalid reset request');
    }

    if (!user.resetPasswordToken || user.resetPasswordToken !== String(code).trim()) {
      res.status(400);
      throw new Error('Invalid reset code');
    }

    if (isOTPExpired(user.resetPasswordExpires)) {
      res.status(400);
      throw new Error('Reset code has expired. Request a new one.');
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request Trust Domain OTP (edu/corp)
 * @route   POST /api/v1/auth/verify-domain
 * @access  Private
 */
const verifyDomainEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400);
      throw new Error('Please provide an academic or corporate email address');
    }

    const domain = email.split('@')[1];
    if (!domain) {
      res.status(400);
      throw new Error('Invalid email domain format');
    }

    let community = await Community.findOne({ domainName: domain.toLowerCase() });
    if (!community) {
      const orgLabel = domain.split('.')[0].toUpperCase();
      community = await Community.create({
        name: `${orgLabel} Hub`,
        domainName: domain.toLowerCase(),
        type: domain.endsWith('.edu') || domain.includes('.edu.') ? 'UNIVERSITY' : 'CORPORATE'
      });
    }

    const otpCode = generateOTP();
    const expiryTime = getOTPExpiry();

    const user = await User.findById(req.user._id);
    user.verification.otp = otpCode;
    user.verification.otpExpires = expiryTime;
    user.verification.organizationName = community.name;
    user.verification.domainType = community.type;
    await user.save();

    const mailResult = await sendVerificationEmail(email, otpCode, community.name);

    return res.status(200).json({
      success: true,
      message: 'OTP dispatched to your domain email address.',
      mockSent: !!mailResult.mock
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Domain OTP & Confirm Trust Community
 * @route   POST /api/v1/auth/confirm-domain
 * @access  Private
 */
const confirmDomainEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      res.status(400);
      throw new Error('Please input the 6-Digit OTP verification code');
    }

    const user = await User.findById(req.user._id);
    if (!user.verification.otp || user.verification.otp !== String(otp).trim()) {
      res.status(400);
      throw new Error('Invalid verification code input');
    }

    if (isOTPExpired(user.verification.otpExpires)) {
      res.status(400);
      throw new Error('Verification OTP code has expired');
    }

    const community = await Community.findOne({ name: user.verification.organizationName });

    user.verification.domainVerified = true;
    user.verification.otp = null;
    user.verification.otpExpires = null;

    if (community && !user.communities.includes(community._id)) {
      user.communities.push(community._id);
      community.memberCount += 1;
      await community.save();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `Your profile has been linked to '${user.verification.organizationName}' successfully.`,
      user: {
        _id: user._id,
        name: user.name,
        verification: user.verification,
        communities: user.communities
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload KYC Physical Documents (Mock Queue)
 * @route   POST /api/v1/auth/upload-documents
 * @access  Private
 */
const uploadKYCDocuments = async (req, res, next) => {
  try {
    const { documentUrl, cnicUrl, selfieUrl, licenseUrl } = req.body;
    const user = await User.findById(req.user._id);

    const hasIncoming =
      cnicUrl?.trim() || selfieUrl?.trim() || licenseUrl?.trim() || documentUrl?.trim();
    if (!hasIncoming) {
      res.status(400);
      throw new Error('Provide at least one document URL to upload');
    }

    if (cnicUrl?.trim()) user.verification.cnicUrl = cnicUrl.trim();
    if (selfieUrl?.trim()) user.verification.selfieUrl = selfieUrl.trim();
    if (licenseUrl?.trim()) {
      user.verification.licenseUrl = licenseUrl.trim();
      user.verification.documentUrl = licenseUrl.trim();
    }
    if (documentUrl?.trim()) user.verification.documentUrl = documentUrl.trim();

    const { ensureDocumentsFromUrls } = require('../services/userDocumentService');
    await ensureDocumentsFromUrls(user._id, {
      ...(cnicUrl?.trim() ? { cnicUrl: user.verification.cnicUrl } : {}),
      ...(selfieUrl?.trim() ? { selfieUrl: user.verification.selfieUrl } : {}),
      ...(licenseUrl?.trim() ? { licenseUrl: user.verification.licenseUrl } : {})
    });

    user.verification.status = 'PENDING';
    user.verification.rejectionReason = '';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Documents saved. Admin review status set to PENDING.',
      verification: user.verification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate User via Google Auth
 * @route   POST /api/v1/auth/google-login
 * @access  Public
 */
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400);
      throw new Error('Google credential token is missing');
    }

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await response.json();

    if (!response.ok || payload.error_description) {
      res.status(400);
      throw new Error(payload.error_description || 'Invalid Google credential token');
    }

    const clientID =
      process.env.GOOGLE_CLIENT_ID ||
      '914630698844-7hhueg76e6q7auu97j0u54l8qd4aq053.apps.googleusercontent.com';
    if (payload.aud !== clientID) {
      res.status(400);
      throw new Error('Google credential token audience mismatch');
    }

    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: (name || 'Google Commuter').trim(),
        email: email.trim().toLowerCase(),
        password: Math.random().toString(36).slice(-8) + 'Google123!',
        phoneNumber: GOOGLE_PLACEHOLDER_PHONE,
        isPhoneVerified: false,
        isEmailVerified: true,
        onboardingComplete: false,
        profileCompleted: false
      });
      await sendSignupConfirmationEmail(email, user.name);
      console.log(`Created new user via Google Sign-In: ${email}`);
    } else {
      user = await repairGoogleUserRecord(user, name, User);
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        user.emailVerificationOTP = null;
        user.emailVerificationExpires = null;
        try {
          await user.save();
        } catch {
          await User.updateOne(
            { _id: user._id },
            {
              $set: {
                isEmailVerified: true,
                emailVerificationOTP: null,
                emailVerificationExpires: null
              }
            },
            { runValidators: false }
          );
          user = await User.findOne({ email });
        }
      }
      try {
        await ensureReturningUserOnboarding(user);
      } catch {
        await User.updateOne(
          { _id: user._id },
          { $set: { onboardingComplete: true } },
          { runValidators: false }
        );
        user = await User.findOne({ email });
      }
    }

    return res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: formatUserResponse(user),
      requiresProfileCompletion: userNeedsProfileCompletion(user)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendEmailVerification,
  login,
  forgotPassword,
  resetPassword,
  googleLogin,
  verifyDomainEmail,
  confirmDomainEmail,
  uploadKYCDocuments
};

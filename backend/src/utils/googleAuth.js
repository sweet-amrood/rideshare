/** Placeholder until user completes profile after Google sign-up */
const GOOGLE_PLACEHOLDER_PHONE = '+923000000000';

const userNeedsProfileCompletion = (user) => {
  if (!user) return false;
  if (user.profileCompleted === false) return true;
  const phone = String(user.phoneNumber || '').trim();
  const name = String(user.name || '').trim();
  if (!name || name.length < 2) return true;
  if (!phone || phone === GOOGLE_PLACEHOLDER_PHONE) return true;
  return false;
};

const repairGoogleUserRecord = async (user, googleName, User) => {
  let dirty = false;
  if (!String(user.name || '').trim()) {
    user.name = (googleName || 'Google Commuter').trim();
    dirty = true;
  }
  if (!String(user.phoneNumber || '').trim()) {
    user.phoneNumber = GOOGLE_PLACEHOLDER_PHONE;
    dirty = true;
  }
  if (dirty) {
    try {
      await user.save();
    } catch {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            name: user.name,
            phoneNumber: user.phoneNumber || GOOGLE_PLACEHOLDER_PHONE
          }
        },
        { runValidators: false }
      );
    }
  }
  return User.findById(user._id);
};

module.exports = {
  GOOGLE_PLACEHOLDER_PHONE,
  userNeedsProfileCompletion,
  repairGoogleUserRecord
};

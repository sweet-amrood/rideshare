const { AVATAR_PRESETS, PRESET_MAP } = require('../constants/avatars');
const { uploadBuffer } = require('../services/cloudinaryService');
const User = require('../models/User');
const { resolveAvatarUrl } = require('../utils/avatarUrl');
const { sanitizeDriverAvailability } = require('../utils/userGeo');

const listPresets = async (req, res) => {
  return res.json({
    success: true,
    data: AVATAR_PRESETS.map((p) => ({ id: p.id, url: PRESET_MAP[p.id] }))
  });
};

const setAvatar = async (req, res, next) => {
  try {
    const { avatarPreset, clearCustom } = req.body;
    const user = await User.findById(req.user._id);

    if (clearCustom || avatarPreset) {
      user.profile.profilePictureUrl = '';
    }
    if (avatarPreset) {
      if (!PRESET_MAP[avatarPreset]) {
        res.status(400);
        throw new Error('Invalid avatar preset');
      }
      user.profile.avatarPreset = avatarPreset;
    }
    if (req.body.removeAvatar) {
      user.profile.profilePictureUrl = '';
      user.profile.avatarPreset = '';
    }

    sanitizeDriverAvailability(user);
    await user.save();
    return res.json({
      success: true,
      data: {
        avatarPreset: user.profile.avatarPreset,
        profilePictureUrl: user.profile.profilePictureUrl,
        avatarUrl: resolveAvatarUrl(user)
      }
    });
  } catch (e) {
    next(e);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      res.status(400);
      throw new Error('Please attach an image file');
    }
    const user = await User.findById(req.user._id);
    const uploaded = await uploadBuffer(req.file, {
      folder: `rideshare/avatars/${user._id}`,
      publicId: `avatar_${Date.now()}`
    });

    user.profile.profilePictureUrl = uploaded.url;
    user.profile.avatarPreset = '';
    sanitizeDriverAvailability(user);
    await user.save();

    return res.status(201).json({
      success: true,
      data: {
        profilePictureUrl: uploaded.url,
        avatarUrl: uploaded.url
      }
    });
  } catch (e) {
    next(e);
  }
};

module.exports = { listPresets, setAvatar, uploadAvatar };

const { PRESET_MAP } = require('../constants/avatars');

const resolveAvatarUrl = (user) => {
  if (!user) return '';
  const profile = user.profile || user;
  const custom = profile.profilePictureUrl || user.profilePictureUrl || '';
  if (custom) return custom;
  const preset = profile.avatarPreset || user.avatarPreset;
  if (preset && PRESET_MAP[preset]) return PRESET_MAP[preset];
  return '';
};

module.exports = { resolveAvatarUrl };

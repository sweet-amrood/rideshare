/** Consistent default avatar when user has no photo or preset. */
export function getDefaultAvatarUrl(seed = 'rideshare') {
  const s = encodeURIComponent(String(seed).trim() || 'rideshare');
  return `https://api.dicebear.com/7.x/micah/svg?seed=${s}&backgroundColor=4f5ef4,3030d4,272985`;
}

export function getUserAvatarUrl(user) {
  const custom = user?.avatarUrl || user?.profile?.profilePictureUrl;
  if (custom) return custom;
  return getDefaultAvatarUrl(user?.username || user?.name || user?._id || 'user');
}

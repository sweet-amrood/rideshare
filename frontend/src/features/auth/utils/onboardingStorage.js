const PREFIX = 'rideshare_onboarding_complete_';

export const getOnboardingKey = (userId) => `${PREFIX}${userId}`;

export const readOnboardingComplete = (userId) => {
  if (!userId) return false;
  return localStorage.getItem(getOnboardingKey(userId)) === 'true';
};

export const writeOnboardingComplete = (userId) => {
  if (!userId) return;
  localStorage.setItem(getOnboardingKey(userId), 'true');
};

export const clearOnboardingComplete = (userId) => {
  if (!userId) return;
  localStorage.removeItem(getOnboardingKey(userId));
};

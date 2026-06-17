const REQUIRED_DOC_FIELDS = ['cnicUrl', 'selfieUrl', 'licenseUrl'];

const hasDriverDocuments = (verification = {}) =>
  REQUIRED_DOC_FIELDS.every((key) => Boolean(verification[key]?.trim?.()));

/** True only when admin-approved and cleared to offer rides */
const isDriverSetupComplete = (user) => {
  if (!user?.driverApplicant && !user?.roles?.includes('DRIVER')) return true;
  return user.driverSetupComplete === true && user.verification?.status === 'APPROVED';
};

const markDriverSetupComplete = (user) => {
  user.driverSetupComplete = true;
  user.driverApplicant = true;
  if (!user.driverSetup) user.driverSetup = {};
  user.driverSetup.completedAt = new Date();
};

/** Docs uploaded — awaiting admin review; user stays in passenger mode */
const markDriverApplicationSubmitted = (user) => {
  user.driverApplicant = true;
  user.driverApplicationSubmittedAt = new Date();
  user.driverSetupComplete = false;
  if (!user.driverSetup) user.driverSetup = {};
  user.driverSetup.submittedAt = new Date();
};

module.exports = {
  REQUIRED_DOC_FIELDS,
  hasDriverDocuments,
  isDriverSetupComplete,
  markDriverSetupComplete,
  markDriverApplicationSubmitted
};

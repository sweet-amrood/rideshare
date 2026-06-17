export const AUTO_REJECT_BY_TYPE = {
  CNIC: 'CNIC / National ID was rejected: image is unclear, expired, cropped, or details are not readable.',
  SELFIE: 'Selfie was rejected: face is not clearly visible, poorly lit, or does not match the ID document.',
  DRIVING_LICENSE: 'Driving license was rejected: document is invalid, expired, or not clearly visible.',
  DOMAIN: 'Student / Company ID was rejected: affiliation could not be verified from the uploaded file.'
};

export const getAutoRejectReason = (type, label) =>
  AUTO_REJECT_BY_TYPE[type] ||
  `${label || type} was rejected: document did not meet platform verification standards.`;

/** Auto-generated rejection copy per document type */
const AUTO_REJECT_BY_TYPE = {
  CNIC: 'CNIC / National ID was rejected: image is unclear, expired, cropped, or details are not readable.',
  SELFIE: 'Selfie was rejected: face is not clearly visible, poorly lit, or does not match the ID document.',
  DRIVING_LICENSE: 'Driving license was rejected: document is invalid, expired, or not clearly visible.',
  DOMAIN: 'Student / Company ID was rejected: affiliation could not be verified from the uploaded file.',
  PASSPORT: 'Passport was rejected: image quality or document validity could not be confirmed.',
  STUDENT_ID: 'Student ID was rejected: institution or identity details are not verifiable.',
  COMPANY_ID: 'Company ID was rejected: employer details are missing or illegible.',
  VEHICLE_REGISTRATION: 'Vehicle registration was rejected: plate or ownership details are unclear.',
  INSURANCE: 'Insurance document was rejected: policy details are missing or expired.'
};

const getAutoRejectReason = (documentType, label) =>
  AUTO_REJECT_BY_TYPE[documentType] ||
  `${label || documentType} was rejected: document did not meet platform verification standards.`;

const buildCombinedRejectionReason = (rejectedItems) => {
  if (!rejectedItems.length) return '';
  return rejectedItems
    .map((d) => {
      const line = d.rejectionReason || getAutoRejectReason(d.type, d.label);
      return `• ${line}`;
    })
    .join('\n');
};

module.exports = { AUTO_REJECT_BY_TYPE, getAutoRejectReason, buildCombinedRejectionReason };

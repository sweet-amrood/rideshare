/** Apply Cloudinary vehicle media fields onto a Mongoose vehicle payload */
const applyVehicleMediaToPayload = (payload, media = {}) => {
  const photoUrls = (media.photoUrls || []).filter((u) => u?.trim());
  if (photoUrls.length) {
    payload.photoUrls = photoUrls;
    payload.photoPublicIds = media.photoPublicIds || [];
    payload.imageUrl = media.imageUrl?.trim() || photoUrls[0];
  }
  if (media.registrationDocUrl?.trim()) {
    payload.registrationDocUrl = media.registrationDocUrl.trim();
    payload.registrationDocPublicId = media.registrationDocPublicId || '';
  }
  payload.verificationStatus = 'PENDING';
  payload.isVerified = false;
  return payload;
};

const vehicleHasRequiredMedia = (vehicle = {}) => {
  const photos = (vehicle.photoUrls || []).filter((u) => u?.trim());
  const hasPhoto = photos.length > 0 || Boolean(vehicle.imageUrl?.trim());
  const hasReg = Boolean(vehicle.registrationDocUrl?.trim());
  return hasPhoto && hasReg;
};

/** Whether a saved Vehicle document in MongoDB has photos + registration on file */
const vehicleRecordHasRequiredMedia = (record) => {
  if (!record) return false;
  return vehicleHasRequiredMedia({
    photoUrls: record.photoUrls,
    imageUrl: record.imageUrl,
    registrationDocUrl: record.registrationDocUrl
  });
};

const vehicleRecordToSetupPayload = (record) => {
  if (!record) return null;
  const company = record.company || record.make || '';
  return {
    vehicleType: record.vehicleType || 'CAR',
    company,
    model: record.model || '',
    year: record.year || new Date().getFullYear(),
    color: record.color || '—',
    licensePlate: record.licensePlate || '',
    totalSeats: record.totalSeats || 4,
    photoUrls: record.photoUrls || [],
    photoPublicIds: record.photoPublicIds || [],
    registrationDocUrl: record.registrationDocUrl || '',
    registrationDocPublicId: record.registrationDocPublicId || '',
    imageUrl: record.imageUrl || record.photoUrls?.[0] || ''
  };
};

module.exports = {
  applyVehicleMediaToPayload,
  vehicleHasRequiredMedia,
  vehicleRecordHasRequiredMedia,
  vehicleRecordToSetupPayload
};

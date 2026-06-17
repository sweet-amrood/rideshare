import api from '../axios';
import { endpoints } from '../endpoints';

const uploadConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 180000
};

/**
 * Upload vehicle photos + registration card to Cloudinary.
 * @param {{ photos: File[], registration: File|null }} payload
 */
export const uploadVehicleMedia = async ({ photos = [], registration = null }) => {
  const form = new FormData();
  photos.filter(Boolean).forEach((file) => form.append('photos', file));
  if (registration) form.append('registration', registration);

  const { data } = await api.post(endpoints.users.vehicleUploadMedia, form, uploadConfig);
  return data;
};

export const vehicleService = {
  uploadVehicleMedia
};

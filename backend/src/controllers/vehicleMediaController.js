const { uploadVehicleFile } = require('../services/cloudinaryService');

/**
 * POST /api/v1/users/vehicle/upload-media
 * multipart: photos (max 4), registration (max 1)
 */
const uploadVehicleMedia = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const photoFiles = req.files?.photos || [];
    const registrationFile = req.files?.registration?.[0];

    if (!photoFiles.length && !registrationFile) {
      res.status(400);
      throw new Error('Attach at least one vehicle photo or registration document');
    }

    const photoUrls = [];
    const photoPublicIds = [];

    for (let i = 0; i < photoFiles.length; i += 1) {
      const uploaded = await uploadVehicleFile(photoFiles[i], userId, `photo_${i + 1}`);
      photoUrls.push(uploaded.url);
      photoPublicIds.push(uploaded.publicId);
    }

    let registrationDocUrl = '';
    let registrationDocPublicId = '';

    if (registrationFile) {
      const reg = await uploadVehicleFile(registrationFile, userId, 'registration');
      registrationDocUrl = reg.url;
      registrationDocPublicId = reg.publicId;
    }

    return res.status(201).json({
      success: true,
      message: 'Vehicle media uploaded',
      data: {
        photoUrls,
        photoPublicIds,
        registrationDocUrl,
        registrationDocPublicId,
        imageUrl: photoUrls[0] || ''
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadVehicleMedia };

const { cloudinary, isConfigured } = require('../config/cloudinary');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const MIN_BYTES = 512;

/**
 * Upload multer file buffer to Cloudinary (preserves small images; no forced downscale on upload).
 */
const uploadBuffer = async (file, { folder, publicId, resourceType }) => {
  if (!file?.buffer?.length) {
    const err = new Error('No file data received');
    err.statusCode = 400;
    throw err;
  }

  if (file.buffer.length < MIN_BYTES) {
    const err = new Error('File is too small or empty. Choose a clearer photo or PDF.');
    err.statusCode = 400;
    throw err;
  }

  if (!ALLOWED_MIME.includes(file.mimetype)) {
    const err = new Error('Only JPEG, PNG, WebP, GIF, or PDF files are allowed');
    err.statusCode = 400;
    throw err;
  }

  if (!isConfigured()) {
    const err = new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
    );
    err.statusCode = 503;
    throw err;
  }

  const isPdf = file.mimetype === 'application/pdf';
  const resolvedResourceType = resourceType || (isPdf ? 'raw' : 'image');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resolvedResourceType,
        overwrite: true,
        quality: 'auto:good',
        fetch_format: 'auto',
        flags: 'preserve_transparency'
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) {
          return reject(new Error('Cloudinary returned no URL'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          bytes: result.bytes,
          format: result.format,
          width: result.width,
          height: result.height
        });
      }
    );
    uploadStream.end(file.buffer);
  });
};

const uploadDocumentFile = async (file, userId, documentType) => {
  const folder = `rideshare/documents/${userId}`;
  const publicId = `${String(documentType).toLowerCase()}_${Date.now()}`;
  return uploadBuffer(file, { folder, publicId });
};

const uploadVehicleFile = async (file, userId, tag) => {
  const folder = `rideshare/vehicles/${userId}`;
  const publicId = `${String(tag).toLowerCase()}_${Date.now()}`;
  const isPdf = file.mimetype === 'application/pdf';
  return uploadBuffer(file, {
    folder,
    publicId,
    resourceType: isPdf ? 'raw' : 'image'
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId || !isConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.warn('[cloudinary] delete failed:', e.message);
  }
};

module.exports = {
  uploadBuffer,
  uploadDocumentFile,
  uploadVehicleFile,
  deleteFromCloudinary,
  ALLOWED_MIME
};

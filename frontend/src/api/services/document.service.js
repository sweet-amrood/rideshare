import api from '../axios';

const TYPE_MAP = {
  cnic: 'CNIC',
  selfie: 'SELFIE',
  license: 'DRIVING_LICENSE',
  domain: 'DOMAIN'
};

const UPLOAD_TIMEOUT_MS = 180000;

/** URL from POST /documents/upload or upload-batch response */
export const getUploadedFileUrl = (response) => response?.data?.file?.url || null;

const uploadConfig = {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: UPLOAD_TIMEOUT_MS
};

/**
 * Upload a verification file to Cloudinary via the API.
 * @param {File} file
 * @param {'cnic'|'selfie'|'license'|'domain'} kind
 */
export const uploadVerificationDocument = async (file, kind) => {
  const type = TYPE_MAP[kind] || kind.toUpperCase();
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);

  const { data } = await api.post('/documents/upload', form, uploadConfig);
  return data;
};

/**
 * Upload CNIC / selfie / license in one request (avoids multiple 30s client timeouts).
 * @param {{ kind: string, file: File }[]} entries
 */
export const uploadVerificationBatch = async (entries) => {
  const form = new FormData();
  for (const { kind, file } of entries) {
    if (file) form.append(kind, file);
  }

  const { data } = await api.post('/documents/upload-batch', form, uploadConfig);
  return data;
};

export const getMyDocuments = async () => {
  const { data } = await api.get('/documents/me');
  return data;
};

export const prepareResubmit = async () => {
  const { data } = await api.post('/documents/prepare-resubmit');
  return data;
};

export const documentService = {
  uploadVerificationDocument,
  uploadVerificationBatch,
  getMyDocuments,
  prepareResubmit
};

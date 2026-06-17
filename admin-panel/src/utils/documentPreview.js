const PLACEHOLDER_HOSTS = [
  'storage.rideshare.app',
  'cdn.rideshare.app',
  'mock.rideshare.app'
];

export const INVALID_PREVIEW_MESSAGE =
  'This file was saved with a placeholder link (not uploaded to Cloudinary). Ask the user to re-upload the document from the app.';

const getHostname = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/** Legacy mock URLs from early driver setup — host does not exist */
export function isInvalidDocumentUrl(url) {
  if (!url?.trim()) return true;
  const host = getHostname(url.trim());
  if (!host) return true;
  if (PLACEHOLDER_HOSTS.includes(host)) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  return false;
}

export function isPreviewableDocument(doc) {
  const u = doc?.url?.trim();
  if (!u) return false;
  if (/res\.cloudinary\.com/i.test(u)) return true;
  if (doc?.previewable === true) return true;
  if (doc?.previewable === false && isInvalidDocumentUrl(u)) return false;
  return !isInvalidDocumentUrl(u);
}

/**
 * How to render a document URL in the admin preview modal.
 */
export function getDocumentPreviewMode(url, mimeType = '', doc = null) {
  if (!url?.trim()) return 'empty';
  if (/res\.cloudinary\.com/i.test(url) && !/\.pdf(\?|$)/i.test(url) && !/\/raw\/upload\//i.test(url)) {
    return 'image';
  }
  if (doc && doc.previewable === false && isInvalidDocumentUrl(url)) return 'invalid';
  if (isInvalidDocumentUrl(url)) return 'invalid';

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';

  if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(url)) return 'image';
  if (/\.pdf(\?|$)/i.test(url)) return 'pdf';

  if (/\/image\/upload\//i.test(url) && !/\.pdf(\?|$)/i.test(url)) return 'image';
  if (/\/raw\/upload\//i.test(url)) return 'pdf';

  if (/res\.cloudinary\.com/i.test(url)) return 'image';

  return 'embed';
}

/** Cloudinary-friendly URL for in-browser display (scales small uploads for review) */
export function toPreviewUrl(url, { maxWidth = 1200 } = {}) {
  if (!url) return '';
  if (!/res\.cloudinary\.com/i.test(url)) return url;

  if (/\/image\/upload\//i.test(url) && !/\.pdf(\?|$)/i.test(url)) {
    if (url.includes(`w_${maxWidth}`)) return url;
    return url.replace(
      '/upload/',
      `/upload/w_${maxWidth},c_limit,q_auto:good,f_auto/`
    );
  }

  if (/\/raw\/upload\//i.test(url)) return url;

  return url;
}

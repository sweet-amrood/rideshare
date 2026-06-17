/** Hostnames from old mock uploads — not real storage, DNS will fail */
const PLACEHOLDER_HOSTS = [
  'storage.rideshare.app',
  'cdn.rideshare.app',
  'mock.rideshare.app'
];

const isHttpUrl = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

const getHostname = (url) => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/** Legacy / dev placeholder links that were never uploaded to Cloudinary */
const isPlaceholderDocumentUrl = (url) => {
  if (!url?.trim()) return false;
  const host = getHostname(url.trim());
  if (!host) return true;
  if (PLACEHOLDER_HOSTS.includes(host)) return true;
  if (host === 'localhost' || host.endsWith('.local')) return true;
  return false;
};

/** URL we can show in admin preview (Cloudinary or other real HTTPS host) */
const isValidStoredDocumentUrl = (url) => {
  const trimmed = url?.trim();
  if (!trimmed || !isHttpUrl(trimmed)) return false;
  if (isPlaceholderDocumentUrl(trimmed)) return false;
  if (/res\.cloudinary\.com/i.test(trimmed)) return true;
  // Allow other HTTPS hosts that are not placeholders (e.g. future CDN)
  return getHostname(trimmed).length > 0;
};

module.exports = {
  isPlaceholderDocumentUrl,
  isValidStoredDocumentUrl
};

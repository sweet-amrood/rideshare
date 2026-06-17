/** Built-in avatar presets — DiceBear, brand-tinted backgrounds. */
const BRAND_BG = '4f5ef4,3030d4,272985,17174e';

const AVATAR_PRESETS = [
  { id: 'micah-1', style: 'micah', seed: 'rideshare-alpha' },
  { id: 'micah-2', style: 'micah', seed: 'rideshare-beta' },
  { id: 'lorelei-1', style: 'lorelei', seed: 'commuter-lahore' },
  { id: 'lorelei-2', style: 'lorelei', seed: 'campus-ride' },
  { id: 'notionists-1', style: 'notionists', seed: 'driver-pro' },
  { id: 'notionists-2', style: 'notionists', seed: 'rider-calm' },
  { id: 'avataaars-1', style: 'avataaars', seed: 'share-trip-a' },
  { id: 'avataaars-2', style: 'avataaars', seed: 'share-trip-b' },
  { id: 'personas-1', style: 'personas', seed: 'persona-urban' },
  { id: 'thumbs-1', style: 'thumbs', seed: 'thumbs-up-ride' }
];

const presetUrl = (preset) =>
  `https://api.dicebear.com/7.x/${preset.style}/svg?seed=${encodeURIComponent(preset.seed)}&backgroundColor=${BRAND_BG}`;

const PRESET_MAP = Object.fromEntries(
  AVATAR_PRESETS.map((p) => [p.id, presetUrl(p)])
);

module.exports = { AVATAR_PRESETS, PRESET_MAP, presetUrl };

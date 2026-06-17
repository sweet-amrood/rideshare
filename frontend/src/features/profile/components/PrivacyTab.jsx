import { useState } from 'react';
import toast from 'react-hot-toast';
import Switch from '@mui/material/Switch';
import AppButton from '@/components/common/AppButton';
import { profileService } from '@/api/services/profile.service';

const rowSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#4f5ef4' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4f5ef4' }
};

export default function PrivacyTab({ user }) {
  const [privacy, setPrivacy] = useState({
    showPhone: user?.privacy?.showPhone ?? false,
    showEmail: user?.privacy?.showEmail ?? false,
    showBio: user?.privacy?.showBio ?? true,
    showRoutes: user?.privacy?.showRoutes ?? true,
    showRating: user?.privacy?.showRating ?? true,
    profileVisibility: user?.privacy?.profileVisibility || 'COMMUNITY'
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => (e) => setPrivacy({ ...privacy, [key]: e.target.checked });

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileService.updatePrivacy(privacy);
      toast.success('Privacy settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save privacy');
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { key: 'showBio', label: 'Show bio on public profile' },
    { key: 'showRoutes', label: 'Show preferred routes' },
    { key: 'showRating', label: 'Show ratings & reviews' },
    { key: 'showPhone', label: 'Show phone number' },
    { key: 'showEmail', label: 'Show email address' }
  ];

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-white">Privacy settings</h3>
        <p className="text-sm text-white/75 mt-1">Control what other commuters see on your public profile.</p>
      </div>

      <div>
        <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-2">
          Profile visibility
        </label>
        <select
          className="w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-4 py-2 text-white text-sm"
          value={privacy.profileVisibility}
          onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
        >
          <option value="PUBLIC">Public — anyone on Ride Share</option>
          <option value="COMMUNITY">Community — verified circle only</option>
          <option value="PRIVATE">Private — hidden from search</option>
        </select>
      </div>

      <div className="space-y-1 divide-y divide-slateCustom-800">
        {rows.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-3">
            <span className="text-sm text-white/90">{label}</span>
            <Switch checked={privacy[key]} onChange={toggle(key)} sx={rowSx} />
          </div>
        ))}
      </div>

      <AppButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save privacy'}
      </AppButton>
    </div>
  );
}

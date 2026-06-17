import { useState } from 'react';
import toast from 'react-hot-toast';
import AppButton from '@/components/common/AppButton';
import { profileService } from '@/api/services/profile.service';

const labelClass = 'text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1';
const selectClass =
  'w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50 text-sm';

export default function PreferencesTab({ user, onUpdated }) {
  const [prefs, setPrefs] = useState({
    smoking: user?.preferences?.smoking || 'NO',
    music: user?.preferences?.music || 'LOW',
    chat: user?.preferences?.chat || 'FRIENDLY',
    rideNotes: user?.preferences?.rideNotes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await profileService.updateProfile({ preferences: prefs });
      toast.success('Ride preferences updated');
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="glass-panel p-6 rounded-2xl space-y-5 max-w-2xl">
      <h3 className="text-lg font-bold text-white">Passenger preferences</h3>
      <p className="text-sm text-white/75">
        Shown when you book rides as a passenger — smoking, music, and chat expectations.
      </p>

      <div>
        <label className={labelClass}>Smoking</label>
        <select className={selectClass} value={prefs.smoking} onChange={(e) => setPrefs({ ...prefs, smoking: e.target.value })}>
          <option value="NO">No smoking</option>
          <option value="OUTSIDE_ONLY">Outside only</option>
          <option value="FLEXIBLE">Flexible</option>
          <option value="YES">Smoking allowed</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Music</label>
        <select className={selectClass} value={prefs.music} onChange={(e) => setPrefs({ ...prefs, music: e.target.value })}>
          <option value="QUIET">Quiet ride</option>
          <option value="LOW">Low volume</option>
          <option value="CHAT_OK">Music + chat OK</option>
          <option value="ANY">Anything goes</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Chat preference</label>
        <select className={selectClass} value={prefs.chat} onChange={(e) => setPrefs({ ...prefs, chat: e.target.value })}>
          <option value="MINIMAL">Minimal conversation</option>
          <option value="FRIENDLY">Friendly chat</option>
          <option value="WORK_ONLY">Work / focus mode</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>Additional notes</label>
        <textarea
          className={`${selectClass} min-h-[80px]`}
          maxLength={200}
          value={prefs.rideNotes}
          onChange={(e) => setPrefs({ ...prefs, rideNotes: e.target.value })}
          placeholder="AC preferences, luggage, pets..."
        />
      </div>

      <AppButton type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save preferences'}
      </AppButton>
    </form>
  );
}

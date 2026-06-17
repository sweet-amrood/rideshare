import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Trash2 } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import { getDefaultAvatarUrl, getUserAvatarUrl } from '@/utils/defaultAvatar';

export default function AvatarPicker({ user, onUpdated }) {
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(user?.profile?.avatarPreset || '');
  const [previewUrl, setPreviewUrl] = useState(
    user?.avatarUrl || user?.profile?.profilePictureUrl || getDefaultAvatarUrl(user?.name)
  );
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    profileService.getAvatarPresets().then((res) => {
      if (res.success) setPresets(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setPreviewUrl(
      user?.avatarUrl || user?.profile?.profilePictureUrl || getDefaultAvatarUrl(user?.name)
    );
    setSelectedPreset(user?.profile?.avatarPreset || '');
  }, [user]);

  const applyPreset = async (id) => {
    setSaving(true);
    try {
      const res = await profileService.setAvatar({ avatarPreset: id, clearCustom: true });
      setSelectedPreset(id);
      setPreviewUrl(res.data?.avatarUrl || '');
      toast.success('Avatar updated');
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save avatar');
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const res = await profileService.uploadAvatar(file);
      setPreviewUrl(res.data?.avatarUrl || res.data?.profilePictureUrl);
      setSelectedPreset('');
      toast.success('Photo uploaded');
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    setSaving(true);
    try {
      await profileService.setAvatar({ removeAvatar: true });
      const fallback = getDefaultAvatarUrl(user?.name);
      setPreviewUrl(fallback);
      setSelectedPreset('');
      toast.success('Profile picture removed');
      onUpdated?.({ avatarUrl: fallback, profilePictureUrl: '', avatarPreset: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-brand-500/40 bg-brand-500/10 shrink-0">
          <img
            src={previewUrl || getUserAvatarUrl(user)}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30"
          >
            <Camera className="h-4 w-4" />
            Upload photo
          </button>
          {(previewUrl || selectedPreset) && (
            <button
              type="button"
              disabled={saving}
              onClick={removeAvatar}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-300 border border-red-500/30 bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>

      <div>
        <p className="text-[10px] uppercase font-bold text-white/70 tracking-wider mb-2">
          Choose a default avatar
        </p>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={saving}
              onClick={() => applyPreset(p.id)}
              className={`rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                selectedPreset === p.id
                  ? 'border-brand-400 ring-2 ring-brand-400/40'
                  : 'border-slateCustom-600 hover:border-brand-500/50'
              }`}
            >
              <img src={p.url} alt="" className="w-full h-full object-cover bg-slateCustom-800" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import AvatarPicker from '@/features/profile/components/AvatarPicker';
import { profileService } from '@/api/services/profile.service';
import {
  validateEmail,
  validateName,
  validatePhone,
  validateUsername
} from '@/features/auth/utils/validation';
import { filterDigits, filterPersonName, filterUsername, inputHandlers } from '@/utils/inputFilters';

const labelClass = 'text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1';
const inputClass =
  'w-full bg-transparent border-2 border-brand-500/35 rounded-lg px-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500 text-sm';

const GENDERS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'NON_BINARY', label: 'Non-binary' },
  { value: 'OTHER', label: 'Other' }
];

export default function ProfileEditTab({ user, onUpdated }) {
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [username, setUsername] = useState(user?.username || '');
  const [accountErrors, setAccountErrors] = useState({});
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [gender, setGender] = useState(user?.profile?.gender || '');
  const [universityOrCompany, setUniversityOrCompany] = useState(user?.profile?.universityOrCompany || '');
  const [routes, setRoutes] = useState(user?.profile?.preferredRoutes || []);
  const [emergency, setEmergency] = useState({
    name: user?.emergencyContact?.name || '',
    phone: user?.emergencyContact?.phone || '',
    relationship: user?.emergencyContact?.relationship || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.name || '');
    setEmail(user?.email || '');
    setPhoneNumber(user?.phoneNumber || '');
    setUsername(user?.username || '');
    setBio(user?.profile?.bio || '');
    setGender(user?.profile?.gender || '');
    setUniversityOrCompany(user?.profile?.universityOrCompany || '');
    setRoutes(user?.profile?.preferredRoutes || []);
    setEmergency({
      name: user?.emergencyContact?.name || '',
      phone: user?.emergencyContact?.phone || '',
      relationship: user?.emergencyContact?.relationship || ''
    });
  }, [user?._id, user?.name, user?.email, user?.phoneNumber]);

  const addRoute = () => {
    setRoutes([...routes, { label: '', originAddress: '', destinationAddress: '' }]);
  };

  const updateRoute = (index, field, value) => {
    const next = [...routes];
    next[index] = { ...next[index], [field]: value };
    setRoutes(next);
  };

  const removeRoute = (index) => {
    setRoutes(routes.filter((_, i) => i !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phoneNumber.trim();
    const errs = {
      name: validateName(trimmedName),
      email: validateEmail(trimmedEmail),
      phone: validatePhone(trimmedPhone),
      username: validateUsername(username)
    };
    setAccountErrors(errs);
    if (errs.name || errs.email || errs.phone || errs.username) return;

    setSaving(true);
    try {
      const res = await profileService.updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
        username: username.trim(),
        profile: {
          bio,
          gender,
          universityOrCompany,
          preferredRoutes: routes.filter((r) => r.originAddress && r.destinationAddress)
        },
        emergencyContact: emergency
      });
      toast.success('Profile saved');
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white">Account</h3>
        <p className="text-xs text-white/60">
          Switch Passenger / Driver from the sidebar menu. Changing email or phone may require re-verification.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Full name</label>
            <input
              className={inputClass}
              value={fullName}
              {...inputHandlers.personName(setFullName)}
              autoComplete="name"
            />
            {accountErrors.name && <p className="text-xs text-red-400 mt-1">{accountErrors.name}</p>}
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {accountErrors.email && <p className="text-xs text-red-400 mt-1">{accountErrors.email}</p>}
            {user?.isEmailVerified === false && (
              <p className="text-[10px] text-amber-300/90 mt-1">Email not verified</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Mobile number</label>
            <input
              type="tel"
              className={inputClass}
              value={phoneNumber}
              {...inputHandlers.digitsOnly(setPhoneNumber)}
              placeholder="923001234567"
              autoComplete="tel"
            />
            {accountErrors.phone && <p className="text-xs text-red-400 mt-1">{accountErrors.phone}</p>}
            {user?.isPhoneVerified === false && phoneNumber && (
              <p className="text-[10px] text-amber-300/90 mt-1">Phone not verified — use Verification tab</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Username (optional)</label>
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-handle"
              autoComplete="username"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white">About you</h3>
        <AvatarPicker
          user={user}
          onUpdated={(data) => onUpdated?.({ user: { ...user, profile: { ...user?.profile, ...data }, avatarUrl: data.avatarUrl } })}
        />
        <div>
          <label className={labelClass}>Bio</label>
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell commuters about yourself..."
          />
          <p className="text-[10px] text-white/50 mt-1">{bio.length}/500</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Gender</label>
            <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>University / Company</label>
            <input
              className={inputClass}
              value={universityOrCompany}
              onChange={(e) => setUniversityOrCompany(e.target.value)}
              placeholder="FAST NUCES, Tech Corp..."
            />
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Preferred routes</h3>
          <button type="button" onClick={addRoute} className="text-brand-400 text-sm font-semibold flex items-center gap-1 border-0 bg-transparent outline-none">
            <Plus className="h-4 w-4" /> Add route
          </button>
        </div>
        {routes.length === 0 && <p className="text-sm text-white/70">Add daily commute routes to match better carpools.</p>}
        {routes.map((route, i) => (
          <div key={i} className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/25 space-y-3">
            <div className="flex justify-between">
              <input
                className={inputClass}
                placeholder="Route label (e.g. Morning commute)"
                value={route.label}
                onChange={(e) => updateRoute(i, 'label', e.target.value)}
              />
              <button type="button" onClick={() => removeRoute(i)} className="ml-2 text-red-400 border-0 bg-transparent">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <input
              className={inputClass}
              placeholder="From"
              value={route.originAddress}
              onChange={(e) => updateRoute(i, 'originAddress', e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="To"
              value={route.destinationAddress}
              onChange={(e) => updateRoute(i, 'destinationAddress', e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white">Emergency contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              className={inputClass}
              value={emergency.name}
              onChange={(e) =>
                setEmergency({ ...emergency, name: filterPersonName(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              className={inputClass}
              value={emergency.phone}
              onChange={(e) =>
                setEmergency({ ...emergency, phone: filterDigits(e.target.value) })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Relationship</label>
            <input className={inputClass} value={emergency.relationship} onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <AppButton type="submit" disabled={saving} size="md">
          {saving ? 'Saving...' : 'Save profile'}
        </AppButton>
      </div>
    </form>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import { profileService } from '@/api/services/profile.service';
import ProfileHeader from '../components/ProfileHeader';
import ProfileEditTab from '../components/ProfileEditTab';
import PreferencesTab from '../components/PreferencesTab';
import PrivacyTab from '../components/PrivacyTab';
import ReviewsTab from '../components/ReviewsTab';
import VerificationTab from '../components/VerificationTab';
import VehiclesTab from '../components/VehiclesTab';

const tabBtnClass = (active) =>
  `shrink-0 pb-3 px-1 font-bold text-sm transition-all border-b-2 cursor-pointer bg-transparent border-0 outline-none whitespace-nowrap ${
    active ? 'border-brand-500 text-white' : 'border-transparent text-white/75 hover:text-white'
  }`;

function TabGroup({ label, tabs, activeTab, onSelect, vehiclesCount }) {
  if (!tabs.length) return null;
  return (
    <div className="flex items-end gap-4 sm:gap-5">
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 pb-3 shrink-0 hidden sm:inline">
          {label}
        </span>
      )}
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t.id)} className={tabBtnClass(activeTab === t.id)}>
          {t.label}
          {t.id === 'vehicles' && vehiclesCount != null ? ` (${vehiclesCount})` : ''}
        </button>
      ))}
    </div>
  );
}

export default function ProfileHubPage() {
  const { user: authUser, setUser } = useAuth();
  const { profileTabs, isRider, isDriver } = useRoles();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'about');
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [architecture, setArchitecture] = useState(null);
  const [avatarPrompt, setAvatarPrompt] = useState(false);

  const visibleIds = profileTabs.map((t) => t.id);
  const accountTabs = profileTabs.filter((t) => t.group === 'account');
  const passengerTabs = profileTabs.filter((t) => t.group === 'passenger');
  const driverTabs = profileTabs.filter((t) => t.group === 'driver');

  useEffect(() => {
    if (!visibleIds.includes(activeTab)) setActiveTab('about');
  }, [visibleIds.join(','), activeTab]);

  const loadingRef = useRef(false);

  const loadProfile = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await profileService.getMyProfile();
      if (res.success) {
        setProfileUser(res.data.user);
        setVehicles(res.data.vehicles || []);
        setReviews(res.data.reviews || []);
        setArchitecture(res.data.verificationArchitecture);
        setUser({
          name: res.data.user.name,
          email: res.data.user.email,
          phoneNumber: res.data.user.phoneNumber,
          username: res.data.user.username,
          roles: res.data.user.roles,
          driverSetupComplete: res.data.user.driverSetupComplete,
          profile: res.data.user.profile,
          preferences: res.data.user.preferences,
          privacy: res.data.user.privacy,
          emergencyContact: res.data.user.emergencyContact,
          rating: res.data.user.rating,
          badges: res.data.user.badges,
          trustScore: res.data.user.trustScore,
          verification: res.data.user.verification
        });
      }
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') {
        console.error(err);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [setUser]);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; reload via handlers only
  }, []);

  const handleProfileUpdated = (payload) => {
    if (payload?.vehicles) setVehicles(payload.vehicles);
    const u = payload?.user || (payload?._id ? payload : null);
    if (u) {
      setProfileUser((prev) => ({
        ...prev,
        ...u,
        badges: u.badges ?? prev?.badges,
        trustScore: u.trustScore ?? prev?.trustScore
      }));
      setUser({
        name: u.name,
        email: u.email,
        phoneNumber: u.phoneNumber,
        username: u.username,
        roles: u.roles,
        driverSetupComplete: u.driverSetupComplete,
        profile: u.profile,
        preferences: u.preferences,
        emergencyContact: u.emergencyContact,
        badges: u.badges,
        trustScore: u.trustScore
      });
    } else {
      loadProfile();
    }
  };

  const displayUser = profileUser || authUser;

  if (loading && !displayUser) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center text-white/80 text-sm">Loading profile...</div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <User className="h-7 w-7 text-brand-400" />
          My profile
        </h1>
        <p className="text-sm text-white/80">
          Account details, preferences, and verification
          {isRider && !isDriver && ' · passenger tabs below'}
          {isDriver && !isRider && ' · driver tabs below'}
        </p>
      </div>

      <ProfileHeader
        user={displayUser}
        onEditAvatar={() => {
          setActiveTab('about');
          setAvatarPrompt(true);
        }}
      />

      {avatarPrompt && activeTab === 'about' && (
        <p className="text-xs text-brand-300 bg-brand-500/10 border border-brand-500/20 px-3 py-2 rounded-lg">
          Update your profile picture URL in the About tab below.
        </p>
      )}

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex border-b border-slateCustom-800 gap-2 sm:gap-4 min-w-max items-end">
          <TabGroup tabs={accountTabs} activeTab={activeTab} onSelect={setActiveTab} />
          <TabGroup
            label="Passenger"
            tabs={passengerTabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
          <TabGroup
            label="Driver"
            tabs={driverTabs}
            activeTab={activeTab}
            onSelect={setActiveTab}
            vehiclesCount={vehicles.length}
          />
        </div>
      </div>

      {activeTab === 'about' && <ProfileEditTab user={displayUser} onUpdated={handleProfileUpdated} />}
      {activeTab === 'preferences' && isRider && (
        <PreferencesTab user={displayUser} onUpdated={handleProfileUpdated} />
      )}
      {activeTab === 'privacy' && <PrivacyTab user={displayUser} />}
      {activeTab === 'reviews' && <ReviewsTab reviews={reviews} rating={displayUser?.rating} />}
      {activeTab === 'verification' && (
        <VerificationTab
          user={displayUser}
          architecture={architecture}
          onGoToAbout={() => setActiveTab('about')}
          onVerificationUpdated={loadProfile}
        />
      )}
      {activeTab === 'vehicles' && isDriver && (
        <VehiclesTab
          vehicles={vehicles}
          onRefresh={async () => {
            await loadProfile();
          }}
        />
      )}
    </div>
  );
}

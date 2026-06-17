import VerificationBadges from './VerificationBadges';
import { getUserAvatarUrl } from '@/utils/defaultAvatar';

export default function ProfileHeader({ user, onEditAvatar }) {
  const pic = getUserAvatarUrl(user);
  const rating = user?.rating || { average: 5, count: 0 };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row gap-6 items-start sm:items-center">
      <div className="relative shrink-0">
        <div className="h-24 w-24 rounded-2xl overflow-hidden bg-brand-500/15 border border-brand-500/30">
          <img src={pic} alt={user?.name} className="h-full w-full object-cover" />
        </div>
        <button
          type="button"
          onClick={onEditAvatar}
          className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-md border-0 outline-none"
        >
          Edit
        </button>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <h2 className="text-2xl font-extrabold text-white truncate">{user?.name}</h2>
        <p className="text-sm text-white/80">
          {user?.profile?.universityOrCompany || user?.verification?.organizationName || 'Add your university or company'}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/75">
          <span>
            ★ {rating.average?.toFixed(1)} ({rating.count} reviews)
          </span>
          {user?.profile?.gender && (
            <span className="capitalize">{user.profile.gender.replace(/_/g, ' ').toLowerCase()}</span>
          )}
        </div>
        <VerificationBadges badges={user?.badges} trustScore={user?.trustScore} compact />
      </div>
    </div>
  );
}

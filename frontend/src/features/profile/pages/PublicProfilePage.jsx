import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { profileService } from '@/api/services/profile.service';
import VerificationBadges from '../components/VerificationBadges';
import ReviewsTab from '../components/ReviewsTab';

export default function PublicProfilePage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;
    profileService
      .getPublicProfile(userId)
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .catch((err) => setError(err.response?.data?.message || 'Profile not found'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="max-w-3xl mx-auto py-20 text-center text-white/80 text-sm">Loading...</div>;
  }

  if (error || !data?.user) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center space-y-4">
        <p className="text-white/80">{error || 'User not found'}</p>
        <Link to="/dashboard" className="text-brand-400 text-sm font-semibold no-underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const u = data.user;
  const pic = u.profilePictureUrl || u.profile?.profilePictureUrl;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white no-underline">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row gap-6">
        <div className="h-20 w-20 rounded-2xl overflow-hidden bg-brand-500/15 flex items-center justify-center shrink-0">
          {pic ? (
            <img src={pic} alt={u.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-brand-400">{u.name?.[0]}</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <h1 className="text-2xl font-extrabold text-white">{u.name}</h1>
          {u.universityOrCompany && <p className="text-sm text-white/80">{u.universityOrCompany}</p>}
          {u.bio && <p className="text-sm text-white/85">{u.bio}</p>}
          <div className="flex items-center gap-2 text-sm text-amber-400 font-bold">
            <Star className="h-4 w-4 fill-amber-400" />
            {u.rating?.average?.toFixed(1)} ({u.rating?.count || 0} reviews)
          </div>
          <VerificationBadges badges={u.badges} trustScore={u.trustScore} compact />
        </div>
      </div>

      {u.preferredRoutes?.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Preferred routes</h2>
          {u.preferredRoutes.map((r, i) => (
            <div key={i} className="text-sm text-white/85 p-3 rounded-lg bg-slateCustom-800/50">
              {r.label && <span className="font-bold text-white block">{r.label}</span>}
              {r.originAddress} → {r.destinationAddress}
            </div>
          ))}
        </div>
      )}

      {(u.preferences || u.smoking) && (
        <div className="glass-panel p-6 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-[10px] uppercase text-white/60 font-bold">Smoking</span>
            <p className="text-white mt-1">{u.preferences?.smoking || '—'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-white/60 font-bold">Music</span>
            <p className="text-white mt-1">{u.preferences?.music || '—'}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-white/60 font-bold">Chat</span>
            <p className="text-white mt-1">{u.preferences?.chat || '—'}</p>
          </div>
        </div>
      )}

      <ReviewsTab reviews={data.reviews || []} rating={u.rating} />
    </div>
  );
}

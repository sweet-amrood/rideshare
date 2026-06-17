import { HiOutlineShieldCheck, HiOutlineBadgeCheck, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';

const BADGE_CONFIG = [
  { key: 'emailVerified', label: 'Email', icon: HiOutlineMail, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { key: 'phoneVerified', label: 'Phone', icon: HiOutlinePhone, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { key: 'kycApproved', label: 'KYC', icon: HiOutlineShieldCheck, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  { key: 'trustedRider', label: 'Trusted Rider', icon: HiOutlineBadgeCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
];

export default function VerificationBadges({ badges = {}, trustScore = 0, compact = false }) {
  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Trust score</span>
          <span className="text-lg font-extrabold text-brand-400">{trustScore}/100</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {BADGE_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const active = badges[key];
          return (
            <span
              key={key}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                active ? color : 'text-white/40 bg-slateCustom-800/50 border-slateCustom-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

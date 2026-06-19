import { useNavigate } from 'react-router-dom';
import { Car, Globe, Ticket, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { paths } from '@/app/router/paths';
import useUserMode from '@/hooks/useUserMode';

const cardMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 }
};

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const { setMode, USER_MODES } = useUserMode();

  const chooseApp = () => {
    setMode(USER_MODES.APP);
    navigate(paths.app, { replace: true });
  };

  const chooseWebsite = () => {
    setMode(USER_MODES.WEBSITE);
    navigate(paths.home, { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8 text-center">
        <motion.div {...cardMotion} transition={{ duration: 0.35 }} className="space-y-3">
          <div
            className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center shadow-glow"
            style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}
          >
            <Car className="h-7 w-7 text-white" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-400">
            Welcome to Ride Share
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Continue as</h1>
          <p className="text-sm text-white/50 max-w-sm mx-auto leading-relaxed">
            Choose how you want to use Ride Share. You can change this anytime from the menu or
            settings.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4">
          <motion.button
            type="button"
            onClick={chooseApp}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.3 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card rounded-2xl p-6 text-left border border-brand-500/30 hover:border-brand-500/50 transition-colors cursor-pointer group"
          >
            <div className="h-11 w-11 rounded-xl bg-brand-500/20 flex items-center justify-center mb-4 group-hover:bg-brand-500/30 transition-colors">
              <Ticket className="h-5 w-5 text-brand-300" />
            </div>
            <h2 className="font-bold text-white text-base mb-1">Passenger / Driver app</h2>
            <p className="text-xs text-white/50 leading-relaxed mb-3">
              Book rides, manage carpools, driver hub, and live trip tools.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300">
              <Users className="h-3.5 w-3.5" />
              Open app →
            </span>
          </motion.button>

          <motion.button
            type="button"
            onClick={chooseWebsite}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14, duration: 0.3 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="glass-card rounded-2xl p-6 text-left border border-white/10 hover:border-white/20 transition-colors cursor-pointer group"
          >
            <div className="h-11 w-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
              <Globe className="h-5 w-5 text-white/70" />
            </div>
            <h2 className="font-bold text-white text-base mb-1">Explore website</h2>
            <p className="text-xs text-white/50 leading-relaxed mb-3">
              Learn about Ride Share, features, and how verified commuting works.
            </p>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 group-hover:text-white/80">
              View site →
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

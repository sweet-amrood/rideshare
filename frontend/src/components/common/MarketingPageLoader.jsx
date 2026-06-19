import { motion } from 'framer-motion';
import { Car } from 'lucide-react';

/** Inline loader for marketing route transitions and lazy chunks. */
export default function MarketingPageLoader({ message = 'Loading page…' }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="orb orb-brand w-72 h-72 -top-20 -left-20 opacity-20 animate-pulse-glow absolute pointer-events-none" />
      <div className="orb orb-violet w-56 h-56 bottom-0 right-0 opacity-15 animate-pulse-glow absolute pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        <div className="relative flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
            className="absolute h-16 w-16 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#4f5ef4',
              borderRightColor: 'rgba(79,94,244,0.25)'
            }}
          />
          <div
            className="relative h-11 w-11 rounded-xl flex items-center justify-center shadow-glow"
            style={{ background: 'linear-gradient(135deg, #4f5ef4 0%, #7c3aed 100%)' }}
          >
            <Car className="h-5 w-5 text-white" />
          </div>
        </div>

        <div className="text-center space-y-1.5">
          <p className="text-sm font-semibold text-white/80">{message}</p>
          <motion.div
            className="mx-auto h-0.5 w-24 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full shimmer"
              style={{ background: 'linear-gradient(90deg, #4f5ef4, #8b5cf6, #4f5ef4)', width: '100%' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

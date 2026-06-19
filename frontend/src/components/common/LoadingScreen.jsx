import { motion } from 'framer-motion';
import { Car } from 'lucide-react';
import { env } from '@/config/env';

export default function LoadingScreen({
  message = 'Initializing Carpool Engine...',
  fullscreen = false
}) {
  const rootClass = fullscreen
    ? 'fixed inset-0 z-[60] flex h-screen items-center justify-center bg-slateCustom-900 overflow-hidden'
    : 'flex h-screen items-center justify-center bg-slateCustom-900 overflow-hidden relative';

  return (
    <div className={rootClass}>
      {/* Ambient orbs */}
      <div className="orb orb-brand w-[600px] h-[600px] -top-48 -left-48 opacity-25 animate-pulse-glow" />
      <div className="orb orb-violet w-[400px] h-[400px] bottom-0 right-0 opacity-20 animate-pulse-glow" style={{ animationDelay: '1s' }} />
      <div className="orb orb-cyan w-[300px] h-[300px] top-1/3 right-1/4 opacity-15 animate-pulse-glow" style={{ animationDelay: '0.5s' }} />

      <div className="bg-dots absolute inset-0 opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8"
      >
        {/* Icon with orbiting ring */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute h-24 w-24 rounded-full opacity-30 animate-pulse"
            style={{ background: 'radial-gradient(circle, rgba(79,94,244,0.6), transparent 70%)' }} />

          {/* Spinning ring */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
            className="absolute h-20 w-20 rounded-full"
            style={{
              border: '2px solid transparent',
              borderTopColor: '#4f5ef4',
              borderRightColor: 'rgba(79,94,244,0.3)'
            }}
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'linear' }}
            className="absolute h-28 w-28 rounded-full"
            style={{
              border: '1px solid transparent',
              borderBottomColor: '#8b5cf6',
              borderLeftColor: 'rgba(139,92,246,0.2)'
            }}
          />

          {/* Center icon */}
          <div className="relative h-14 w-14 rounded-2xl flex items-center justify-center shadow-glow"
            style={{ background: 'linear-gradient(135deg, #4f5ef4 0%, #7c3aed 100%)' }}>
            <Car className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Brand text */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-extrabold tracking-wider"
          >
            <span className="gradient-text">RIDE SHARE</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/50 text-sm font-medium"
          >
            {message}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="section-label"
          >
            {env.appName}
          </motion.p>
        </div>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 180 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative h-0.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full shimmer"
            style={{ background: 'linear-gradient(90deg, #4f5ef4, #8b5cf6, #4f5ef4)', width: '100%' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

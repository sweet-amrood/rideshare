import { motion } from 'framer-motion';
import { FiLoader } from 'react-icons/fi';
import { env } from '@/config/env';

export default function LoadingScreen({ message = 'Initializing Carpool Engine...' }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slateCustom-900">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <FiLoader className="h-12 w-12 text-brand-500" />
        </motion.div>
        <p className="text-slate-400 font-medium">{message}</p>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{env.appName}</p>
      </motion.div>
    </div>
  );
}

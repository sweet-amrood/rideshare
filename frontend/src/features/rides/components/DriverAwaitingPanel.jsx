import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function DriverAwaitingPanel({ respondBy, action, counterFare, onExpired }) {
  const end = respondBy ? new Date(respondBy).getTime() : Date.now() + 15000;
  const [left, setLeft] = useState(Math.max(0, end - Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const rem = Math.max(0, end - Date.now());
      setLeft(rem);
      if (rem <= 0) onExpired?.();
    }, 200);
    return () => clearInterval(id);
  }, [end, onExpired]);

  const pct = (left / 15000) * 100;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
      <div className="h-1 rounded-full bg-slateCustom-800 mb-3 overflow-hidden">
        <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm font-bold text-amber-200 flex items-center gap-2">
        <Clock className="h-4 w-4 animate-pulse" />
        Waiting for passenger ({Math.ceil(left / 1000)}s)
      </p>
      <p className="text-xs text-white/60 mt-1">
        {action === 'COUNTER'
          ? `Your counter offer Rs.${counterFare} was sent.`
          : 'Your acceptance was sent at the passenger fare.'}
      </p>
    </div>
  );
}

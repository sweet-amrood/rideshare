import { useEffect, useState } from 'react';
import { Users, Loader2, RefreshCw } from 'lucide-react';
import { bookingService } from '@/api/services/booking.service';

export default function LiveSeatTracker({ rideId, refreshKey = 0, compact = false }) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!rideId) return;
    setLoading(true);
    try {
      const res = await bookingService.getLiveSeats(rideId);
      setSnapshot(res.data);
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [rideId, refreshKey]);

  if (loading && !snapshot) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/60">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Syncing seats…
      </div>
    );
  }

  if (!snapshot) return null;

  const barPct =
    snapshot.totalSeats > 0
      ? Math.round((snapshot.bookedSeats / snapshot.totalSeats) * 100)
      : 0;

  if (compact) {
    return (
      <p className="text-xs text-white/75 flex items-center gap-1.5">
        <Users className="h-3.5 w-3.5 text-emerald-400" />
        <strong className="text-emerald-300">{snapshot.effectiveAvailable}</strong> of{' '}
        {snapshot.totalSeats} seats free
        {snapshot.pendingSeats > 0 && (
          <span className="text-amber-400/90">({snapshot.pendingSeats} pending)</span>
        )}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-brand-500/25 bg-slateCustom-800/50 p-3 space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> Live seats
        </span>
        <button
          type="button"
          onClick={load}
          className="text-white/50 hover:text-white border-0 bg-transparent p-0"
          aria-label="Refresh seats"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-2 rounded-full bg-slateCustom-700 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${barPct}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <div>
          <p className="text-white/50">Booked</p>
          <p className="font-bold text-white">{snapshot.bookedSeats}</p>
        </div>
        <div>
          <p className="text-white/50">Available</p>
          <p className="font-bold text-emerald-300">{snapshot.effectiveAvailable}</p>
        </div>
        <div>
          <p className="text-white/50">Pending</p>
          <p className="font-bold text-amber-300">{snapshot.pendingSeats}</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Flag, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService } from '@/api/services/booking.service';
import LiveSeatTracker from './LiveSeatTracker';

export default function CompleteRidePanel({ ride, onCompleted }) {
  const [loading, setLoading] = useState(false);

  if (!ride || ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    return null;
  }

  const handleComplete = async () => {
    if (!window.confirm('Mark this ride as completed? Confirmed bookings will close.')) return;
    setLoading(true);
    try {
      const res = await bookingService.completeRide(ride._id);
      toast.success(res.message || 'Ride completed');
      onCompleted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not complete ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 space-y-3">
      <p className="text-sm font-semibold text-white flex items-center gap-2">
        <Flag className="h-4 w-4 text-emerald-400" />
        Ride completion
      </p>
      <p className="text-xs text-white/60">
        Completes the trip, marks confirmed passengers as done, and cancels pending requests.
      </p>
      <LiveSeatTracker rideId={ride._id} compact />
      <button
        type="button"
        disabled={loading}
        onClick={handleComplete}
        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark ride complete'}
      </button>
    </div>
  );
}

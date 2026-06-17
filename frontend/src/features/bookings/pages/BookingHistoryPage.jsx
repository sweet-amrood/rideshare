import { useCallback, useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService } from '@/api/services/booking.service';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { HISTORY_FILTERS } from '../constants';
import BookingCard from '../components/BookingCard';
import RideRequestHistoryCard from '../components/RideRequestHistoryCard';

export default function BookingHistoryPage() {
  const [items, setItems] = useState([]);
  const [rideRequests, setRideRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, rideRes] = await Promise.all([
        bookingService.getHistory({
          role: 'passenger',
          status: statusFilter || undefined,
          limit: 50
        }),
        rideRequestService.getHistory({
          status: statusFilter || undefined,
          limit: 50
        })
      ]);
      setItems(bookingRes.items || []);
      setTotal((bookingRes.total || 0) + (rideRes.data?.total || 0));
      setRideRequests(rideRes.success ? rideRes.data?.items || [] : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load history');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Passenger</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 mt-1">
          <History className="w-7 h-7 text-brand-400" />
          Booking history
        </h1>
        <p className="text-sm text-white/75 mt-2">
          Carpool seat bookings and on-demand rides (bike/car).
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {HISTORY_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              statusFilter === f.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-slateCustom-600 text-white/70 hover:border-brand-500/40'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/50">{total} booking(s)</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        </div>
      ) : items.length === 0 && rideRequests.length === 0 ? (
        <div className="glass-panel p-10 rounded-2xl text-center text-white/70">
          No trips match this filter.
        </div>
      ) : (
        <div className="space-y-6">
          {rideRequests.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                On-demand rides
              </h2>
              {rideRequests.map((r) => (
                <RideRequestHistoryCard key={r._id} ride={r} />
              ))}
            </section>
          )}
          {items.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wide">
                Carpool bookings
              </h2>
              {items.map((b) => (
                <BookingCard key={b._id} booking={b} onRefresh={load} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

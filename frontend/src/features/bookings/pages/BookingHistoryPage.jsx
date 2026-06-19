import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService } from '@/api/services/booking.service';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { HISTORY_FILTERS } from '../constants';
import BookingCard from '../components/BookingCard';
import RideRequestHistoryCard from '../components/RideRequestHistoryCard';
import { StaggerList, StaggerItem } from '@/components/animations/StaggerList';
import EmptyState from '@/components/animations/EmptyState';
import { SkeletonCard } from '@/components/animations/Skeleton';
import { springGentle } from '@/animations/motionConfig';

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
            className={`relative px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              statusFilter === f.value
                ? 'bg-brand-500 text-white border-brand-500'
                : 'border-slateCustom-600 text-white/70 hover:border-brand-500/40'
            }`}
          >
            {f.label}
            {statusFilter === f.value && (
              <motion.div
                layoutId="history-filter-pill"
                className="absolute inset-0 rounded-full bg-brand-500 border border-brand-500 -z-10"
                transition={springGentle}
              />
            )}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/50">{total} booking(s)</p>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 && rideRequests.length === 0 ? (
        <EmptyState
          icon={History}
          title="No trips match this filter"
          description="Try a different status filter or book a new ride."
        />
      ) : (
        <div className="space-y-6">
          {rideRequests.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
                On-demand rides
              </h2>
              <StaggerList>
                <AnimatePresence mode="popLayout">
                {rideRequests.map((r) => (
                  <StaggerItem key={r._id} layout>
                    <RideRequestHistoryCard ride={r} />
                  </StaggerItem>
                ))}
                </AnimatePresence>
              </StaggerList>
            </section>
          )}
          {items.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-brand-400 uppercase tracking-wide">
                Carpool bookings
              </h2>
              <StaggerList>
                <AnimatePresence mode="popLayout">
                {items.map((b) => (
                  <StaggerItem key={b._id} layout>
                    <BookingCard booking={b} onRefresh={load} />
                  </StaggerItem>
                ))}
                </AnimatePresence>
              </StaggerList>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

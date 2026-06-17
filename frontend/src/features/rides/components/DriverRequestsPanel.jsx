import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  User,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Inbox,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { bookingService } from '@/api/services/booking.service';
import { getVehicleTypeLabel } from '../constants/searchByVehicleType';
import AppButton from '@/components/common/AppButton';
import LocationLabel from '@/components/common/LocationLabel';
import { useActiveTrip } from '@/hooks/useActiveTrip';

export default function DriverRequestsPanel({ onCountChange, onBookingChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const { commitment, isBusy } = useActiveTrip({ asDriver: true });
  const onDemandBusy =
    commitment?.kind === 'RIDE_REQUEST' &&
    ['ACCEPTED', 'IN_PROGRESS'].includes(commitment.data?.status);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingService.getIncomingRequests();
      const list = res.data || [];
      setRequests(list);
      onCountChange?.(list.length);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load requests');
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const respond = async (bookingId, status) => {
    setActingId(bookingId);
    try {
      const res = await bookingService.updateStatus(bookingId, status);
      toast.success(res.message || (status === 'CONFIRMED' ? 'Accepted' : 'Declined'));
      await load();
      onBookingChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 flex justify-center border border-emerald-500/20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!requests.length) {
    return (
      <div className="glass-panel rounded-2xl p-10 text-center border border-emerald-500/20">
        <Inbox className="h-12 w-12 text-emerald-400/50 mx-auto mb-3" />
        <p className="font-semibold text-white">No pending requests</p>
        <p className="text-sm text-white/60 mt-2 max-w-sm mx-auto">
          When passengers book a seat on your published rides, you can accept or decline them
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onDemandBusy && (
        <div className="flex gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          Finish your on-demand ride before accepting carpool bookings.
        </div>
      )}
      {requests.map((b) => {
        const ride = b.rideId;
        const passenger = b.passengerId;
        const busy = actingId === b._id;

        return (
          <article
            key={b._id}
            className="glass-panel p-5 rounded-2xl border-l-4 border-l-amber-400 border border-emerald-500/15 space-y-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-300">
                  {passenger?.name?.[0] || 'P'}
                </div>
                <div>
                  <p className="font-bold text-white">{passenger?.name}</p>
                  <p className="text-[11px] text-amber-400 uppercase font-bold tracking-wider">
                    Pending approval
                  </p>
                  {b.bookingRef && (
                    <p className="text-[10px] text-white/45 font-mono mt-0.5">{b.bookingRef}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-300">Rs. {b.farePaid}</p>
                <p className="text-[10px] text-white/60">
                  {b.bookingMode === 'SOLO' ? 'Solo · ' : 'Carpool · '}
                  {b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {ride && (
              <div className="text-xs text-white/75 space-y-1.5 bg-brand-500/5 border border-brand-500/20 p-3 rounded-xl">
                <p className="text-emerald-400/90 font-semibold">
                  {getVehicleTypeLabel(ride.vehicleId?.vehicleType)} ·{' '}
                  {new Date(ride.departureDate).toLocaleString()}
                </p>
                <p className="flex gap-2">
                  <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <LocationLabel
                    address={ride.origin?.address}
                    coordinates={ride.origin?.location?.coordinates}
                    fallback="Pickup"
                  />
                </p>
                <p className="flex gap-2">
                  <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <LocationLabel
                    address={ride.destination?.address}
                    coordinates={ride.destination?.location?.coordinates}
                    fallback="Drop-off"
                  />
                </p>
              </div>
            )}

            <ul className="text-xs text-white/70 space-y-1">
              <li className="flex gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                Pickup:{' '}
                <LocationLabel
                  address={b.pickupPoint?.address}
                  coordinates={b.pickupPoint?.location?.coordinates}
                  fallback="—"
                />
              </li>
              <li className="flex gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                Drop-off:{' '}
                <LocationLabel
                  address={b.dropoffPoint?.address}
                  coordinates={b.dropoffPoint?.location?.coordinates}
                  fallback="—"
                />
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {ride?._id && (
                <Link
                  to={`/chat/${ride._id}`}
                  state={{ from: '/carpooling', fromLabel: 'Carpooling' }}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-brand-500/40 bg-brand-500/10 text-brand-200 text-sm font-semibold no-underline hover:bg-brand-500/20"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Link>
              )}
              <AppButton
                type="button"
                disabled={busy || onDemandBusy}
                className="flex-1 !bg-emerald-600 hover:!bg-emerald-500 border-0"
                onClick={() => respond(b._id, 'CONFIRMED')}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Accept
                  </>
                )}
              </AppButton>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(b._id, 'REJECTED')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Decline
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  Hourglass,
  XCircle,
  Car,
  MessageSquare
} from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import LocationLabel from '@/components/common/LocationLabel';
import CarpoolLiveMap from '@/components/map/CarpoolLiveMap';
import CarpoolRideRoutePreview from '@/components/map/CarpoolRideRoutePreview';
import { bookingService } from '@/api/services/booking.service';
import { BOOKING_STATUS } from '@/features/bookings/constants';
import BookingStatusBadge from '@/features/bookings/components/BookingStatusBadge';

const CARPOOL_RETURN = { from: '/carpooling', fromLabel: 'Carpooling' };

export default function ActiveCarpoolSession({ booking, onDismiss }) {
  if (!booking) return null;

  const ride = booking.rideId;
  const driver = ride?.driverId;
  const isPending = booking.status === BOOKING_STATUS.PENDING;
  const isConfirmed = booking.status === BOOKING_STATUS.CONFIRMED;
  const isCompleted =
    booking.status === BOOKING_STATUS.COMPLETED || ride?.status === 'COMPLETED';
  const pricing = booking.pricing || {};
  const rideId = ride?._id || booking.rideId;

  useEffect(() => {
    if (!rideId || isCompleted) return undefined;
    const id = setInterval(async () => {
      try {
        const res = await bookingService.getById(booking._id);
        const b = res?.data;
        if (
          b?.status === BOOKING_STATUS.COMPLETED ||
          b?.rideId?.status === 'COMPLETED'
        ) {
          toast.success('Your carpool ride is complete');
          onDismiss?.();
        }
      } catch {
        /* ignore */
      }
    }, 12000);
    return () => clearInterval(id);
  }, [rideId, booking._id, isCompleted, onDismiss]);

  if (isCompleted) {
    return (
      <div className="max-w-3xl mx-auto pb-8">
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-slateCustom-900/80 p-6 space-y-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-extrabold text-white">Carpool completed</h2>
          <p className="text-sm text-white/65">
            The driver marked this trip complete. You can book another ride now.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/bookings"
              className="inline-flex px-4 py-2 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-semibold no-underline"
            >
              View in My bookings
            </Link>
            <AppButton type="button" fullWidth={false} onClick={() => onDismiss?.()}>
              Find another carpool
            </AppButton>
          </div>
        </div>
      </div>
    );
  }

  const cancelBooking = async () => {
    if (!window.confirm('Cancel this carpool request?')) return;
    try {
      await bookingService.cancel(booking._id, 'Passenger cancelled');
      toast.success('Booking cancelled');
      onDismiss?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      <div
        className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${
          isConfirmed
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/50 to-slateCustom-900/80'
            : 'border-amber-500/40 bg-gradient-to-br from-amber-950/40 to-slateCustom-900/80'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {isConfirmed ? (
              <CheckCircle2 className="h-9 w-9 text-emerald-400 shrink-0" />
            ) : (
              <Hourglass className="h-9 w-9 text-amber-400 shrink-0 animate-pulse" />
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
                Carpool · one trip at a time
              </p>
              <h2 className="text-xl font-extrabold text-white mt-0.5">
                {isPending && 'Waiting for driver approval'}
                {isConfirmed && 'Your carpool is confirmed'}
                {!isPending && !isConfirmed && 'Carpool booking'}
              </h2>
              <p className="text-sm text-white/65 mt-1">
                {isPending
                  ? 'You cannot book another ride until this request is resolved.'
                  : 'Your seat is confirmed. Search and booking are disabled until this trip ends.'}
              </p>
            </div>
          </div>
          <BookingStatusBadge status={booking.status} paymentStatus={booking.paymentStatus} />
        </div>

        {rideId && (isConfirmed || isPending) ? (
          <CarpoolLiveMap rideId={rideId} className="h-[min(18rem,45vh)] min-h-[240px] w-full" />
        ) : ride ? (
          <CarpoolRideRoutePreview ride={ride} className="h-40 w-full" />
        ) : null}

        <div className="glass-panel rounded-xl p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-white/90">
            <Car className="h-4 w-4 text-brand-400" />
            <span className="font-semibold">{driver?.name || 'Driver'}</span>
            {ride?.departureDate && (
              <span className="text-white/55 text-xs ml-auto flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(ride.departureDate).toLocaleString()}
              </span>
            )}
          </div>
          <p className="flex gap-2 text-white/75">
            <MapPin className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
            <LocationLabel
              address={booking.pickupPoint?.address || ride?.origin?.address}
              coordinates={
                booking.pickupPoint?.location?.coordinates ||
                ride?.origin?.location?.coordinates
              }
              fallback="Pickup"
            />
          </p>
          <p className="flex gap-2 text-white/75">
            <MapPin className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <LocationLabel
              address={booking.dropoffPoint?.address || ride?.destination?.address}
              coordinates={
                booking.dropoffPoint?.location?.coordinates ||
                ride?.destination?.location?.coordinates
              }
              fallback="Drop-off"
            />
          </p>
          <div className="flex flex-wrap gap-4 pt-1 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}
            </span>
            <span className="font-bold text-brand-300">Rs. {booking.farePaid}</span>
            {pricing.totalDistanceKm != null && (
              <span>{pricing.totalDistanceKm} km total route</span>
            )}
            {pricing.costPerSeatIfFull != null && (
              <span>If car fills: ~Rs. {pricing.costPerSeatIfFull}/seat avg</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {rideId && (isConfirmed || isPending) && (
            <Link
              to={`/chat/${rideId}`}
              state={CARPOOL_RETURN}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-semibold no-underline hover:bg-brand-500/30"
            >
              <MessageSquare className="h-4 w-4" />
              {isConfirmed ? 'Chat with driver' : 'Message driver'}
            </Link>
          )}
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-500/35 text-white/85 text-sm font-semibold no-underline hover:bg-brand-500/10"
          >
            My bookings
          </Link>
          {(isPending || isConfirmed) && (
            <AppButton
              type="button"
              variant="secondary"
              fullWidth={false}
              onClick={cancelBooking}
              className="!border-red-500/40 !text-red-300"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </AppButton>
          )}
        </div>
      </div>
    </div>
  );
}

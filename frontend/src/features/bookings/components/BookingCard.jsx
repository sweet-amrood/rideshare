import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, MessageSquare, XCircle, Banknote } from 'lucide-react';
import BookingStatusBadge from './BookingStatusBadge';
import LocationLabel from '@/components/common/LocationLabel';
import CancelBookingDialog from './CancelBookingDialog';
import { BOOKING_STATUS, BOOKING_MODE_LABELS } from '../constants';

export default function BookingCard({ booking, role = 'passenger', onRefresh }) {
  const navigate = useNavigate();
  const [showCancel, setShowCancel] = useState(false);
  const ride = booking.rideId;
  const driver = ride?.driverId;
  const canCancel = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status);

  return (
    <>
      <article className="glass-panel p-5 rounded-2xl border-l-4 border-l-brand-500 space-y-3">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <BookingStatusBadge status={booking.status} paymentStatus={booking.paymentStatus} />
            {booking.bookingRef && (
              <p className="text-[10px] text-white/50 mt-1 font-mono">{booking.bookingRef}</p>
            )}
          </div>
          <p className="text-lg font-bold text-brand-300">Rs. {booking.farePaid}</p>
        </div>

        {role === 'passenger' && driver && (
          <p className="text-sm text-white">
            Driver: <strong>{driver.name}</strong>
          </p>
        )}

        {ride && (
          <div className="text-xs text-white/75 space-y-1">
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
            <p className="flex gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {new Date(ride.departureDate).toLocaleString()}
            </p>
            <p>
              {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''} ·{' '}
              {BOOKING_MODE_LABELS[booking.bookingMode] || 'Carpool'}
            </p>
          </div>
        )}

        {booking.refund?.status === 'PENDING' && (
          <p className="text-xs text-purple-300 flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" />
            Refund Rs. {booking.refund.amount} queued for processing
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {booking.status === BOOKING_STATUS.CONFIRMED && ride?._id && (
            <button
              type="button"
              onClick={() =>
                navigate(`/chat/${ride._id}`, { state: { from: '/bookings', fromLabel: 'My bookings' } })
              }
              className="btn-primary flex-1 min-w-[120px] py-2 text-sm flex items-center justify-center gap-2 border-0"
            >
              <MessageSquare className="h-4 w-4" />
              Track & chat
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="flex-1 min-w-[120px] py-2 rounded-xl border border-red-500/40 text-red-300 text-sm font-semibold hover:bg-red-500/10 flex items-center justify-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </button>
          )}
        </div>
      </article>

      {showCancel && (
        <CancelBookingDialog
          booking={booking}
          onClose={() => setShowCancel(false)}
          onCancelled={onRefresh}
        />
      )}
    </>
  );
}

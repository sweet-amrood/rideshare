import { useEffect, useMemo, useState } from 'react';
import { Ticket, X, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AppButton from '@/components/common/AppButton';
import { bookingService } from '@/api/services/booking.service';
import { BOOKING_VEHICLE_TYPE, BOOKING_MODES } from '../constants';
import LiveSeatTracker from './LiveSeatTracker';
import LocationLabel from '@/components/common/LocationLabel';
import CarpoolFareBreakdown from '@/features/carpool/components/CarpoolFareBreakdown';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';

export default function SeatBookingModal({ ride, onClose, onSuccess }) {
  const [bookingMode, setBookingMode] = useState(BOOKING_MODES.CARPOOL);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [loading, setLoading] = useState(false);
  const [seatKey, setSeatKey] = useState(0);
  const [pendingSeats, setPendingSeats] = useState(0);
  const [fareQuote, setFareQuote] = useState(null);

  const isCar = ride?.vehicleId?.vehicleType === BOOKING_VEHICLE_TYPE;
  const maxCarpoolSeats = isCar ? Math.min(4, ride?.availableSeats || 1) : 0;

  useEffect(() => {
    if (!isCar || !ride?._id) return;
    let cancelled = false;
    bookingService
      .getLiveSeats(ride._id)
      .then((res) => {
        if (!cancelled) setPendingSeats(res?.data?.pendingSeats ?? 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isCar, ride?._id, seatKey]);

  const canSolo = useMemo(() => {
    if (!isCar || !ride) return false;
    const booked = ride.bookedSeats ?? 0;
    return (
      booked === 0 &&
      pendingSeats === 0 &&
      ride.availableSeats >= 1 &&
      ride.availableSeats === ride.totalSeats
    );
  }, [isCar, ride, pendingSeats]);

  const soloSeats = canSolo ? ride.availableSeats : 0;
  const seatsForBooking =
    bookingMode === BOOKING_MODES.SOLO ? soloSeats : seatsToBook;

  useEffect(() => {
    if (!isCar || !ride?._id) return;
    let cancelled = false;
    const payload = {
      seatsBooked: seatsForBooking,
      pickupAddress: ride.origin?.address,
      pickupCoords: ride.origin?.location?.coordinates,
      dropoffAddress: ride.destination?.address,
      dropoffCoords: ride.destination?.location?.coordinates
    };
    bookingService
      .getFareQuote(ride._id, payload)
      .then((res) => {
        if (!cancelled) setFareQuote(res.data);
      })
      .catch(() => {
        if (!cancelled) setFareQuote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isCar, ride, seatsForBooking, bookingMode]);

  useEffect(() => {
    if (bookingMode === BOOKING_MODES.SOLO && !canSolo) {
      setBookingMode(BOOKING_MODES.CARPOOL);
    }
  }, [bookingMode, canSolo]);

  const totalFare = fareQuote?.yourTotal ?? (ride?.costPerSeat || 0) * seatsForBooking;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isCar) {
      toast.error('Only car carpools support seat reservations');
      return;
    }
    if (bookingMode === BOOKING_MODES.SOLO && !canSolo) {
      toast.error('Solo ride is only available when the full car is empty');
      return;
    }

    setLoading(true);
    try {
      const res = await bookingService.book({
        rideId: ride._id,
        bookingMode,
        seatsBooked:
          bookingMode === BOOKING_MODES.SOLO ? soloSeats : parseInt(seatsToBook, 10),
        pickupAddress: ride.origin.address,
        pickupCoords: ride.origin.location.coordinates,
        dropoffAddress: ride.destination.address,
        dropoffCoords: ride.destination.location.coordinates
      });
      toast.success(res.message || 'Booking request sent');
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
      setSeatKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slateCustom-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-6 rounded-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Ticket className="h-5 w-5 text-brand-400" />
            Book this ride
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white text-xl border-0 bg-transparent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!isCar ? (
          <p className="text-sm text-amber-300">
            Seat booking is available for <strong>car</strong> carpools only. This ride is a{' '}
            {getVehicleTypeLabel(ride?.vehicleId?.vehicleType)}.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-xl text-sm text-white/80 space-y-1">
              <p>
                <strong className="text-white">Driver:</strong> {ride.driverId?.name}
              </p>
              <p className="truncate">
                <LocationLabel
                  address={ride.origin?.address}
                  coordinates={ride.origin?.location?.coordinates}
                  fallback="Pickup"
                />
              </p>
              <p className="truncate">
                →{' '}
                <LocationLabel
                  address={ride.destination?.address}
                  coordinates={ride.destination?.location?.coordinates}
                  fallback="Drop-off"
                />
              </p>
            </div>

            <CarpoolFareBreakdown quote={fareQuote} />

            <div>
              <p className="text-[10px] uppercase font-bold text-white/70 tracking-wider mb-2">
                How do you want to travel?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingMode(BOOKING_MODES.CARPOOL)}
                  className={`choice-btn p-3 rounded-xl border text-left transition-all ${
                    bookingMode === BOOKING_MODES.CARPOOL
                      ? 'border-brand-500 bg-brand-500/15'
                      : 'border-brand-500/35 hover:border-brand-500/40'
                  }`}
                >
                  <Users
                    className={`h-5 w-5 mb-1.5 ${
                      bookingMode === BOOKING_MODES.CARPOOL ? 'text-brand-400' : 'text-white/50'
                    }`}
                  />
                  <p className="font-bold text-white text-sm">Carpool</p>
                  <p className="text-[10px] text-white/55 mt-0.5 leading-snug">
                    Share the car — book 1–{maxCarpoolSeats} seat(s)
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => canSolo && setBookingMode(BOOKING_MODES.SOLO)}
                  disabled={!canSolo}
                  className={`choice-btn p-3 rounded-xl border text-left transition-all ${
                    bookingMode === BOOKING_MODES.SOLO
                      ? 'border-brand-500 bg-brand-500/15'
                      : 'border-brand-500/35 hover:border-brand-500/40'
                  } ${!canSolo ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <User
                    className={`h-5 w-5 mb-1.5 ${
                      bookingMode === BOOKING_MODES.SOLO ? 'text-brand-400' : 'text-white/50'
                    }`}
                  />
                  <p className="font-bold text-white text-sm">Solo</p>
                  <p className="text-[10px] text-white/55 mt-0.5 leading-snug">
                    Private car — all {ride.totalSeats} seats for you
                  </p>
                </button>
              </div>
              {!canSolo && (
                <p className="text-[10px] text-amber-400/90 mt-2">
                  Solo is only available when no seats are taken or pending on this ride.
                </p>
              )}
            </div>

            <LiveSeatTracker rideId={ride._id} refreshKey={seatKey} />

            {bookingMode === BOOKING_MODES.CARPOOL ? (
              <div>
                <label className="text-[10px] uppercase font-bold text-white/70 block mb-1">
                  Seats (max {maxCarpoolSeats})
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxCarpoolSeats}
                  required
                  value={seatsToBook}
                  onChange={(e) =>
                    setSeatsToBook(
                      Math.min(maxCarpoolSeats, Math.max(1, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className="w-full bg-transparent border-2 border-brand-500/35 rounded-lg px-3 py-2 text-white"
                />
              </div>
            ) : (
              <div className="bg-brand-500/10 border border-brand-500/25 rounded-xl p-3 text-sm text-white/85">
                <p className="font-semibold text-brand-200">Private solo ride</p>
                <p className="text-xs text-white/65 mt-1">
                  You are reserving all <strong>{soloSeats}</strong> seats. No other passengers
                  will be added to this trip.
                </p>
              </div>
            )}

            <p className="text-sm font-bold text-brand-300">Your total: Rs. {totalFare}</p>
            <p className="text-xs text-white/55">
              One active trip at a time. After the driver accepts, booking search is disabled until
              this trip completes.
            </p>

            <AppButton
              type="submit"
              fullWidth
              disabled={
                loading ||
                (bookingMode === BOOKING_MODES.CARPOOL && maxCarpoolSeats < 1) ||
                (bookingMode === BOOKING_MODES.SOLO && !canSolo)
              }
            >
              {loading
                ? 'Submitting…'
                : bookingMode === BOOKING_MODES.SOLO
                  ? 'Request solo ride'
                  : 'Request carpool seats'}
            </AppButton>
          </form>
        )}
      </div>
    </div>
  );
}

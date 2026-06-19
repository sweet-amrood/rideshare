import { useEffect, useMemo, useState } from 'react';
import { Ticket, X, Users, User } from 'lucide-react';
import toast from 'react-hot-toast';
import AppButton from '@/components/common/AppButton';
import { bookingService } from '@/api/services/booking.service';
import { BOOKING_VEHICLE_TYPE, BOOKING_MODES } from '../constants';
import LiveSeatTracker from './LiveSeatTracker';
import LocationLabel from '@/components/common/LocationLabel';
import CarpoolFareBreakdown from '@/features/carpool/components/CarpoolFareBreakdown';
import { getVehicleTypeLabel, getRideVehicleType } from '@/features/rides/constants/searchByVehicleType';
import AnimatedModal from '@/components/animations/AnimatedModal';

export default function SeatBookingModal({
  ride,
  passengerPickup = null,
  passengerDestination = null,
  onClose,
  onSuccess
}) {
  const [bookingMode, setBookingMode] = useState(BOOKING_MODES.CARPOOL);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [loading, setLoading] = useState(false);
  const [seatKey, setSeatKey] = useState(0);
  const [pendingSeats, setPendingSeats] = useState(0);
  const [liveSeats, setLiveSeats] = useState(null);
  const [fareQuote, setFareQuote] = useState(ride?.farePreview || null);

  const tripPoints = useMemo(() => {
    const toCoordPair = (lng, lat) => [Number(lng), Number(lat)];
    const toAddress = (point, fallback) =>
      (point?.address || point?.name || fallback).trim();

    if (
      passengerPickup?.lat != null &&
      passengerPickup?.lng != null &&
      passengerDestination?.lat != null &&
      passengerDestination?.lng != null
    ) {
      return {
        pickupAddress: toAddress(passengerPickup, 'Selected pickup'),
        pickupCoords: toCoordPair(passengerPickup.lng, passengerPickup.lat),
        dropoffAddress: toAddress(passengerDestination, 'Selected destination'),
        dropoffCoords: toCoordPair(passengerDestination.lng, passengerDestination.lat)
      };
    }
    const originCoords = ride?.origin?.location?.coordinates;
    const destCoords = ride?.destination?.location?.coordinates;
    return {
      pickupAddress: ride?.origin?.address || 'Ride pickup',
      pickupCoords:
        originCoords?.length === 2
          ? toCoordPair(originCoords[0], originCoords[1])
          : originCoords,
      dropoffAddress: ride?.destination?.address || 'Ride destination',
      dropoffCoords:
        destCoords?.length === 2 ? toCoordPair(destCoords[0], destCoords[1]) : destCoords
    };
  }, [passengerPickup, passengerDestination, ride]);

  const effectiveAvailable =
    liveSeats?.effectiveAvailable ??
    ride?.seatSummary?.effectiveAvailable ??
    ride?.availableSeats ??
    0;
  const confirmedBooked = ride?.seatSummary?.bookedSeats ?? ride?.bookedSeats ?? 0;

  const vehicleType = getRideVehicleType(ride);
  const isCar = vehicleType === BOOKING_VEHICLE_TYPE;
  const maxCarpoolSeats =
    isCar && effectiveAvailable > 0 ? Math.min(4, effectiveAvailable) : 0;

  useEffect(() => {
    if (!isCar || !ride?._id) return;
    let cancelled = false;
    bookingService
      .getLiveSeats(ride._id)
      .then((res) => {
        if (!cancelled) {
          setPendingSeats(res?.data?.pendingSeats ?? 0);
          setLiveSeats(res?.data ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isCar, ride?._id, seatKey]);

  const canSolo = useMemo(() => {
    if (!isCar || !ride) return false;
    return (
      confirmedBooked === 0 &&
      pendingSeats === 0 &&
      effectiveAvailable >= 1 &&
      effectiveAvailable === ride.totalSeats
    );
  }, [isCar, ride, pendingSeats, confirmedBooked, effectiveAvailable]);

  const soloSeats = canSolo ? effectiveAvailable : 0;
  const seatsForBooking =
    bookingMode === BOOKING_MODES.SOLO ? soloSeats : seatsToBook;

  useEffect(() => {
    if (!isCar || !ride?._id) return;
    let cancelled = false;
    const payload = {
      seatsBooked: seatsForBooking,
      ...tripPoints
    };
    bookingService
      .getFareQuote(ride._id, payload)
      .then((res) => {
        if (!cancelled) setFareQuote(res.data);
      })
      .catch(() => {
        if (!cancelled) setFareQuote(ride?.farePreview || null);
      });
    return () => {
      cancelled = true;
    };
  }, [isCar, ride, seatsForBooking, bookingMode, tripPoints]);

  useEffect(() => {
    if (bookingMode === BOOKING_MODES.SOLO && !canSolo) {
      setBookingMode(BOOKING_MODES.CARPOOL);
    }
  }, [bookingMode, canSolo]);

  useEffect(() => {
    if (bookingMode === BOOKING_MODES.CARPOOL && seatsToBook > maxCarpoolSeats && maxCarpoolSeats > 0) {
      setSeatsToBook(maxCarpoolSeats);
    }
  }, [bookingMode, maxCarpoolSeats, seatsToBook]);

  const totalFare =
    fareQuote?.yourTotal ??
    fareQuote?.totalFareCost ??
    (fareQuote?.farePerSeat != null && seatsForBooking > 0
      ? fareQuote.farePerSeat * seatsForBooking
      : null);

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
        ...tripPoints
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
    <AnimatedModal open onClose={onClose} zIndex={50}>
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
            {getVehicleTypeLabel(vehicleType)}.
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
              {passengerPickup?.lat != null && passengerDestination?.lat != null && (
                <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-brand-300/90 tracking-wide">
                    Your trip on this ride
                  </p>
                  <p className="truncate">
                    <LocationLabel
                      address={tripPoints.pickupAddress}
                      coordinates={tripPoints.pickupCoords}
                      fallback="Your pickup"
                    />
                  </p>
                  <p className="truncate">
                    →{' '}
                    <LocationLabel
                      address={tripPoints.dropoffAddress}
                      coordinates={tripPoints.dropoffCoords}
                      fallback="Your drop-off"
                    />
                  </p>
                </div>
              )}
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

            {fareQuote?.accepted === false ? (
              <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                {fareQuote.rejectionReason ||
                  'This ride cannot accommodate your route. Try another carpool.'}
              </p>
            ) : (
              <p className="text-sm font-bold text-brand-300">
                Your total:{' '}
                {totalFare != null ? `Rs. ${totalFare}` : 'Calculating fare…'}
              </p>
            )}
            <p className="text-xs text-white/55">
              One active trip at a time. After the driver accepts, booking search is disabled until
              this trip completes.
            </p>

            <AppButton
              type="submit"
              fullWidth
              disabled={
                loading ||
                totalFare == null ||
                fareQuote?.accepted === false ||
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
    </AnimatedModal>
  );
}

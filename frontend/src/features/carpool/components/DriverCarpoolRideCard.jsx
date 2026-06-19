import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Car,
  Calendar,
  MapPin,
  Users,
  Banknote,
  Gauge,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import CarpoolLiveMap from '@/components/map/CarpoolLiveMap';
import LiveSeatTracker from '@/features/bookings/components/LiveSeatTracker';
import CompleteRidePanel from '@/features/bookings/components/CompleteRidePanel';
import StartRidePanel from '@/features/bookings/components/StartRidePanel';
import LocationLabel from '@/components/common/LocationLabel';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';
import { bookingService } from '@/api/services/booking.service';
import AnimatedCard from '@/components/animations/AnimatedCard';
import { fadeMedium } from '@/animations/motionConfig';
import { paths } from '@/app/router/paths';

const CARPOOL_CHAT_STATE = { from: paths.carpooling, fromLabel: 'Carpooling' };

export default function DriverCarpoolRideCard({ ride, onRefresh, refreshKey = 0 }) {
  const [expanded, setExpanded] = useState(true);
  const [seatSnapshot, setSeatSnapshot] = useState(null);

  const vehicle = ride.vehicleId;
  const dep = ride.departureDate ? new Date(ride.departureDate) : null;

  useEffect(() => {
    if (!ride?._id) return;
    let cancelled = false;
    bookingService.getLiveSeats(ride._id).then((res) => {
      if (!cancelled) setSeatSnapshot(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [ride?._id, refreshKey]);

  const bookedSeats =
    seatSnapshot?.bookedSeats ?? ride.seatSummary?.bookedSeats ?? ride.bookedSeats ?? 0;
  const pendingSeats = seatSnapshot?.pendingSeats ?? ride.seatSummary?.pendingSeats ?? 0;
  const totalSeats = seatSnapshot?.totalSeats ?? ride.totalSeats;
  const availableSeats =
    seatSnapshot?.effectiveAvailable ??
    ride.seatSummary?.effectiveAvailable ??
    ride.availableSeats;
  const hasPassengers = bookedSeats > 0 || pendingSeats > 0;

  return (
    <AnimatedCard as="article" layout className="glass-panel rounded-2xl border border-emerald-500/20 overflow-hidden" hover={false}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-start justify-between gap-3 p-4 sm:p-5 text-left border-0 bg-transparent hover:bg-brand-500/5 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                ride.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-brand-500/20 text-brand-300'
              }`}
            >
              {ride.status}
            </span>
            <span className="text-[10px] text-white/50">
              {getVehicleTypeLabel(vehicle?.vehicleType)}
              {vehicle?.licensePlate ? ` · ${vehicle.licensePlate}` : ''}
              {hasPassengers && (
                <span className="text-emerald-300">
                  {' '}
                  · {bookedSeats} confirmed
                  {pendingSeats > 0 ? ` · ${pendingSeats} pending` : ''}
                </span>
              )}
            </span>
          </div>
          <p className="text-sm font-bold text-white leading-snug">
            <LocationLabel
              address={ride.origin?.address}
              coordinates={ride.origin?.location?.coordinates}
              fallback="Pickup"
            />
            <span className="text-white/40 mx-1">→</span>
            <LocationLabel
              address={ride.destination?.address}
              coordinates={ride.destination?.location?.coordinates}
              fallback="Drop-off"
            />
          </p>
          {dep && (
            <p className="text-xs text-white/60 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {dep.toLocaleString()}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-white/50 shrink-0 mt-1" />
        ) : (
          <ChevronDown className="h-5 w-5 text-white/50 shrink-0 mt-1" />
        )}
      </button>

      <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          key="expanded"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={fadeMedium}
          className="overflow-hidden"
        >
        <div className="px-4 sm:px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <CarpoolLiveMap rideId={ride._id} className="h-[min(16rem,42vh)] min-h-[220px] w-full" />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="rounded-lg bg-brand-500/5 border border-brand-500/20 p-2.5">
              <p className="text-[9px] uppercase text-white/50 font-bold">Seats</p>
              <p className="text-lg font-bold text-white mt-0.5">
                {bookedSeats}/{totalSeats}
              </p>
              <p className="text-[10px] text-emerald-300">{availableSeats} free</p>
              {pendingSeats > 0 && (
                <p className="text-[10px] text-amber-300">{pendingSeats} pending approval</p>
              )}
            </div>
            <div className="rounded-lg bg-brand-500/5 border border-brand-500/20 p-2.5">
              <p className="text-[9px] uppercase text-white/50 font-bold flex items-center justify-center gap-0.5">
                <Banknote className="h-3 w-3" /> Route est.
              </p>
              <p className="text-lg font-bold text-brand-300 mt-0.5">
                Rs.{' '}
                {ride.pricing?.totalFuelCost
                  ? Math.ceil(ride.pricing.totalFuelCost / Math.max(1, ride.totalSeats))
                  : '—'}
              </p>
              <p className="text-[9px] text-white/45">avg / seat if full</p>
            </div>
            <div className="rounded-lg bg-brand-500/5 border border-brand-500/20 p-2.5">
              <p className="text-[9px] uppercase text-white/50 font-bold flex items-center justify-center gap-0.5">
                <Gauge className="h-3 w-3" /> Distance
              </p>
              <p className="text-lg font-bold text-white mt-0.5">
                {ride.pricing?.distanceKm ?? '—'} km
              </p>
            </div>
            <div className="rounded-lg bg-brand-500/5 border border-brand-500/20 p-2.5">
              <p className="text-[9px] uppercase text-white/50 font-bold">Route fare est.</p>
              <p className="text-lg font-bold text-white mt-0.5">
                Rs. {ride.pricing?.totalFuelCost ?? '—'}
              </p>
              {ride.pricing?.platformRatePerKm > 0 && (
                <p className="text-[9px] text-white/45 mt-0.5">
                  {ride.pricing.platformRatePerKm} PKR/km
                  {ride.amenities?.hasAC ? ' · AC' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs text-white/75">
            <div className="space-y-1.5 rounded-xl border border-brand-500/20 p-3">
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-400" />
                Route
              </p>
              <p>
                <span className="text-white/50">From:</span>{' '}
                <LocationLabel
                  address={ride.origin?.address}
                  coordinates={ride.origin?.location?.coordinates}
                />
              </p>
              <p>
                <span className="text-white/50">To:</span>{' '}
                <LocationLabel
                  address={ride.destination?.address}
                  coordinates={ride.destination?.location?.coordinates}
                />
              </p>
            </div>
            <div className="space-y-1.5 rounded-xl border border-brand-500/20 p-3">
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <Car className="h-4 w-4 text-brand-400" />
                Vehicle
              </p>
              <p>
                {[vehicle?.company, vehicle?.model].filter(Boolean).join(' ') || '—'}
              </p>
              {vehicle?.licensePlate && (
                <p className="font-mono text-white/90">{vehicle.licensePlate}</p>
              )}
              {ride.amenities?.hasAC && (
                <p className="text-brand-300">AC · {ride.amenities?.luggageAllowed || 'Small'} luggage</p>
              )}
            </div>
          </div>

          <LiveSeatTracker rideId={ride._id} refreshKey={refreshKey} />

          {hasPassengers && (
            <Link
              to={`/chat/${ride._id}`}
              state={CARPOOL_CHAT_STATE}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-brand-500/20 border border-brand-500/40 text-brand-200 text-sm font-semibold no-underline hover:bg-brand-500/30"
            >
              <MessageSquare className="h-4 w-4" />
              Trip group chat
            </Link>
          )}

          <StartRidePanel ride={ride} onStarted={onRefresh} onCancelled={onRefresh} />

          <CompleteRidePanel ride={ride} onCompleted={onRefresh} />
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </AnimatedCard>
  );
}

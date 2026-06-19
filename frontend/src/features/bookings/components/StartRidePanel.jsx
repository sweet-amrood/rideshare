import { useCallback, useEffect, useState } from 'react';
import { Navigation, Loader2, Users, MapPin, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingService } from '@/api/services/booking.service';
import { cancelRide } from '@/features/rides/services/ride.service';
import { resolveCurrentLocationAsPoint } from '@/components/map/geolocation';

export default function StartRidePanel({ ride, onStarted, onCancelled }) {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const bookedSeats = ride?.bookedSeats ?? ride?.seatSummary?.bookedSeats ?? 0;

  const loadCandidates = useCallback(async () => {
    if (!ride?._id) return null;
    setLoadingCandidates(true);
    try {
      let params = {};
      try {
        const pt = await resolveCurrentLocationAsPoint();
        if (pt?.lat != null) params = { driverLat: pt.lat, driverLng: pt.lng };
      } catch {
        /* use server fallback */
      }
      const res = await bookingService.getStartCandidates(ride._id, params);
      const list = res.data?.candidates || [];
      setCandidates(list);
      setRequiresSelection(!!res.data?.requiresSelection);
      if (list.length === 1) setSelectedId(list[0].bookingId);
      else if (list.length) setSelectedId(list[0].bookingId);
      return list;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load passengers');
      return [];
    } finally {
      setLoadingCandidates(false);
    }
  }, [ride?._id]);

  useEffect(() => {
    if (ride?.status === 'SCHEDULED' && bookedSeats > 0) {
      loadCandidates();
    }
  }, [ride?._id, ride?.status, bookedSeats, loadCandidates]);

  if (!ride || ride.status !== 'SCHEDULED') {
    return null;
  }

  const handleStartClick = async () => {
    if (bookedSeats < 1) {
      toast.error('At least one confirmed passenger is required to start');
      return;
    }
    if (requiresSelection && candidates.length > 1) {
      setShowPicker(true);
      await loadCandidates();
      return;
    }
    await confirmStart(selectedId || candidates[0]?.bookingId);
  };

  const confirmStart = async (firstPickupBookingId) => {
    if (!firstPickupBookingId) {
      toast.error('Select a passenger to pick up first');
      return;
    }
    setLoading(true);
    try {
      let payload = { firstPickupBookingId };
      try {
        const pt = await resolveCurrentLocationAsPoint();
        if (pt?.lat != null) {
          payload.driverLat = pt.lat;
          payload.driverLng = pt.lng;
        }
      } catch {
        /* optional */
      }
      const res = await bookingService.startRide(ride._id, payload);
      toast.success(res.message || 'Ride started — passengers notified');
      setShowPicker(false);
      onStarted?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start ride');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRide = async () => {
    if (
      !window.confirm(
        bookedSeats > 0
          ? 'Cancel this carpool? Confirmed passengers will need to be notified separately.'
          : 'Cancel this published carpool ride?'
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      await cancelRide(ride._id);
      toast.success('Ride cancelled');
      onCancelled?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel ride');
    } finally {
      setCancelling(false);
    }
  };

  const canStart = bookedSeats > 0 && candidates.length > 0 && !loadingCandidates;

  return (
    <div className="glass-panel p-4 rounded-2xl border border-brand-500/25 space-y-3">
      <p className="text-sm font-semibold text-white flex items-center gap-2">
        <Navigation className="h-4 w-4 text-brand-400" />
        Ready to go
      </p>
      <p className="text-xs text-white/60">
        {bookedSeats > 0
          ? 'Start when you are leaving — passengers will be notified. With multiple passengers, you choose pickup order by distance.'
          : 'Waiting for confirmed passengers before you can start. You can cancel this ride if plans change.'}
      </p>

      {bookedSeats > 0 && (
        <>
          {loadingCandidates ? (
            <p className="text-xs text-white/50 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading passengers…
            </p>
          ) : (
            candidates.length > 0 && (
              <ul className="text-xs text-white/75 space-y-1.5 max-h-32 overflow-y-auto">
                {candidates.map((c, idx) => (
                  <li key={c.bookingId} className="flex gap-2">
                    <Users className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    <span>
                      {idx === 0 && <span className="text-emerald-300 font-bold">Nearest · </span>}
                      <strong>{c.passengerName}</strong>
                      {c.distanceKm != null ? ` · ${c.distanceKm} km` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          disabled={loading || cancelling || !canStart}
          onClick={handleStartClick}
          className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Start ride'}
        </button>
        <button
          type="button"
          disabled={loading || cancelling}
          onClick={handleCancelRide}
          className="flex-1 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 disabled:opacity-60"
        >
          {cancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <XCircle className="h-4 w-4" />
              Cancel ride
            </>
          )}
        </button>
      </div>

      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="glass-panel w-full max-w-md rounded-2xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-white">Who are you picking up first?</h3>
            <p className="text-xs text-white/60">
              Passengers are sorted by distance from your current location.
            </p>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {candidates.map((c) => (
                <li key={c.bookingId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.bookingId)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      String(selectedId) === String(c.bookingId)
                        ? 'border-brand-500 bg-brand-500/15'
                        : 'border-white/10 hover:border-brand-500/40'
                    }`}
                  >
                    <p className="font-semibold text-white text-sm">{c.passengerName}</p>
                    <p className="text-[11px] text-white/55 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {c.pickupAddress || 'Pickup'}
                      {c.distanceKm != null ? ` · ${c.distanceKm} km` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPicker(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white/80 text-sm"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || !selectedId}
                onClick={() => confirmStart(selectedId)}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading ? 'Starting…' : 'Confirm & start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

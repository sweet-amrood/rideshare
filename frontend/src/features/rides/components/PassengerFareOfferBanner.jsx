import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Clock, Banknote } from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import { rideRequestService } from '@/api/services/rideRequest.service';

const OFFER_TTL_MS = 15000;

export default function PassengerFareOfferBanner({
  offer,
  requestId,
  onResponded,
  onExpired,
  acceptLabel = 'Accept fare',
  expiresAt: expiresAtProp
}) {
  const [busy, setBusy] = useState(false);
  const [expiresAt] = useState(expiresAtProp || Date.now() + OFFER_TTL_MS);
  const [remaining, setRemaining] = useState(OFFER_TTL_MS);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
      if (left <= 0) {
        setVisible(false);
        onExpired?.(offer._id);
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [expiresAt, offer._id, onExpired]);

  if (!visible) return null;

  const fare = offer.counterFare ?? offer.offeredFare;
  const isCounter = offer.status === 'COUNTERED' && offer.counterFare;
  const pct = (remaining / OFFER_TTL_MS) * 100;

  const respond = async (action) => {
    setBusy(true);
    try {
      await rideRequestService.passengerRespondOffer(requestId, offer._id, { action });
      toast.success(action === 'ACCEPT' ? 'Ride confirmed!' : 'Offer declined');
      setVisible(false);
      onResponded?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 overflow-hidden ${
        isCounter
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-emerald-500/30 bg-emerald-500/10'
      }`}
    >
      <div className="h-1 -mx-4 -mt-4 mb-3 bg-slateCustom-800">
        <div
          className="h-full bg-amber-400 transition-all duration-200 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-1 flex justify-between">
        <span>{isCounter ? 'Driver counter-offer' : 'Driver offer'}</span>
        <span>{Math.ceil(remaining / 1000)}s left</span>
      </p>
      <p className="text-lg font-extrabold text-white flex items-center gap-2 flex-wrap">
        <Banknote className="h-5 w-5 text-brand-400 shrink-0" />
        <span>
          Rs. {fare}{' '}
          <span className="text-sm font-semibold text-brand-300/90">total for full ride</span>
        </span>
        <span className="text-sm font-normal text-white/60">
          from {offer.driverName || 'Driver'}
        </span>
      </p>
      <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/75">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          {offer.distanceToPickupKm?.toFixed?.(1) ?? offer.distanceToPickupKm ?? '—'} km away
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          ~{offer.etaMinutes ?? '—'} min ETA
        </span>
      </div>
      {offer.message && <p className="text-xs text-white/55 mt-2">{offer.message}</p>}
      <div className="flex gap-2 mt-4">
        <AppButton type="button" disabled={busy} className="flex-1" onClick={() => respond('ACCEPT')}>
          {acceptLabel}
        </AppButton>
        <button
          type="button"
          disabled={busy}
          onClick={() => respond('REJECT')}
          className="flex-1 py-2 rounded-lg text-sm font-semibold border border-slateCustom-600 text-white/80 hover:bg-slateCustom-800"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

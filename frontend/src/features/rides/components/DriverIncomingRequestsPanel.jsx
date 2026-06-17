import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Clock, Banknote, Check, X, TrendingUp } from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import DriverRequestRouteMap from '@/components/map/DriverRequestRouteMap';
import { getCurrentPosition, FAST_POSITION_OPTIONS } from '@/components/map/geolocation';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { useAppSocket } from '@/hooks/useAppSocket';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';

export default function DriverIncomingRequestsPanel({ onCountChange }) {
  const [list, setList] = useState([]);
  const [driverBusy, setDriverBusy] = useState(false);
  const [needsActiveVehicle, setNeedsActiveVehicle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [counterFare, setCounterFare] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [driverLoc, setDriverLoc] = useState(null);
  const toastedRequestIds = useRef(new Set());

  useEffect(() => {
    getCurrentPosition(FAST_POSITION_OPTIONS)
      .then((pos) =>
        setDriverLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      )
      .catch(() => setDriverLoc(null));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await rideRequestService.listIncoming();
      const payload = res.data || {};
      const data = Array.isArray(payload) ? payload : payload.items || [];
      setDriverBusy(Boolean(payload.driverBusy));
      setNeedsActiveVehicle(Boolean(payload.needsActiveVehicle));
      setList(data);
      onCountChange?.(data.filter((r) => !r.myOffer || r.myOffer.status === 'PENDING').length);
      return data;
    } catch {
      setList([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useAppSocket({
    'ride-request:new': (payload) => {
      const id = payload?.requestId ? String(payload.requestId) : '';
      load().then((items) => {
        const visible = items?.length ?? 0;
        if (!visible && !payload?.fareUpdated) return;
        if (payload?.fareUpdated) {
          if (id) toastedRequestIds.current.add(`${id}-fare`);
          toast(`Passenger updated fare · Rs.${payload.passengerOfferedFare}`, { icon: '💰' });
          return;
        }
        if (!id || toastedRequestIds.current.has(id)) return;
        if (items.some((r) => String(r._id) === id)) {
          toastedRequestIds.current.add(id);
          toast('New ride request nearby', { icon: '🏍' });
        }
      });
    },
    'ride-request:taken': (payload) => {
      const id = payload?.requestId;
      if (!id) return;
      toastedRequestIds.current.delete(String(id));
      setList((prev) => {
        const next = prev.filter((r) => String(r._id) !== String(id));
        onCountChange?.(
          next.filter((r) => !r.myOffer || r.myOffer.status === 'PENDING').length
        );
        return next;
      });
      setCounterFare((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    },
    'ride-request:cancelled': (payload) => {
      const id = payload?.requestId;
      if (!id) return;
      toastedRequestIds.current.delete(String(id));
      setList((prev) => {
        const next = prev.filter((r) => String(r._id) !== String(id));
        onCountChange?.(
          next.filter((r) => !r.myOffer || r.myOffer.status === 'PENDING').length
        );
        return next;
      });
    }
  });

  const respond = async (requestId, action, extra = {}) => {
    setBusyId(requestId);
    try {
      await rideRequestService.driverRespond(requestId, {
        action,
        counterFare: extra.counterFare,
        message: extra.message
      });
      toast.success(
        action === 'ACCEPT' ? 'Offer sent to passenger' : action === 'COUNTER' ? 'Counter sent' : 'Declined'
      );
      if (action === 'REJECT') {
        setList((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-8 rounded-2xl flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  if (needsActiveVehicle) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-white/70 text-sm">
        Select your <strong className="text-emerald-300">vehicle on duty</strong> in the sidebar
        to see matching ride requests.
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className="glass-panel p-8 rounded-2xl text-center text-white/70 text-sm">
        No live requests in your area. Use <strong className="text-emerald-300">Driver · Go online</strong>{' '}
        in the sidebar to receive alerts.
      </div>
    );
  }

  const canAccept = (req) => !driverBusy && req.canAccept !== false;

  return (
    <div className="space-y-4">
      {driverBusy && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          You can browse nearby requests, but finish your current ride before accepting another.
        </div>
      )}
      {list.map((req) => (
        <article
          key={req._id}
          className="glass-panel p-5 rounded-2xl border border-emerald-500/20 space-y-3"
        >
          <div className="flex justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400">
                {getVehicleTypeLabel(req.vehicleType)}
                {req.hasAC ? ' · AC' : ''} · {req.requestRef}
              </p>
              <p className="font-bold text-white mt-0.5">
                {req.passengerId?.name || 'Passenger'}
              </p>
            </div>
            <span className="text-lg font-extrabold text-brand-300">Rs. {req.passengerOfferedFare}</span>
          </div>

          <DriverRequestRouteMap
            driverPoint={driverLoc}
            pickup={req.pickup}
            dropoff={req.dropoff}
            className="h-36 w-full"
          />

          <ul className="text-xs text-white/75 space-y-1">
            <li className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
              {req.pickup?.address}
            </li>
            <li className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
              {req.dropoff?.address}
            </li>
            <li className="flex gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {req.distanceToPickupText || `${req.distanceToPickupKm} km`} · ~{req.etaMinutes}{' '}
              min to pickup
            </li>
            <li className="flex gap-2">
              <Banknote className="h-3.5 w-3.5 shrink-0" />
              Max counter Rs. {req.maxFare}
            </li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <AppButton
              type="button"
              fullWidth={false}
              disabled={busyId === req._id || !canAccept(req)}
              className="flex-1 min-w-[120px]"
              onClick={() => respond(req._id, 'ACCEPT')}
            >
              <Check className="h-4 w-4 inline mr-1" />
              Accept
            </AppButton>
            <button
              type="button"
              disabled={busyId === req._id || !canAccept(req)}
              onClick={() => respond(req._id, 'REJECT')}
              className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-500/30 text-red-300"
            >
              <X className="h-4 w-4 inline" />
            </button>
          </div>

          <div className="flex gap-2 items-end pt-1 border-t border-slateCustom-700/80">
            <input
              type="number"
              min={req.recommendedFare}
              max={req.maxFare}
              placeholder={`Counter (Rs. ${req.recommendedFare}–${req.maxFare})`}
              value={counterFare[req._id] ?? ''}
              onChange={(e) =>
                setCounterFare((s) => ({ ...s, [req._id]: e.target.value }))
              }
              className="flex-1 bg-transparent border-2 border-brand-500/35 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
            />
            <AppButton
              type="button"
              fullWidth={false}
              variant="secondary"
              disabled={busyId === req._id || !counterFare[req._id] || !canAccept(req)}
              onClick={() =>
                respond(req._id, 'COUNTER', {
                  counterFare: Number(counterFare[req._id]),
                  message: `Counter offer Rs.${counterFare[req._id]}`
                })
              }
            >
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Counter
            </AppButton>
          </div>
        </article>
      ))}
    </div>
  );
}

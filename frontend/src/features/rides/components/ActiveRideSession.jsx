import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  MapPin,
  Navigation,
  MessageSquare,
  Bell,
  Flag,
  XCircle,
  CheckCircle2,
  Star
} from 'lucide-react';
import TripMapView from '@/components/map/TripMapView';
import AppButton from '@/components/common/AppButton';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { useAppSocket } from '@/hooks/useAppSocket';
import { resolveCurrentLocationAsPoint } from '@/components/map/geolocation';
import RideReviewReportModal from './RideReviewReportModal';

const toPoint = (loc, address) => {
  const [lng, lat] = loc?.coordinates || [];
  if (lat == null) return null;
  return { lat, lng, address: address || '', name: address || '' };
};

const driverIcon =
  '<div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 border-2 border-white shadow-lg text-lg">🏍</div>';

export default function ActiveRideSession({ session: initial, onSessionChange, isDriver }) {
  const { user } = useAuth();
  const location = useLocation();
  const [session, setSession] = useState(initial);
  const [driverPos, setDriverPos] = useState(null);
  const [waitLeft, setWaitLeft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reviewRideId, setReviewRideId] = useState(null);
  const [driverEndedTrip, setDriverEndedTrip] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  const id = session?._id;
  const isCompleted = session?.status === 'COMPLETED';
  const canPassengerCancel =
    !isDriver &&
    !isCompleted &&
    ['SEARCHING', 'OFFERS_PENDING', 'ACCEPTED'].includes(session?.status);
  const pickup = useMemo(
    () =>
      toPoint(session?.pickup?.location, session?.pickup?.address) || {
        ...session?.pickup,
        lat: session?.pickup?.location?.coordinates?.[1],
        lng: session?.pickup?.location?.coordinates?.[0],
        address: session?.pickup?.address
      },
    [session]
  );
  const dropoff = useMemo(
    () =>
      toPoint(session?.dropoff?.location, session?.dropoff?.address) || {
        lat: session?.dropoff?.location?.coordinates?.[1],
        lng: session?.dropoff?.location?.coordinates?.[0],
        address: session?.dropoff?.address
      },
    [session]
  );

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const res = await rideRequestService.get(id);
      if (res.success && res.data?.request) {
        const next = res.data.request;
        setSession((prev) => {
          if (!prev || String(prev._id) !== String(next._id)) return next;
          if (
            prev.status === next.status &&
            prev.phase === next.phase &&
            prev.agreedFare === next.agreedFare
          ) {
            return {
              ...prev,
              driverEtaMinutes: next.driverEtaMinutes,
              driverDistanceText: next.driverDistanceText,
              driverLiveLocation: next.driverLiveLocation ?? prev.driverLiveLocation
            };
          }
          return next;
        });
        if (next.status === 'COMPLETED') {
          setDriverEndedTrip(next.completedBy === 'DRIVER');
        }
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    if (!initial?._id) return;
    const staleCompleted =
      initial.status === 'COMPLETED' &&
      (initial.viewerHasReviewed ||
        initial.passengerClosedAt ||
        initial.driverClosedAt ||
        initial.viewerSessionClosed);
    if (staleCompleted) {
      onSessionChange?.(null);
      return;
    }
    setSession((prev) => {
      if (!prev || String(prev._id) !== String(initial._id)) return initial;
      if (prev.status === initial.status && prev.phase === initial.phase) return prev;
      return { ...prev, ...initial };
    });
    if (initial.status === 'COMPLETED') {
      setDriverEndedTrip(initial.completedBy === 'DRIVER');
    }
  }, [
    initial?._id,
    initial?.status,
    initial?.phase,
    initial?.viewerHasReviewed,
    initial?.passengerClosedAt,
    initial?.driverClosedAt,
    initial?.viewerSessionClosed,
    initial?.completedBy,
    onSessionChange
  ]);

  useEffect(() => {
    if (id && location.pathname.includes(`/ride-request/${id}/chat`)) {
      setChatUnread(0);
    }
  }, [id, location.pathname]);

  const { joinRideRequestRoom } = useAppSocket({
    'ride-request:chat': (msg) => {
      if (String(msg.rideRequestId) !== String(id)) return;
      if (String(msg.senderId) === String(user?._id)) return;
      const onChatPage = location.pathname.includes(`/ride-request/${id}/chat`);
      if (!onChatPage) {
        setChatUnread((n) => n + 1);
        toast(`${msg.senderName || 'Rider'}: ${msg.message}`, { icon: '💬', duration: 5000 });
      }
    },
    'ride-request:driver-location': (p) => {
      if (String(p.requestId) !== String(id) || isCompleted) return;
      setDriverPos({ lat: p.lat, lng: p.lng });
      setSession((s) =>
        s
          ? {
              ...s,
              phase: p.phase,
              driverEtaMinutes: p.etaMinutes,
              driverDistanceText: p.distanceText,
              driverLiveLocation: { type: 'Point', coordinates: [p.lng, p.lat] }
            }
          : s
      );
    },
    'ride-request:driver-here': (p) => {
      if (String(p.requestId) !== String(id)) return;
      setSession((s) =>
        s ? { ...s, phase: 'WAITING_PASSENGER', waitCountdownEndsAt: p.waitCountdownEndsAt } : s
      );
      if (!isDriver) toast('Driver is here — head to pickup!', { icon: '📍' });
    },
    'ride-request:started': (p) => {
      if (String(p.requestId) !== String(id)) return;
      setSession((s) => (s ? { ...s, status: 'IN_PROGRESS', phase: 'IN_PROGRESS' } : s));
      toast.success('Ride started');
    },
    'ride-request:completed': (p) => {
      if (String(p?.requestId) !== String(id)) return;
      const completed = p?.request
        ? { ...p.request, status: 'COMPLETED', phase: 'COMPLETED' }
        : null;
      setSession((s) =>
        completed || (s ? { ...s, status: 'COMPLETED', phase: 'COMPLETED', completedBy: p.completedBy } : s)
      );
      if (completed) onSessionChange?.(completed);
      if (p.completedBy === 'DRIVER' && !isDriver) {
        setDriverEndedTrip(true);
        toast.success('Driver ended the ride — confirm when ready');
      } else if (isDriver) {
        setReviewRideId(id);
      } else {
        setDriverEndedTrip(true);
      }
    },
    'ride-request:cancelled': (p) => {
      if (String(p?.requestId) !== String(id)) return;
      toast('Ride was cancelled');
      onSessionChange?.(null);
    },
    'ride-request:fare-updated': (p) => {
      if (String(p.requestId) !== String(id)) return;
      setSession((s) => (s ? { ...s, agreedFare: p.agreedFare, passengerOfferedFare: p.agreedFare } : s));
    }
  });

  useEffect(() => {
    if (id) joinRideRequestRoom(id);
  }, [id, joinRideRequestRoom]);

  useEffect(() => {
    if (!id || isCompleted) return;
    refresh();
  }, [id, isCompleted, refresh]);

  useEffect(() => {
    if (isCompleted) {
      setDriverPos(null);
    }
  }, [isCompleted]);

  useEffect(() => {
    const coords = session?.driverLiveLocation?.coordinates;
    if (isCompleted) return;
    if (coords?.length === 2) {
      setDriverPos({ lat: coords[1], lng: coords[0] });
    }
  }, [session?.driverLiveLocation]);

  useEffect(() => {
    if (!isDriver || !id || !['ACCEPTED', 'IN_PROGRESS'].includes(session?.status)) return undefined;
    const tick = async () => {
      try {
        const pt = await resolveCurrentLocationAsPoint();
        setDriverPos(pt);
        await rideRequestService.updateLocation(id, { lat: pt.lat, lng: pt.lng });
      } catch {
        /* ignore */
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, [isDriver, id, session?.status]);

  useEffect(() => {
    if (isDriver || !id || !['ACCEPTED', 'IN_PROGRESS'].includes(session?.status)) return undefined;
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [isDriver, id, session?.status, refresh]);

  useEffect(() => {
    if (session?.phase !== 'WAITING_PASSENGER' || !session?.waitCountdownEndsAt) {
      setWaitLeft(null);
      return undefined;
    }
    const end = new Date(session.waitCountdownEndsAt).getTime();
    const idt = setInterval(() => {
      const rem = Math.max(0, end - Date.now());
      setWaitLeft(rem);
    }, 500);
    return () => clearInterval(idt);
  }, [session?.phase, session?.waitCountdownEndsAt]);

  const driverMarker = driverPos?.lat
    ? [
        {
          id: 'driver',
          lat: driverPos.lat,
          lng: driverPos.lng,
          title: 'Driver',
          iconHtml: driverIcon,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        }
      ]
    : [];

  const inTrip = session?.phase === 'IN_PROGRESS' || session?.status === 'IN_PROGRESS';
  const enRouteToPickup =
    !inTrip && !isCompleted && ['ACCEPTED'].includes(session?.status);
  const mapPickup = pickup;
  const routeFrom = driverPos?.lat != null ? driverPos : null;
  const routeTo = inTrip ? dropoff : pickup;
  const showLivePickupDistance = enRouteToPickup && !isCompleted;
  const hasLiveDistance =
    Boolean(session.driverDistanceText) &&
    session.driverDistanceText !== '0 m' &&
    Number(session.driverEtaMinutes) > 0;

  const pingHere = async () => {
    setBusy(true);
    try {
      const res = await rideRequestService.pingHere(id);
      if (res.success) {
        setSession(res.data);
        toast.success('Passenger notified — 5 min wait started');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not ping');
    } finally {
      setBusy(false);
    }
  };

  const startRide = async () => {
    setBusy(true);
    try {
      const res = await rideRequestService.startRide(id);
      if (res.success) {
        setSession(res.data);
        toast.success('Ride in progress');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start');
    } finally {
      setBusy(false);
    }
  };

  const completeRide = async () => {
    setBusy(true);
    try {
      const res = await rideRequestService.completeRide(id);
      if (res.success) {
        setSession(res.data);
        toast.success(isDriver ? 'Ride completed' : 'Trip confirmed complete');
        setReviewRideId(id);
        setDriverEndedTrip(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const cancelRide = async () => {
    if (!window.confirm('Cancel this ride? This cannot be undone.')) return;
    setBusy(true);
    try {
      await rideRequestService.cancelRide(id);
      toast.success('Ride cancelled');
      onSessionChange?.(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel');
    } finally {
      setBusy(false);
    }
  };

  const openReview = () => setReviewRideId(id);

  const finishReview = async () => {
    if (id) {
      try {
        await rideRequestService.dismissRide(id);
      } catch {
        /* already dismissed or reviewed */
      }
    }
    setReviewRideId(null);
    setDriverEndedTrip(false);
    onSessionChange?.(null);
  };

  if (!session) return null;

  const otherName = isDriver
    ? session.passengerId?.name || 'Passenger'
    : session.acceptedDriverId?.name || 'Driver';

  const showPassengerConfirm =
    !isDriver && (isCompleted || driverEndedTrip) && !reviewRideId;

  return (
    <div className="space-y-4">
      {reviewRideId && (
        <RideReviewReportModal
          rideRequestId={reviewRideId}
          otherPartyName={otherName}
          onDone={finishReview}
        />
      )}

      {showPassengerConfirm && (
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 to-slateCustom-900/80 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-lg">Driver finished the ride</p>
              <p className="text-sm text-white/65 mt-1">
                Confirm the trip is complete, then rate your experience.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" fullWidth={false} disabled={busy} onClick={completeRide}>
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Confirm complete
            </AppButton>
            <AppButton type="button" fullWidth={false} variant="secondary" disabled={busy} onClick={openReview}>
              <Star className="h-4 w-4 inline mr-1" />
              Rate trip
            </AppButton>
          </div>
        </div>
      )}

      <div
        className={`glass-panel p-4 rounded-2xl border ${
          isCompleted ? 'border-emerald-500/50' : 'border-emerald-500/30'
        }`}
      >
        <p className="text-[10px] uppercase font-bold text-emerald-400">
          {isCompleted ? 'Ride finished' : 'Active ride'} · {session.requestRef}
        </p>
        <h2 className="text-xl font-extrabold text-white mt-1">
          {isDriver ? `Trip with ${otherName}` : `Driver ${otherName}`}
        </h2>
        <p className="text-2xl font-bold text-brand-300 mt-1">
          Total fare: Rs. {session.agreedFare ?? session.passengerOfferedFare}
        </p>
        <p className="text-xs text-white/50 mt-1 capitalize">
          {session.vehicleType?.toLowerCase() || 'ride'} · {session.status?.replace('_', ' ')}
        </p>
        {session.phase === 'WAITING_PASSENGER' && waitLeft != null && (
          <p className="text-sm text-amber-300 mt-2 flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {isDriver ? 'Waiting for passenger' : 'Driver is here'} — {Math.ceil(waitLeft / 60000)}:
            {String(Math.ceil((waitLeft % 60000) / 1000)).padStart(2, '0')} left
          </p>
        )}
        <ul className="text-xs text-white/65 mt-3 space-y-1">
          <li className="flex gap-2">
            <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
            {session.pickup?.address}
          </li>
          <li className="flex gap-2">
            <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
            {session.dropoff?.address}
          </li>
        </ul>
      </div>

      {chatUnread > 0 && !location.pathname.includes('/chat') && (
        <Link
          to={`/ride-request/${id}/chat`}
          className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 no-underline"
          onClick={() => setChatUnread(0)}
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white font-bold text-sm shrink-0">
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
          <span className="text-sm text-white font-semibold">
            {chatUnread} new chat message{chatUnread > 1 ? 's' : ''} — tap to open
          </span>
        </Link>
      )}

      {showLivePickupDistance && hasLiveDistance && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Navigation className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wide">
              {isDriver ? 'Distance to pickup' : 'Driver en route to pickup'}
            </p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{session.driverDistanceText}</p>
            <p className="text-sm text-white/65">
              ~{session.driverEtaMinutes} min ETA · live
            </p>
          </div>
        </div>
      )}

      {!isCompleted && (
        <TripMapView
          className="h-[min(22rem,50vh)] min-h-[260px] w-full"
          pickup={mapPickup}
          destination={routeTo}
          showDestinationMarker={inTrip}
          routeFrom={routeFrom}
          rideMarkers={driverMarker}
          waveCenter={null}
          waveRadiusMeters={0}
          waveAnimating={false}
          flyToPickup={!inTrip && !routeFrom}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {!isCompleted && (
          <Link
            to={`/ride-request/${id}/chat`}
            onClick={() => setChatUnread(0)}
            className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500/20 text-brand-300 font-semibold text-sm no-underline border border-brand-500/30"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
            {chatUnread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-slateCustom-900">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            )}
          </Link>
        )}

        {isDriver && session.phase === 'AT_PICKUP' && !isCompleted && (
          <AppButton type="button" fullWidth={false} disabled={busy} onClick={pingHere}>
            I&apos;m here — ping passenger
          </AppButton>
        )}
        {isDriver &&
          ['WAITING_PASSENGER', 'AT_PICKUP', 'EN_ROUTE', 'MATCHED'].includes(session.phase) &&
          !isCompleted && (
            <AppButton type="button" fullWidth={false} disabled={busy} onClick={startRide}>
              Start ride
            </AppButton>
          )}

        {isDriver && !isCompleted && (
          <AppButton type="button" fullWidth={false} variant="secondary" disabled={busy} onClick={completeRide}>
            <Flag className="h-4 w-4 inline mr-1" />
            End ride
          </AppButton>
        )}

        {!isDriver && !isCompleted && inTrip && (
          <AppButton type="button" fullWidth={false} disabled={busy} onClick={completeRide}>
            <CheckCircle2 className="h-4 w-4 inline mr-1" />
            End trip
          </AppButton>
        )}

        {canPassengerCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={cancelRide}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-500/40 text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <XCircle className="h-4 w-4" />
            {session?.status === 'ACCEPTED' ? 'Cancel before trip starts' : 'Cancel ride'}
          </button>
        )}

        {!isDriver && isCompleted && !showPassengerConfirm && (
          <AppButton type="button" fullWidth={false} disabled={busy} onClick={openReview}>
            <Star className="h-4 w-4 inline mr-1" />
            Rate your trip
          </AppButton>
        )}
      </div>

    </div>
  );
}

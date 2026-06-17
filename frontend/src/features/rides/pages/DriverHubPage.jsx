import { useEffect, useState } from 'react';
import { Truck, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import DriverIncomingRequestsPanel from '../components/DriverIncomingRequestsPanel';
import DriverAwaitingPanel from '../components/DriverAwaitingPanel';
import ActiveRideSession from '../components/ActiveRideSession';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { useAppSocket } from '@/hooks/useAppSocket';
import { useAuth } from '@/hooks/useAuth';

export default function DriverHubPage() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  const [awaiting, setAwaiting] = useState(null);
  const [offerResponse, setOfferResponse] = useState(null);
  const isOnline = user?.driverAvailability?.isOnline;

  const loadCurrent = () => {
    rideRequestService.getCurrent().then((res) => {
      if (!res.success || !res.data?.status) {
        setActiveRide(null);
        return;
      }
      const st = res.data.status;
      const closed =
        (st === 'COMPLETED' && res.data.driverClosedAt) ||
        res.data.viewerSessionClosed;
      if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(st) && !closed) {
        setActiveRide(res.data);
      } else {
        setActiveRide(null);
      }
    });
  };

  useEffect(() => {
    loadCurrent();
  }, []);

  useAppSocket({
    'ride-request:matched': (p) => {
      setAwaiting(null);
      if (p.request) setActiveRide(p.request);
      else loadCurrent();
      toast.success(p.message || 'Ride accepted!');
    },
    'ride-request:awaiting-passenger': (p) => {
      setAwaiting({
        requestId: p.requestId,
        respondBy: p.respondBy,
        action: p.action,
        counterFare: p.counterFare
      });
    },
    'ride-request:offer-response': (p) => {
      setAwaiting(null);
      setOfferResponse(p.message || 'Passenger declined');
      setTimeout(() => setOfferResponse(null), 5000);
    },
    'ride-request:taken': (p) => {
      setAwaiting((a) =>
        a?.requestId && String(a.requestId) === String(p?.requestId) ? null : a
      );
    },
    'ride-request:cancelled': () => {
      setAwaiting(null);
      setActiveRide(null);
      loadCurrent();
    },
    'ride-request:completed': (p) => {
      if (p?.request) setActiveRide(p.request);
      else loadCurrent();
      toast.success('Ride completed — rate your passenger');
    }
  });

  if (activeRide) {
    const tripDone = activeRide.status === 'COMPLETED';
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <ActiveRideSession
          session={activeRide}
          isDriver
          onSessionChange={(s) => {
            setActiveRide(s);
            if (!s) loadCurrent();
          }}
        />
        {!tripDone && (
          <section>
            <h2 className="text-lg font-bold text-white mb-3">Nearby requests</h2>
            <p className="text-sm text-white/60 mb-4">
              Finish this trip before accepting another on-demand request.
            </p>
            <DriverIncomingRequestsPanel onCountChange={setPendingCount} />
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-0 flex flex-col max-w-4xl mx-auto">
      <header className="mb-5 sm:mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Driver</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 mt-1">
          <Truck className="w-8 h-8 text-emerald-400" />
          Driver hub
        </h1>
        <p className="text-sm text-white/75 mt-2 max-w-xl">
          Go online to receive live on-demand passenger requests (bike, rickshaw, or car).
          Scheduled carpools are managed under <strong className="text-brand-300">Carpooling</strong> in
          the menu.
        </p>
      </header>

      {!isOnline && (
        <div className="mb-4 flex gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <Radio className="h-5 w-5 shrink-0 text-amber-400" />
          <p>
            You are <strong>offline</strong>. Use <strong>Go online</strong> in the sidebar to
            receive requests.
          </p>
        </div>
      )}

      {offerResponse && (
        <p className="text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-lg px-3 py-2 mb-4">
          {offerResponse}
        </p>
      )}
      {awaiting && (
        <DriverAwaitingPanel
          respondBy={awaiting.respondBy}
          action={awaiting.action}
          counterFare={awaiting.counterFare}
          onExpired={() => setAwaiting(null)}
        />
      )}

      <DriverIncomingRequestsPanel onCountChange={setPendingCount} />
    </div>
  );
}

import { useState, useCallback } from 'react';
import { Users, Car, Inbox } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { isDriverFullyApproved } from '@/utils/commuterRole';
import CarpoolSearchPanel from '../components/CarpoolSearchPanel';
import OfferRideForm from '@/features/rides/components/OfferRideForm';
import DriverRequestsPanel from '@/features/rides/components/DriverRequestsPanel';
import DriverManageRides from '@/features/bookings/components/DriverManageRides';
import { hasApprovedCar } from '@/utils/driverVehicles';
import { useEffect } from 'react';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';

const tabClass = (active) =>
  `flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold border transition-all appearance-none bg-transparent ${
    active
      ? 'border-brand-500 bg-brand-500/15 text-white shadow-sm shadow-brand-500/10'
      : 'border-brand-500/35 text-white/85 hover:border-brand-500 hover:bg-brand-500/10'
  }`;

export default function CarpoolingPage() {
  const { isRider, isDriver, isBoth } = useRoles();
  const { user } = useAuth();
  const [tab, setTab] = useState(isRider ? 'browse' : 'manage');
  const [canPublish, setCanPublish] = useState(false);
  const [ridesRefreshKey, setRidesRefreshKey] = useState(0);
  const bumpRidesRefresh = useCallback(() => setRidesRefreshKey((k) => k + 1), []);
  const driverOk = isDriverFullyApproved(user);

  useEffect(() => {
    if (!isDriver) return;
    api.get(endpoints.users.profile).then((res) => {
      if (res.data?.success) {
        setCanPublish(hasApprovedCar(res.data.data?.vehicles || []));
      }
    });
  }, [isDriver]);

  const showBrowse = isRider;
  const showManage = isDriver && driverOk && canPublish;

  useEffect(() => {
    if (tab === 'manage' && !showManage && showBrowse) setTab('browse');
    if (tab === 'browse' && !showBrowse && showManage) setTab('manage');
  }, [tab, showBrowse, showManage]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Carpooling</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 mt-1">
          <Users className="w-8 h-8 text-brand-400" />
          Shared rides
        </h1>
        <p className="text-sm text-white/75 mt-2 max-w-xl">
          One active trip at a time. Book a seat or publish your own — search is hidden while you
          have a pending or confirmed carpool.
        </p>
      </header>

      {isBoth && (showBrowse || showManage) && (
        <div className="flex gap-2 p-1 rounded-xl bg-brand-500/5 border border-brand-500/25">
          {showBrowse && (
            <button type="button" onClick={() => setTab('browse')} className={tabClass(tab === 'browse')}>
              <Users className="h-4 w-4" />
              Find carpool
            </button>
          )}
          {showManage && (
            <button type="button" onClick={() => setTab('manage')} className={tabClass(tab === 'manage')}>
              <Car className="h-4 w-4" />
              My carpools
            </button>
          )}
        </div>
      )}

      {tab === 'browse' && showBrowse && <CarpoolSearchPanel />}

      {tab === 'manage' && showManage && (
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-brand-400" />
              Publish a carpool
            </h2>
            <OfferRideForm variant="carpool" onPublished={() => setTab('manage')} />
          </section>

          <section>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Inbox className="h-5 w-5 text-amber-400" />
              Booking requests
            </h2>
            <p className="text-sm text-white/60 mb-4">
              Passengers who applied for a seat on your published rides appear here.
            </p>
            <DriverRequestsPanel onBookingChanged={bumpRidesRefresh} />
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-4">Your published rides</h2>
            <DriverManageRides refreshKey={ridesRefreshKey} />
          </section>
        </div>
      )}

      {tab === 'manage' && isDriver && !driverOk && (
        <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 text-sm text-amber-100">
          Complete driver verification and get a car approved before publishing carpools.
        </div>
      )}

      {!showBrowse && !showManage && (
        <div className="glass-panel p-6 rounded-2xl text-sm text-white/70">
          Switch to Passenger or complete driver setup to use carpooling.
        </div>
      )}
    </div>
  );
}

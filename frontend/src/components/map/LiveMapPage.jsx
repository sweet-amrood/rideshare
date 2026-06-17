import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Map, Navigation, Car, Users } from 'lucide-react';
import TripMapView from './TripMapView';
import LocationAddressButton from './LocationAddressButton';
import { resolveCurrentLocationAsPoint, geolocationErrorMessage } from './geolocation';
import AppButton from '@/components/common/AppButton';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import { useRoles } from '@/hooks/useRoles';

export default function LiveMapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromFind = location.state || {};
  const { isRider, isDriver } = useRoles();

  const [pickup, setPickup] = useState(fromFind.pickup || null);
  const [destination, setDestination] = useState(fromFind.destination || null);
  const [activeField, setActiveField] = useState('pickup');
  const [searching, setSearching] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(null);
  const [locatingPickup, setLocatingPickup] = useState(false);

  const passengerMode = isRider;
  const driverMode = isDriver && !isRider;

  const useCurrentLocationForPickup = async () => {
    setActiveField('pickup');
    setLocatingPickup(true);
    try {
      const point = await resolveCurrentLocationAsPoint({
        onAddressResolved: (refined) => setPickup(refined)
      });
      setPickup(point);
      setActiveField('destination');
      toast.success('Pickup set — updating address…');
    } catch (err) {
      toast.error(geolocationErrorMessage(err));
    } finally {
      setLocatingPickup(false);
    }
  };

  const handleNearby = async () => {
    if (!pickup?.lat) {
      toast.error('Set pickup first — My location or pick on map');
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.post(endpoints.rides.search, {
        originLng: pickup.lng,
        originLat: pickup.lat,
        destLng: destination?.lng,
        destLat: destination?.lat
      });
      const count = data.data?.length ?? 0;
      setNearbyCount(count);
      toast.success(count ? `Found ${count} nearby carpools` : 'No carpools match this route yet');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="-m-4 md:-m-8 relative min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-2rem)]">
      <div className="absolute inset-0 z-0">
        <TripMapView
          className="h-full w-full rounded-none border-0"
          pickup={passengerMode ? pickup : null}
          destination={passengerMode ? destination : null}
          interactive
          flyToPickup={passengerMode}
          activeStep={passengerMode ? activeField : null}
          onActiveStepChange={passengerMode ? setActiveField : undefined}
          onPickupChange={
            passengerMode
              ? (p) => {
                  setPickup(p);
                  setActiveField('destination');
                }
              : undefined
          }
          onDestinationChange={
            passengerMode
              ? (d) => {
                  setDestination(d);
                  setActiveField('pickup');
                }
              : undefined
          }
        />
      </div>

      <aside className="absolute top-3 left-3 z-[1000] w-[min(100%,22rem)] sm:w-80 glass-panel p-4 rounded-2xl shadow-xl space-y-3 pointer-events-auto max-h-[calc(100vh-6rem)] overflow-y-auto">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
          <Map className="h-4 w-4 text-brand-400" />
          Live map
        </h2>

        {driverMode ? (
          <>
            <p className="text-[11px] text-white/70">
              You are in <strong className="text-white">Driver</strong> mode. Use the map to see
              routes; passengers book seats on rides you publish.
            </p>
            <div className="flex flex-col gap-2">
              <AppButton type="button" onClick={() => navigate('/offer')}>
                <Car className="inline h-4 w-4 mr-1" />
                Driver hub — manage rides
              </AppButton>
              <AppButton type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
                Dashboard & booking requests
              </AppButton>
            </div>
            <p className="text-[10px] text-white/55 border-t border-slateCustom-700 pt-2">
              Want to book a seat as a passenger? Open Profile → Role and switch to{' '}
              <strong className="text-brand-300">Passenger</strong>.
            </p>
          </>
        ) : (
          <>
            <p className="text-[11px] text-white/70">Click a field, then map or GPS</p>

            <LocationAddressButton
              type="pickup"
              point={pickup}
              active={activeField === 'pickup'}
              locating={locatingPickup}
              onSelect={() => setActiveField('pickup')}
              onAuto={useCurrentLocationForPickup}
              onClear={() => {
                setPickup(null);
                setActiveField('pickup');
              }}
            />
            <LocationAddressButton
              type="destination"
              point={destination}
              active={activeField === 'destination'}
              onSelect={() => setActiveField('destination')}
              onClear={() => {
                setDestination(null);
                setActiveField('destination');
              }}
            />

            {nearbyCount != null && (
              <p className="text-xs text-brand-300 flex items-center gap-1">
                <Navigation className="h-3.5 w-3.5" />
                {nearbyCount} carpools near this route
              </p>
            )}

            <div className="flex flex-col gap-2">
              <AppButton type="button" disabled={searching} onClick={handleNearby}>
                <Search className="inline h-4 w-4 mr-1" />
                {searching ? 'Searching…' : 'Nearby rides'}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                onClick={() => navigate('/find', { state: { pickup, destination } })}
              >
                <Users className="inline h-4 w-4 mr-1" />
                Find & book a ride
              </AppButton>
            </div>

            {isDriver && isRider && (
              <button
                type="button"
                onClick={() => navigate('/offer')}
                className="text-xs font-semibold text-white/60 border-0 bg-transparent outline-none text-left"
              >
                Driver hub →
              </button>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

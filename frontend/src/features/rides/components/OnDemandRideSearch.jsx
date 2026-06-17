import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Radio, Bike, Loader2 } from 'lucide-react';
import TripMapView from '@/components/map/TripMapView';
import AppButton from '@/components/common/AppButton';
import FareEstimatePanel from './FareEstimatePanel';
import PassengerFareOfferBanner from './PassengerFareOfferBanner';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { useAppSocket } from '@/hooks/useAppSocket';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';

const bikerIconHtml =
  '<div class="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg text-white text-lg">🏍</div>';

export default function OnDemandRideSearch({ pickup, destination, vehicleType, onMatched }) {
  const [requestId, setRequestId] = useState(null);
  const [request, setRequest] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [waveRadius, setWaveRadius] = useState(1500);
  const [waveIndex, setWaveIndex] = useState(0);
  const [offeredFare, setOfferedFare] = useState(null);
  const [estimate, setEstimate] = useState(null);
  const [starting, setStarting] = useState(false);
  const [searching, setSearching] = useState(false);

  const waveRadii = estimate?.waveRadiiMeters || [1500, 3000, 5000, 8000];

  const refreshRequest = useCallback(async (id) => {
    const res = await rideRequestService.get(id);
    if (res.success) {
      setRequest(res.data.request);
      setNearbyDrivers(res.data.nearbyDrivers || []);
    }
  }, []);

  useAppSocket({
    'ride-request:offer-updated': () => requestId && refreshRequest(requestId),
    'ride-request:fare-offer': () => requestId && refreshRequest(requestId),
    'ride-request:matched': (p) => {
      toast.success('Driver matched!');
      onMatched?.(p);
      if (requestId) refreshRequest(requestId);
    },
    'ride-request:searching': (p) => {
      if (p.nearbyDrivers) setNearbyDrivers(p.nearbyDrivers);
    }
  });

  useEffect(() => {
    if (!searching || !requestId) return undefined;
    const t = setInterval(() => {
      setWaveIndex((i) => {
        const next = (i + 1) % waveRadii.length;
        const r = waveRadii[next];
        setWaveRadius(r);
        rideRequestService.expandWave(requestId, r).then((res) => {
          if (res.success) {
            setNearbyDrivers(res.data.nearbyDrivers || []);
            setRequest(res.data.request);
          }
        }).catch(() => {});
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [searching, requestId, waveRadii]);

  useEffect(() => {
    if (!requestId || !searching) return undefined;
    const poll = setInterval(() => refreshRequest(requestId), 6000);
    return () => clearInterval(poll);
  }, [requestId, searching, refreshRequest]);

  const driverMarkers = useMemo(
    () =>
      nearbyDrivers.map((d) => ({
        id: d.driverId,
        lat: d.lat,
        lng: d.lng,
        title: `${d.name} · ${d.distanceText} · ~${d.etaMinutes} min`,
        iconHtml: bikerIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })),
    [nearbyDrivers]
  );

  const startSearch = async () => {
    if (!pickup?.lat || !destination?.lat) {
      toast.error('Set pickup and destination first');
      return;
    }
    setStarting(true);
    try {
      const res = await rideRequestService.create({
        pickup: { address: pickup.name || pickup.address, location: { coordinates: [pickup.lng, pickup.lat] } },
        dropoff: {
          address: destination.name || destination.address,
          location: { coordinates: [destination.lng, destination.lat] }
        },
        vehicleType,
        passengerOfferedFare: offeredFare
      });
      if (res.success) {
        setRequestId(res.data.request._id);
        setRequest(res.data.request);
        setNearbyDrivers(res.data.nearbyDrivers || []);
        setSearching(true);
        setWaveRadius(waveRadii[0]);
        toast.success('Searching for nearby drivers…');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start search');
    } finally {
      setStarting(false);
    }
  };

  const counterOffers = (request?.offers || []).filter(
    (o) => o.status === 'COUNTERED' && o.counterFare
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Radio className={`h-5 w-5 text-emerald-400 ${searching ? 'animate-pulse' : ''}`} />
          <h3 className="font-bold text-white">
            {searching
              ? `Looking for ${getVehicleTypeLabel(vehicleType).toLowerCase()} riders nearby`
              : `Request a ${getVehicleTypeLabel(vehicleType).toLowerCase()} on demand`}
          </h3>
        </div>
        <p className="text-sm text-white/65 mb-4">
          {searching
            ? 'Expanding search waves from your pickup. Active drivers in range can accept or send a fare offer.'
            : 'No scheduled carpools? Broadcast to online drivers near your pickup with your fare offer.'}
        </p>

        {!searching && (
          <>
            <FareEstimatePanel
              pickup={pickup}
              destination={destination}
              vehicleType={vehicleType}
              offeredFare={offeredFare}
              onOfferedFareChange={setOfferedFare}
              onEstimateLoaded={setEstimate}
              role="passenger"
            />
            <AppButton
              type="button"
              className="w-full mt-4"
              disabled={starting || offeredFare == null}
              onClick={startSearch}
            >
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Starting…
                </>
              ) : (
                <>
                  <Bike className="h-4 w-4 inline mr-2" />
                  Find nearby drivers
                </>
              )}
            </AppButton>
          </>
        )}
      </div>

      {searching && (
        <>
          <TripMapView
            className="h-[min(20rem,45vh)] min-h-[240px] w-full"
            pickup={pickup}
            destination={destination}
            rideMarkers={driverMarkers}
            waveCenter={pickup}
            waveRadiusMeters={waveRadius}
            waveAnimating
            flyToPickup
          />
          <p className="text-center text-xs text-emerald-300/90 animate-pulse">
            Scanning ~{(waveRadius / 1000).toFixed(1)} km radius · wave {waveIndex + 1}/
            {waveRadii.length}
            {nearbyDrivers.length > 0 && ` · ${nearbyDrivers.length} driver(s) nearby`}
          </p>
        </>
      )}

      {counterOffers.map((offer) => (
        <PassengerFareOfferBanner
          key={offer._id}
          offer={offer}
          requestId={requestId}
          onResponded={() => refreshRequest(requestId)}
        />
      ))}

      {searching && (request?.offers || []).filter((o) => o.status === 'PENDING').length > 0 && (
        <div className="glass-panel p-4 rounded-2xl space-y-2">
          <p className="text-sm font-bold text-white">Drivers ready at your fare</p>
          {(request.offers || [])
            .filter((o) => o.status === 'PENDING')
            .map((offer) => (
              <PassengerFareOfferBanner
                key={offer._id}
                offer={offer}
                requestId={requestId}
                acceptLabel="Accept driver"
                onResponded={() => refreshRequest(requestId)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

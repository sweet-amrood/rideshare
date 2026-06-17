import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Map, Search, Sparkles } from 'lucide-react';
import GoogleMapProvider from '../components/GoogleMapProvider';
import GoogleMapCanvas from '../components/GoogleMapCanvas';
import PlaceAutocomplete from '../components/PlaceAutocomplete';
import TripSummaryCard from '../components/TripSummaryCard';
import NearbyRidesList from '../components/NearbyRidesList';
import RouteOptimizationTips from '../components/RouteOptimizationTips';
import AppButton from '@/components/common/AppButton';
import { useMapsBootstrap } from '../hooks/useMapsBootstrap';
import { useUserLocation } from '../hooks/useUserLocation';
import { useTripRoute } from '../hooks/useTripRoute';
import { mapsService } from '@/api/services/maps.service';
import { DEFAULT_ZOOM } from '../constants';

export default function LiveMapPage() {
  const navigate = useNavigate();
  const { config, loading: bootLoading, error: bootError, isReady } = useMapsBootstrap();
  const { position: userPosition } = useUserLocation(true);
  const { route, loading: routeLoading, error: routeError, loadRoute, clearRoute } = useTripRoute();

  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [tips, setTips] = useState([]);
  const [searching, setSearching] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [highlightRideId, setHighlightRideId] = useState(null);

  const locationBias = userPosition || config?.defaultCenter;

  useEffect(() => {
    if (!pickup?.lat || !destination?.lat) {
      clearRoute();
      return;
    }
    loadRoute(pickup, destination).then(() => setFitKey((k) => k + 1));
  }, [pickup, destination, loadRoute, clearRoute]);

  const nearbyMarkers = useMemo(
    () =>
      nearby.map((item) => {
        const [lng, lat] = item.ride?.origin?.location?.coordinates || [];
        return {
          id: item.ride._id,
          position: lat != null ? { lat, lng } : null,
          title: item.ride.origin?.address,
          onClick: () => setHighlightRideId(item.ride._id)
        };
      }).filter((m) => m.position),
    [nearby]
  );

  const handleSearchNearby = async () => {
    if (!pickup?.lat) {
      toast.error('Set a pickup location first');
      return;
    }
    setSearching(true);
    try {
      const res = await mapsService.nearbyRides({
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address },
        destination: destination?.lat
          ? { lat: destination.lat, lng: destination.lng, address: destination.address }
          : undefined
      });
      if (res.success) {
        setNearby(res.data.rides || []);
        setFitKey((k) => k + 1);
        toast.success(`Found ${res.data.rides?.length || 0} nearby carpools`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleOptimize = async () => {
    if (!pickup?.lat || !destination?.lat) {
      toast.error('Set pickup and destination for route suggestions');
      return;
    }
    setOptimizing(true);
    try {
      const res = await mapsService.routeSuggestions({
        pickup: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: destination.lat, lng: destination.lng }
      });
      if (res.success) {
        setTips(res.data.tips || []);
        const opts = res.data.optimizations || [];
        if (opts.length) {
          setNearby(
            opts.map((o) => ({
              ride: {
                _id: o.rideId,
                driverId: o.driver,
                vehicleId: o.vehicle,
                origin: { address: o.suggestedPickup?.address, location: { coordinates: [o.suggestedPickup?.lng, o.suggestedPickup?.lat] } },
                destination: {},
                departureDate: o.departureDate,
                costPerSeat: o.costPerSeat,
                availableSeats: o.availableSeats
              },
              matchScore: o.matchScore,
              matchLabel: o.matchLabel,
              pickupDeviationMeters: o.pickupWalkMeters,
              destDeviationMeters: o.dropoffWalkMeters,
              etaToPickup: o.etaToPickup
            }))
          );
        }
        toast.success('Route suggestions ready');
        setFitKey((k) => k + 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const onSelectRide = useCallback((item) => {
    const [lng, lat] = item.ride?.origin?.location?.coordinates || [];
    if (lat != null) {
      setPickup({
        lat,
        lng,
        address: item.ride.origin?.address,
        name: 'Carpool pickup'
      });
      setHighlightRideId(item.ride._id);
      setFitKey((k) => k + 1);
    }
  }, []);

  if (bootLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-white/80 text-sm">
        Initializing maps...
      </div>
    );
  }

  if (bootError || !isReady) {
    return (
      <div className="max-w-lg mx-auto py-16 px-6 text-center space-y-4">
        <Map className="h-12 w-12 text-brand-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Google Maps not configured</h2>
        <p className="text-sm text-white/75">{bootError}</p>
        <p className="text-xs text-white/55">
          Enable Maps JavaScript, Places, Directions, Distance Matrix, and Geocoding APIs in Google Cloud.
          Add GOOGLE_MAPS_SERVER_KEY and GOOGLE_MAPS_BROWSER_KEY to backend .env.
        </p>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 relative min-h-[calc(100vh-4rem)] md:min-h-[calc(100vh-2rem)]">
      <div className="absolute inset-0 z-0">
        <GoogleMapProvider apiKey={config.googleMapsApiKey}>
          <GoogleMapCanvas
            zoom={DEFAULT_ZOOM}
            pickup={pickup}
            destination={destination}
            routePath={route?.path || []}
            userPosition={userPosition}
            nearbyMarkers={nearbyMarkers}
            fitBoundsTrigger={fitKey}
          />
        </GoogleMapProvider>
      </div>

      <aside className="absolute top-3 left-3 z-10 w-[min(100%,22rem)] sm:w-80 flex flex-col gap-3 max-h-[calc(100%-1.5rem)] overflow-y-auto pointer-events-none">
        <div className="glass-panel p-4 rounded-2xl pointer-events-auto space-y-3 shadow-xl">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Map className="h-4 w-4 text-brand-400" />
            Plan your trip
          </h2>

          <PlaceAutocomplete
            label="Pickup location"
            placeholder="Pickup point"
            value={pickup}
            onChange={setPickup}
            bias={locationBias}
          />
          <PlaceAutocomplete
            label="Destination"
            placeholder="Where to?"
            value={destination}
            onChange={setDestination}
            bias={pickup || locationBias}
          />

          <TripSummaryCard route={route} loading={routeLoading} error={routeError} />
          <RouteOptimizationTips tips={tips} />

          <div className="flex flex-col gap-2">
            <AppButton type="button" disabled={searching} onClick={handleSearchNearby}>
              <Search className="inline h-4 w-4 mr-1" />
              {searching ? 'Searching...' : 'Nearby rides'}
            </AppButton>
            <AppButton type="button" disabled={optimizing} onClick={handleOptimize} className="!bg-slateCustom-700 hover:!bg-slateCustom-600">
              <Sparkles className="inline h-4 w-4 mr-1" />
              {optimizing ? 'Optimizing...' : 'Route suggestions'}
            </AppButton>
          </div>
        </div>
      </aside>

      <aside className="absolute top-3 right-3 z-10 w-[min(100%,20rem)] sm:w-72 glass-panel rounded-2xl shadow-xl overflow-hidden pointer-events-auto max-h-[70vh] flex flex-col">
        <div className="p-3 border-b border-slateCustom-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Nearby carpools</h3>
        </div>
        <NearbyRidesList
          rides={nearby}
          loading={searching}
          onSelectRide={onSelectRide}
          onBook={(ride) => navigate('/find', { state: { rideId: ride._id } })}
        />
      </aside>

      {userPosition && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-[10px] text-white/70 bg-slateCustom-900/90 px-3 py-1 rounded-full border border-slateCustom-700 pointer-events-none">
          Live location active
        </div>
      )}
    </div>
  );
}

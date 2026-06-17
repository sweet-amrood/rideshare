import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import {
  Ticket,
  Calendar,
  Users,
  AlertCircle,
  MapPin,
  CheckCircle,
  Clock,
  Car,
  Navigation,
  Radio,
  Eye,
  RefreshCw,
  XCircle
} from 'lucide-react';
import FareEstimatePanel from '@/features/rides/components/FareEstimatePanel';
import { TripMapView, LocationAddressButton } from '@/components/map';
import {
  resolveCurrentLocationAsPoint,
  geolocationErrorMessage
} from '@/components/map/geolocation';
import AppButton from '@/components/common/AppButton';
import RideTypeSearchModal from '@/features/rides/components/RideTypeSearchModal';
import PassengerFareOfferBanner from '@/features/rides/components/PassengerFareOfferBanner';
import ActiveRideSession from '@/features/rides/components/ActiveRideSession';
import ActiveCarpoolSession from '@/features/carpool/components/ActiveCarpoolSession';
import { useActiveTrip } from '@/hooks/useActiveTrip';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';
import { rideRequestService } from '@/api/services/rideRequest.service';
import { useAppSocket } from '@/hooks/useAppSocket';

const bikerIconHtml =
  '<div class="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg text-lg">🏍</div>';

export default function FindRide() {
  const location = useLocation();
  const [pickup, setPickup] = useState(location.state?.pickup || null);
  const [destination, setDestination] = useState(location.state?.destination || null);

  useEffect(() => {
    if (location.state?.pickup) setPickup(location.state.pickup);
    if (location.state?.destination) setDestination(location.state.destination);
  }, [location.state]);
  const [depDate, setDepDate] = useState('');
  const [activeField, setActiveField] = useState('pickup');
  const [locatingPickup, setLocatingPickup] = useState(false);

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [waveRadius, setWaveRadius] = useState(1500);
  const [waveRadii, setWaveRadii] = useState([1500, 3000, 5000, 8000]);
  const [waveIndex, setWaveIndex] = useState(0);
  const [liveOffers, setLiveOffers] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [searchAutoCancelAt, setSearchAutoCancelAt] = useState(null);
  const [searchTimeLeftMs, setSearchTimeLeftMs] = useState(null);
  const [driversNotifiedCount, setDriversNotifiedCount] = useState(0);
  const [broadcastFare, setBroadcastFare] = useState(null);
  const [broadcastVehicleType, setBroadcastVehicleType] = useState(null);
  const [broadcastHasAC, setBroadcastHasAC] = useState(false);
  const [updatingFare, setUpdatingFare] = useState(false);
  const [broadcastMinFare, setBroadcastMinFare] = useState(null);
  const [broadcastMaxFare, setBroadcastMaxFare] = useState(null);

  const { commitment, loading: tripLoading, refresh: refreshTrip } = useActiveTrip();

  const applyRequestLocations = useCallback((req) => {
    const [pLng, pLat] = req?.pickup?.location?.coordinates || [];
    const [dLng, dLat] = req?.dropoff?.location?.coordinates || [];
    if (pLat != null) {
      setPickup({
        lat: pLat,
        lng: pLng,
        address: req.pickup?.address,
        name: req.pickup?.address
      });
    }
    if (dLat != null) {
      setDestination({
        lat: dLat,
        lng: dLng,
        address: req.dropoff?.address,
        name: req.dropoff?.address
      });
    }
  }, []);

  const stopSearchBroadcast = useCallback(() => {
    setBroadcasting(false);
    setRequestId(null);
    setLiveOffers([]);
    setNearbyDrivers([]);
    setSearchAutoCancelAt(null);
    setSearchTimeLeftMs(null);
    setWaveIndex(0);
    setWaveRadius(1500);
  }, []);

  const handleActiveSessionChange = useCallback(
    (s) => {
      setActiveRide(s);
      if (!s) {
        setPickup(null);
        setDestination(null);
        stopSearchBroadcast();
        return;
      }
      stopSearchBroadcast();
      if (['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)) {
        applyRequestLocations(s);
      }
    },
    [applyRequestLocations, stopSearchBroadcast]
  );

  const resumeLiveSearch = useCallback(
    async (req) => {
      if (!req?._id) return false;
      if (!['SEARCHING', 'OFFERS_PENDING'].includes(req.status)) return false;
      applyRequestLocations(req);
      setRequestId(req._id);
      setBroadcasting(true);
      setRides([]);
      setSearchAutoCancelAt(req.searchAutoCancelAt || null);
      if (req.searchRadiusMeters) setWaveRadius(req.searchRadiusMeters);
      const detail = await rideRequestService.get(req._id);
      if (detail.success) {
        const st = detail.data?.request?.status;
        if (!['SEARCHING', 'OFFERS_PENDING'].includes(st)) {
          stopSearchBroadcast();
          return false;
        }
        setNearbyDrivers(detail.data.nearbyDrivers || []);
        const req = detail.data.request;
        setDriversNotifiedCount(req?.driversNotifiedCount ?? detail.data.nearbyDrivers?.length ?? 0);
        setBroadcastFare(req?.passengerOfferedFare ?? null);
        setBroadcastVehicleType(req?.vehicleType ?? null);
        setBroadcastHasAC(!!req?.hasAC);
      }
      return true;
    },
    [applyRequestLocations, stopSearchBroadcast]
  );

  useEffect(() => {
    rideRequestService.getActive().then(async (res) => {
      if (!res.success || !res.data) return;
      const st = res.data.status;
      if (['SEARCHING', 'OFFERS_PENDING'].includes(st)) {
        await resumeLiveSearch(res.data);
        toast('Resuming your driver search', { icon: '📡' });
        return;
      }
      if (['ACCEPTED', 'IN_PROGRESS'].includes(st)) {
        setActiveRide(res.data);
        setBroadcasting(false);
        applyRequestLocations(res.data);
        return;
      }
      if (st === 'COMPLETED') {
        setActiveRide(res.data);
        stopSearchBroadcast();
      }
    });
  }, [resumeLiveSearch, applyRequestLocations, stopSearchBroadcast]);

  const pushLiveOffer = useCallback((offer, reqId) => {
    if (!offer?._id) return;
    const expiresAt = Date.now() + 15000;
    setLiveOffers((prev) => {
      const filtered = prev.filter((o) => o._id !== offer._id);
      return [{ ...offer, expiresAt, requestId: reqId }, ...filtered].slice(0, 8);
    });
  }, []);

  const refreshBroadcast = useCallback(
    async (id) => {
      if (!id) return;
      try {
        const res = await rideRequestService.get(id);
        if (!res.success) return;
        const st = res.data?.request?.status;
        if (!['SEARCHING', 'OFFERS_PENDING'].includes(st)) {
          stopSearchBroadcast();
          if (['ACCEPTED', 'IN_PROGRESS'].includes(st)) {
            setActiveRide(res.data.request);
          }
          return;
        }
        setNearbyDrivers(res.data.nearbyDrivers || []);
        const req = res.data?.request;
        if (req?.driversNotifiedCount != null) setDriversNotifiedCount(req.driversNotifiedCount);
        if (req?.passengerOfferedFare != null) setBroadcastFare(req.passengerOfferedFare);
        if (req?.vehicleType) setBroadcastVehicleType(req.vehicleType);
      } catch {
        stopSearchBroadcast();
      }
    },
    [stopSearchBroadcast]
  );

  const applySearchFare = async () => {
    if (!requestId || broadcastFare == null) return;
    setUpdatingFare(true);
    try {
      const res = await rideRequestService.updateSearchFare(requestId, broadcastFare);
      if (res.success) {
        setDriversNotifiedCount(res.data.driversNotifiedCount ?? 0);
        setNearbyDrivers(res.data.nearbyDrivers || []);
        toast.success('Fare updated — drivers notified');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update fare');
    } finally {
      setUpdatingFare(false);
    }
  };

  const cancelActiveSearch = async () => {
    if (requestId) {
      try {
        await rideRequestService.cancelRide(requestId);
        toast.success('Search cancelled');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not cancel');
        return;
      }
    }
    stopSearchBroadcast();
  };

  useAppSocket({
    'ride-request:fare-offer': (p) => {
      if (p.offer) pushLiveOffer(p.offer, p.requestId);
      if (p.requestId) refreshBroadcast(p.requestId);
    },
    'ride-request:matched': (p) => {
      toast.success(p.message || 'Ride accepted!');
      stopSearchBroadcast();
      if (p.request) setActiveRide(p.request);
      else rideRequestService.getCurrent().then((r) => r.success && setActiveRide(r.data));
    },
    'ride-request:driver-here': () => {
      toast('Driver is here — head to pickup!', { icon: '📍' });
      rideRequestService.getCurrent().then((r) => r.success && setActiveRide(r.data));
    },
    'ride-request:completed': (p) => {
      stopSearchBroadcast();
      if (p?.request) {
        setActiveRide(p.request);
        applyRequestLocations(p.request);
      } else {
        rideRequestService.getActive().then((r) => {
          if (r.success && r.data) {
            setActiveRide(r.data);
            applyRequestLocations(r.data);
          }
        });
      }
      if (p?.completedBy === 'DRIVER') {
        toast.success('Driver ended the ride — tap Confirm complete when ready');
      }
    },
    'ride-request:searching': (p) => {
      if (p.driversNotifiedCount != null) setDriversNotifiedCount(p.driversNotifiedCount);
      if (p.passengerOfferedFare != null) setBroadcastFare(p.passengerOfferedFare);
    },
    'ride-request:cancelled': (p) => {
      setActiveRide(null);
      setBroadcasting(false);
      setRequestId(null);
      setLiveOffers([]);
      setSearchAutoCancelAt(null);
      toast(
        p?.auto
          ? 'Search auto-cancelled after 5 minutes with no match'
          : 'Ride cancelled'
      );
    }
  });

  useEffect(() => {
    if (!broadcasting || !requestId) return undefined;
    const waveTimer = setInterval(() => {
      setWaveIndex((i) => {
        const next = (i + 1) % waveRadii.length;
        const r = waveRadii[next];
        setWaveRadius(r);
        rideRequestService
          .expandWave(requestId, r)
          .then((res) => {
            if (res.success) setNearbyDrivers(res.data.nearbyDrivers || []);
          })
          .catch((err) => {
            const msg = err.response?.data?.message || '';
            if (
              err.response?.status === 409 ||
              msg.toLowerCase().includes('no longer active') ||
              msg.toLowerCase().includes('not found')
            ) {
              stopSearchBroadcast();
            }
          });
        return next;
      });
    }, 4000);
    const poll = setInterval(() => refreshBroadcast(requestId), 8000);
    return () => {
      clearInterval(waveTimer);
      clearInterval(poll);
    };
  }, [broadcasting, requestId, waveRadii, refreshBroadcast, stopSearchBroadcast]);

  useEffect(() => {
    if (!broadcasting || !searchAutoCancelAt) {
      setSearchTimeLeftMs(null);
      return undefined;
    }
    const deadline = new Date(searchAutoCancelAt).getTime();
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setSearchTimeLeftMs(left);
      if (left <= 0) {
        setBroadcasting(false);
        setRequestId(null);
        setSearchAutoCancelAt(null);
        setLiveOffers([]);
        setNearbyDrivers([]);
        rideRequestService.getActive().then((r) => {
          if (!r.data) return;
          if (['ACCEPTED', 'IN_PROGRESS'].includes(r.data.status)) {
            setActiveRide(r.data);
          }
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [broadcasting, searchAutoCancelAt]);

  const startBroadcast = async (filters) => {
    if (!pickup?.lat || !destination?.lat) return;
    try {
      const active = await rideRequestService.getActive();
      if (active.success && active.data?._id) {
        const st = active.data.status;
        if (['SEARCHING', 'OFFERS_PENDING'].includes(st)) {
          const resumed = await resumeLiveSearch(active.data);
          if (resumed) {
            toast('Resuming your active ride search', { icon: '📡' });
            return;
          }
        }
        if (['ACCEPTED', 'IN_PROGRESS'].includes(st)) {
          setActiveRide(active.data);
          applyRequestLocations(active.data);
          toast('You already have an active ride', { icon: '🚗' });
          return;
        }
        if (st === 'COMPLETED') {
          setActiveRide(null);
        }
      }
      stopSearchBroadcast();
      const res = await rideRequestService.create({
        pickup: { address: pickup.name || pickup.address, location: { coordinates: [pickup.lng, pickup.lat] } },
        dropoff: {
          address: destination.name || destination.address,
          location: { coordinates: [destination.lng, destination.lat] }
        },
        vehicleType: filters.vehicleType,
        passengerOfferedFare: filters.passengerOfferedFare,
        hasAC: filters.hasAC || undefined
      });
      if (res.success) {
        const req = res.data.request;
        setRequestId(req._id);
        setNearbyDrivers(res.data.nearbyDrivers || []);
        setWaveRadii(res.data.estimate?.waveRadiiMeters || waveRadii);
        setWaveRadius(res.data.estimate?.waveRadiiMeters?.[0] || 1500);
        setSearchAutoCancelAt(req.searchAutoCancelAt || null);
        setBroadcasting(true);
        setRides([]);
        setDriversNotifiedCount(res.data.driversNotifiedCount ?? res.data.nearbyDrivers?.length ?? 0);
        setBroadcastFare(filters.passengerOfferedFare ?? req.passengerOfferedFare);
        setBroadcastVehicleType(filters.vehicleType ?? req.vehicleType);
        setBroadcastHasAC(!!(filters.hasAC ?? req.hasAC));
        if (res.data.estimate) {
          setBroadcastMinFare(res.data.estimate.minFare);
          setBroadcastMaxFare(res.data.estimate.maxFare);
        } else if (req.minFare != null) {
          setBroadcastMinFare(req.minFare);
          setBroadcastMaxFare(req.maxFare);
        }
        applyRequestLocations(req);
        toast.success('Searching for nearby drivers…');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start driver search');
    }
  };

  const driverMarkers = useMemo(
    () =>
      nearbyDrivers.map((d) => ({
        id: d.driverId,
        lat: d.lat,
        lng: d.lng,
        title: `${d.name} · ${d.distanceText || `${d.distanceKm} km`}`,
        iconHtml: bikerIconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })),
    [nearbyDrivers]
  );

  const rideMarkers = useMemo(
    () =>
      rides
        .map((ride) => {
          const [lng, lat] = ride.origin?.location?.coordinates || [];
          return {
            id: ride._id,
            lat,
            lng,
            title: `${ride.driverId?.name || 'Driver'} · Rs.${ride.costPerSeat}`
          };
        })
        .filter((m) => m.lat != null),
    [rides]
  );

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

  const handleFindClick = (e) => {
    e.preventDefault();
    setError('');
    if (!pickup?.lat) {
      setError('Set pickup first — tap the Pickup field, then map or My location.');
      return;
    }
    setShowTypeModal(true);
  };

  const executeSearch = async (filters) => {
    setLoading(true);
    setError('');
    setBookingSuccess('');
    setShowTypeModal(false);
    setLastSearch(filters);
    setRides([]);
    try {
      await startBroadcast(filters);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const mapHint =
    activeField === 'pickup'
      ? 'Pickup selected — tap the map (green) or My location, then choose destination.'
      : activeField === 'destination'
        ? 'Destination selected — tap the map (red) to set drop-off.'
        : pickup?.lat && destination?.lat
          ? 'Route on map. Click a field above to change pickup or destination.'
          : 'Click Pickup or Destination above, then set each on the map.';

  if (activeRide) {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        <ActiveRideSession
          session={activeRide}
          isDriver={false}
          onSessionChange={handleActiveSessionChange}
        />
      </div>
    );
  }

  if (!tripLoading && commitment?.kind === 'CARPOOL_BOOKING') {
    return (
      <div className="max-w-6xl mx-auto pb-10">
        <ActiveCarpoolSession booking={commitment.data} onDismiss={refreshTrip} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Passenger</p>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3 mt-1">
            <Ticket className="h-8 w-8 text-brand-400" />
            Book Ride
          </h1>
          <p className="text-white/75 text-sm mt-2 max-w-xl">
            On-demand rides — broadcast to nearby drivers. For scheduled carpools, use{' '}
            <Link to="/carpooling" className="text-brand-400 font-semibold no-underline hover:text-brand-300">
              Carpooling
            </Link>
            .
          </p>
        </div>
        <Link
          to="/map"
          state={{ pickup, destination }}
          className="text-sm font-semibold text-brand-400 no-underline hover:text-brand-300 shrink-0"
        >
          Open full-screen map →
        </Link>
      </div>

      <div className={`glass-panel p-4 sm:p-5 rounded-2xl space-y-4 ${broadcasting ? 'border border-emerald-500/30' : ''}`}>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          {broadcasting ? (
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
          ) : (
            <Navigation className="h-4 w-4 text-brand-400" />
          )}
          {broadcasting ? 'Searching for nearby drivers' : 'Your trip'}
        </h2>
        {broadcasting && broadcastVehicleType && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-brand-500/20 text-brand-200 border border-brand-500/35">
              <Car className="h-3.5 w-3.5" />
              {getVehicleTypeLabel(broadcastVehicleType)}
              {broadcastHasAC ? ' · AC' : ''}
            </span>
            {liveOffers.length > 0 && (
              <span className="text-xs text-violet-300/90 font-medium">
                {liveOffers.length} driver offer{liveOffers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
        {broadcasting && (
          <>
            <p className="text-xs text-emerald-300/90">
              Broadcasting from pickup · wave {waveIndex + 1}/{waveRadii.length} (~
              {(waveRadius / 1000).toFixed(1)} km)
              {nearbyDrivers.length > 0 && ` · ${nearbyDrivers.length} online nearby`}
              {searchTimeLeftMs != null && (
                <>
                  {' '}
                  · auto-cancel in {Math.ceil(searchTimeLeftMs / 60000)}:
                  {String(Math.ceil((searchTimeLeftMs % 60000) / 1000)).padStart(2, '0')}
                </>
              )}
            </p>
            <div className="rounded-lg border border-brand-500/25 bg-brand-500/5 px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-white/80 font-semibold">
                  <Eye className="h-3.5 w-3.5 text-brand-400" />
                  Drivers seeing your request
                </span>
                <span className="font-bold text-brand-300 tabular-nums">{driversNotifiedCount}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slateCustom-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(8, driversNotifiedCount * 12))}%`
                  }}
                />
              </div>
              <p className="text-[10px] text-white/50">
                Count includes drivers notified in this search (updates when you change fare).
              </p>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        </div>

        <p className="text-xs text-white/55">{mapHint}</p>

        <TripMapView
          className="h-[min(22rem,50vh)] min-h-[280px] w-full"
          pickup={pickup}
          destination={destination}
          rideMarkers={broadcasting ? driverMarkers : rideMarkers}
          waveCenter={broadcasting ? pickup : null}
          waveRadiusMeters={broadcasting ? waveRadius : 0}
          waveAnimating={broadcasting}
          interactive={!broadcasting}
          flyToPickup
          activeStep={activeField}
          onActiveStepChange={setActiveField}
          onPickupChange={(p) => {
            setPickup(p);
            setActiveField('destination');
          }}
          onDestinationChange={(d) => {
            setDestination(d);
            setActiveField('pickup');
          }}
        />

        {broadcasting && broadcastVehicleType && pickup?.lat && destination?.lat && (
          <div className="space-y-3">
            {liveOffers.length > 0 ? (
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-4 space-y-4">
                <p className="text-sm text-white/85">
                  Adjust your offer while you review driver responses below.
                </p>
                {broadcastMinFare != null && broadcastMaxFare != null && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Your fare</span>
                      <span className="font-bold text-brand-300 tabular-nums">
                        Rs. {broadcastFare ?? '—'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={broadcastMinFare}
                      max={broadcastMaxFare}
                      step={10}
                      value={Math.min(
                        broadcastMaxFare,
                        Math.max(broadcastMinFare, broadcastFare ?? broadcastMinFare)
                      )}
                      onChange={(e) => setBroadcastFare(Number(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                    <div className="flex justify-between text-[11px] text-white/45">
                      <span>Rs. {broadcastMinFare}</span>
                      <span>Rs. {broadcastMaxFare}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updatingFare || broadcastFare == null}
                    onClick={applySearchFare}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white border border-brand-400/40 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-4 w-4 ${updatingFare ? 'animate-spin' : ''}`} />
                    {updatingFare ? 'Updating…' : 'Update & notify'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelActiveSearch}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-transparent text-red-300 border border-red-500/45 hover:bg-red-950/40 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Stop search
                  </button>
                </div>
              </div>
            ) : (
              <>
                <FareEstimatePanel
                  variant="modal"
                  pickup={pickup}
                  destination={destination}
                  vehicleType={broadcastVehicleType}
                  preferAC={broadcastHasAC}
                  offeredFare={broadcastFare}
                  onOfferedFareChange={setBroadcastFare}
                  onEstimateLoaded={(est) => {
                    setBroadcastMinFare(est.minFare);
                    setBroadcastMaxFare(est.maxFare);
                  }}
                  role="passenger"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updatingFare || broadcastFare == null}
                    onClick={applySearchFare}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white border border-brand-400/40 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-4 w-4 ${updatingFare ? 'animate-spin' : ''}`} />
                    {updatingFare ? 'Updating…' : 'Update & notify'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelActiveSearch}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-transparent text-red-300 border border-red-500/45 hover:bg-red-950/40 transition"
                  >
                    <XCircle className="h-4 w-4" />
                    Stop search
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {broadcasting && liveOffers.length > 0 && (
          <div className="space-y-3">
            {liveOffers.map((offer) => (
              <PassengerFareOfferBanner
                key={offer._id}
                offer={offer}
                requestId={offer.requestId || requestId}
                expiresAt={offer.expiresAt}
                onExpired={(id) => setLiveOffers((prev) => prev.filter((o) => o._id !== id))}
                onResponded={() => {
                  setLiveOffers((prev) => prev.filter((o) => o._id !== offer._id));
                  refreshBroadcast(requestId);
                }}
              />
            ))}
          </div>
        )}

        {!broadcasting && (
        <form onSubmit={handleFindClick} className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1">
              Departure date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
              <input
                type="date"
                value={depDate}
                onChange={(e) => setDepDate(e.target.value)}
                className="w-full bg-slateCustom-800 border border-slateCustom-600 rounded-lg pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>
          <AppButton type="submit" disabled={loading} className="w-full sm:w-auto sm:min-w-[200px]">
            {loading ? 'Searching…' : 'Find available rides'}
          </AppButton>
        </form>
        )}
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/25 p-4 rounded-xl text-sm text-red-300 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p>{error}</p>
            {error.includes('Too many requests') && (
              <p className="text-xs mt-2 text-red-200/80">
                Restart the backend — limits are relaxed in development.
              </p>
            )}
          </div>
        </div>
      )}

      {bookingSuccess && (
        <div className="bg-green-950/40 border border-green-500/25 p-4 rounded-xl text-sm text-green-300 flex gap-3">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {bookingSuccess}
        </div>
      )}

      <RideTypeSearchModal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        onSearch={executeSearch}
        loading={loading}
        departureDate={depDate}
        pickup={pickup}
        destination={destination}
      />

      {!broadcasting && !loading && (
        <div className="glass-panel p-8 rounded-2xl text-center text-white/70 text-sm">
          <Radio className="h-10 w-10 text-brand-400/70 mx-auto mb-2" />
          Set pickup and destination, then search to notify nearby drivers in real time.
        </div>
      )}
    </div>
  );
}

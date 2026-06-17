import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import {
  MapPin,
  Clock,
  Users,
  AlertCircle,
  Car,
  Navigation,
  Loader2,
  Ticket
} from 'lucide-react';
import { TripMapView, LocationAddressButton } from '@/components/map';
import {
  resolveCurrentLocationAsPoint,
  geolocationErrorMessage
} from '@/components/map/geolocation';
import AppButton from '@/components/common/AppButton';
import RideTags from '@/features/rides/components/RideTags';
import SeatBookingModal from '@/features/bookings/components/SeatBookingModal';
import LiveSeatTracker from '@/features/bookings/components/LiveSeatTracker';
import LocationLabel from '@/components/common/LocationLabel';
import ActiveCarpoolSession from '@/features/carpool/components/ActiveCarpoolSession';
import CarpoolFareBreakdown from '@/features/carpool/components/CarpoolFareBreakdown';
import CarpoolRideRoutePreview from '@/components/map/CarpoolRideRoutePreview';
import { bookingService } from '@/api/services/booking.service';
import { useActiveTrip } from '@/hooks/useActiveTrip';
import { BOOKING_VEHICLE_TYPE } from '@/features/bookings/constants';
import { getVehicleTypeLabel } from '@/features/rides/constants/searchByVehicleType';

export default function CarpoolSearchPanel() {
  const location = useLocation();
  const { loading: tripLoading, commitment, refresh: refreshTrip } = useActiveTrip();
  const [pickup, setPickup] = useState(location.state?.pickup || null);
  const [destination, setDestination] = useState(location.state?.destination || null);
  const [depDate, setDepDate] = useState('');
  const [activeField, setActiveField] = useState('pickup');
  const [locatingPickup, setLocatingPickup] = useState(false);
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [selectedRide, setSelectedRide] = useState(null);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [preferAC, setPreferAC] = useState(false);
  const [fareByRide, setFareByRide] = useState({});
  const [mapPreviewRideId, setMapPreviewRideId] = useState(null);

  const carpoolMarkers = useMemo(
    () =>
      rides
        .map((ride) => {
          const c = ride.origin?.location?.coordinates;
          if (!c || c.length < 2) return null;
          return {
            id: ride._id,
            lat: c[1],
            lng: c[0],
            title: `${ride.driverId?.name || 'Driver'} · Rs.${ride.costPerSeat}/seat`,
            iconHtml:
              '<div class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 border-2 border-white shadow text-xs">🚗</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          };
        })
        .filter(Boolean),
    [rides]
  );

  const mapPreviewRide = rides.find((r) => r._id === mapPreviewRideId);

  useEffect(() => {
    if (!rides.length) {
      setFareByRide({});
      return;
    }
    let cancelled = false;
    Promise.all(
      rides.map(async (ride) => {
        try {
          const res = await bookingService.getFareQuote(ride._id, { seatsBooked: 1 });
          return [ride._id, res.data];
        } catch {
          return [ride._id, null];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setFareByRide(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [rides]);

  useEffect(() => {
    if (location.state?.pickup) setPickup(location.state.pickup);
    if (location.state?.destination) setDestination(location.state.destination);
  }, [location.state]);

  const useCurrentLocationForPickup = async () => {
    setLocatingPickup(true);
    try {
      const pt = await resolveCurrentLocationAsPoint({
        onAddressResolved: (refined) => setPickup(refined)
      });
      setPickup(pt);
      setActiveField('destination');
      toast.success('Pickup set — updating address…');
    } catch (err) {
      toast.error(geolocationErrorMessage(err));
    } finally {
      setLocatingPickup(false);
    }
  };

  const executeSearch = async () => {
    setError('');
    if (!pickup?.lat) {
      setError('Set pickup first — tap the Pickup field, then map or My location.');
      return;
    }
    if (!destination?.lat) {
      setError('Set destination on the map.');
      return;
    }

    setLoading(true);
    setBookingSuccess('');

    try {
      const { data: resData } = await api.post(endpoints.rides.search, {
        originLng: pickup.lng,
        originLat: pickup.lat,
        destLng: destination.lng,
        destLat: destination.lat,
        departureDate: depDate || undefined,
        vehicleType: 'CAR',
        seatsNeeded: Math.min(4, Math.max(1, seatsNeeded)),
        hasAC: preferAC || undefined
      });

      if (resData.success) {
        setRides(resData.data || []);
        if (!resData.data?.length) {
          setError('No carpools match this route yet. Try another date or check back later.');
        }
      } else {
        throw new Error(resData.message || 'Search failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  const mapHint =
    activeField === 'pickup'
      ? 'Tap the map or My location for pickup, then set destination.'
      : 'Tap the map to set destination.';

  if (tripLoading) {
    return (
      <div className="glass-panel rounded-2xl p-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (commitment?.kind === 'CARPOOL_BOOKING') {
    return (
      <ActiveCarpoolSession booking={commitment.data} onDismiss={refreshTrip} />
    );
  }

  if (
    commitment?.kind === 'RIDE_REQUEST' &&
    ['SEARCHING', 'OFFERS_PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(commitment.data?.status)
  ) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-brand-500/30 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-400">
          One trip at a time · Passenger mode
        </p>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Ticket className="h-5 w-5 text-brand-400" />
          You already have an on-demand ride active
        </h2>
        <p className="text-sm text-white/65">
          Finish or cancel your Book Ride trip before requesting a carpool seat.
        </p>
        <Link
          to="/find"
          className="inline-flex text-sm font-semibold text-brand-400 no-underline hover:text-brand-300"
        >
          Go to Book Ride →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bookingSuccess && (
        <div className="flex gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
          {bookingSuccess}
        </div>
      )}

      <div className="glass-panel p-4 sm:p-5 rounded-2xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Navigation className="h-4 w-4 text-brand-400" />
          Search carpools
        </h2>

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

        <div>
          <label className="text-[10px] uppercase font-bold text-white/70 tracking-wider block mb-1">
            Departure date (optional)
          </label>
          <input
            type="date"
            value={depDate}
            onChange={(e) => setDepDate(e.target.value)}
            className="w-full bg-transparent border-2 border-brand-500/35 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500"
          />
        </div>

        <p className="text-xs text-white/55">{mapHint}</p>

        <TripMapView
          className="h-[min(20rem,48vh)] min-h-[280px] w-full"
          pickup={pickup}
          destination={destination}
          rideMarkers={carpoolMarkers}
          interactive
          flyToPickup
          activeStep={activeField}
          onActiveStepChange={setActiveField}
          onPickupChange={(p) => {
            setPickup(p);
            setActiveField('destination');
          }}
          onDestinationChange={setDestination}
        />

        {mapPreviewRide && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs font-bold text-amber-200">
              Preview: {mapPreviewRide.driverId?.name}&apos;s route
            </p>
            <CarpoolRideRoutePreview ride={mapPreviewRide} className="h-36 w-full" />
            <button
              type="button"
              onClick={() => setMapPreviewRideId(null)}
              className="text-[10px] text-white/50 hover:text-white border-0 bg-transparent"
            >
              Close preview
            </button>
          </div>
        )}

        {error && (
          <div className="flex gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-white/80">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preferAC}
              onChange={(e) => setPreferAC(e.target.checked)}
              className="accent-brand-500"
            />
            AC preferred
          </label>
          <label className="flex items-center gap-2">
            Seats
            <input
              type="number"
              min={1}
              max={4}
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(Number(e.target.value) || 1)}
              className="w-14 bg-transparent border-2 border-brand-500/35 rounded px-2 py-1 text-white text-sm"
            />
          </label>
        </div>

        <AppButton type="button" fullWidth disabled={loading} onClick={executeSearch}>
          {loading ? 'Searching…' : 'Find carpools'}
        </AppButton>
      </div>

      {rides.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rides.map((ride) => (
            <article
              key={ride._id}
              className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border border-transparent hover:border-brand-500/40 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-white text-sm">{ride.driverId?.name}</p>
                  <p className="text-[11px] text-white/60">
                    {getVehicleTypeLabel(ride.vehicleId?.vehicleType)}
                  </p>
                </div>
                <span className="text-sm font-bold text-brand-300">
                  Rs. {fareByRide[ride._id]?.costPerSeatNow ?? ride.costPerSeat}
                  <span className="text-[10px] font-normal text-white/50 block">per seat now</span>
                </span>
              </div>

              <CarpoolFareBreakdown quote={fareByRide[ride._id]} compact />

              <CarpoolRideRoutePreview ride={ride} className="h-28 w-full" />

              <ul className="text-xs text-white/75 space-y-1.5">
                <li className="flex gap-2">
                  <MapPin className="h-3.5 w-3.5 text-green-400 shrink-0" />
                  <LocationLabel
                    address={ride.origin?.address}
                    coordinates={ride.origin?.location?.coordinates}
                    fallback="Pickup"
                  />
                </li>
                <li className="flex gap-2">
                  <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <LocationLabel
                    address={ride.destination?.address}
                    coordinates={ride.destination?.location?.coordinates}
                    fallback="Drop-off"
                  />
                </li>
                <li className="flex gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {new Date(ride.departureDate).toLocaleString()}
                </li>
                <li className="flex gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {ride.availableSeats} of {ride.totalSeats} seats left
                </li>
              </ul>

              <RideTags ride={ride} />

              {ride.vehicleId?.vehicleType === BOOKING_VEHICLE_TYPE && (
                <LiveSeatTracker rideId={ride._id} compact />
              )}

              <div className="flex gap-2 mt-auto">
                <AppButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setMapPreviewRideId(ride._id)}
                >
                  On map
                </AppButton>
                <AppButton
                  type="button"
                  fullWidth={false}
                  className="flex-[2]"
                  disabled={
                    ride.vehicleId?.vehicleType !== BOOKING_VEHICLE_TYPE || ride.availableSeats < 1
                  }
                  onClick={() => setSelectedRide(ride)}
                >
                  {ride.vehicleId?.vehicleType === BOOKING_VEHICLE_TYPE
                    ? 'Request seat'
                    : 'Car only'}
                </AppButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedRide && (
        <SeatBookingModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onSuccess={() => {
            refreshTrip();
          }}
        />
      )}
    </div>
  );
}

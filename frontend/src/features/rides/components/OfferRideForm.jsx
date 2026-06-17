import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Calendar,
  Clock,
  Users,
  Shield,
  Wind,
  Cigarette,
  Luggage,
  Repeat,
  MapPin,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import MapClickPicker from '@/components/map/MapClickPicker';
import TripMapView from '@/components/map/TripMapView';
import PricingCalculator from './PricingCalculator';
import { offerRide } from '../services/ride.service';
import {
  DEFAULT_FORM,
  RIDE_TYPES,
  DAYS,
  SMOKING_OPTIONS,
  LUGGAGE_OPTIONS
} from '../constants';
import {
  driverInput,
  driverSection,
  driverSectionTitle,
  driverChoiceActive,
  driverChoiceIdle,
  driverBtnPrimary
} from '@/features/driver/driverTheme';
import { approvedCarVehicles } from '@/utils/driverVehicles';

function Section({ title, icon: Icon, children }) {
  return (
    <section className={driverSection}>
      <h2 className={driverSectionTitle}>
        {Icon && <Icon className="w-5 h-5 text-emerald-400 shrink-0" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function OfferRideForm({ onPublished }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [vehicles, setVehicles] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const patch = useCallback((updates) => {
    setForm((f) => ({ ...f, ...updates }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, commRes] = await Promise.all([
          api.get(endpoints.users.profile),
          api.get(endpoints.communities)
        ]);
        if (profileRes.data.success) {
          const cars = approvedCarVehicles(profileRes.data.data.vehicles || []);
          setVehicles(cars);
          if (cars[0]) patch({ vehicleId: cars[0]._id });
        }
        if (commRes.data.success) setCommunities(commRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [patch]);

  const toggleDay = (day) => {
    const days = form.recurrenceDays.includes(day)
      ? form.recurrenceDays.filter((d) => d !== day)
      : [...form.recurrenceDays, day];
    patch({ recurrenceDays: days });
  };

  const toggleCommunity = (id) => {
    const list = form.allowedCommunities.includes(id)
      ? form.allowedCommunities.filter((c) => c !== id)
      : [...form.allowedCommunities, id];
    patch({ allowedCommunities: list });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.vehicleId) {
      setError('Add a vehicle in Profile → Vehicles first.');
      return;
    }
    if (!form.originCoords || !form.destinationCoords) {
      setError('Select pickup and destination on the map.');
      return;
    }
    if (form.rideType === RIDE_TYPES.ONE_TIME && !form.departureDate) {
      setError('Choose a departure date.');
      return;
    }
    if (form.rideType === RIDE_TYPES.RECURRING && !form.recurrenceDays.length) {
      setError('Select at least one recurring day.');
      return;
    }

    const departureDate =
      form.rideType === RIDE_TYPES.ONE_TIME
        ? `${form.departureDate}T${form.departureTime || '08:00'}:00`
        : form.departureDate
          ? `${form.departureDate}T${form.departureTime || '08:00'}:00`
          : new Date().toISOString();

    setSubmitting(true);
    try {
      const res = await offerRide({
        vehicleId: form.vehicleId,
        originAddress: form.originAddress,
        originCoords: form.originCoords,
        destinationAddress: form.destinationAddress,
        destinationCoords: form.destinationCoords,
        totalSeats: form.totalSeats,
        totalFuelCost: form.totalFuelCost ? Number(form.totalFuelCost) : undefined,
        costPerSeat: form.costPerSeat,
        autoFuelFromDistance: form.autoFuelFromDistance,
        rideType: form.rideType,
        isRecurring: form.rideType === RIDE_TYPES.RECURRING,
        departureDate,
        departureTime: form.departureTime,
        recurrenceDays: form.recurrenceDays,
        weeksAhead: form.weeksAhead,
        restrictions: form.restrictions,
        amenities: form.amenities,
        allowedCommunities: form.allowedCommunities,
        notes: form.notes
      });
      setSuccess(res.message || 'Ride published!');
      setTimeout(() => onPublished?.(), 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to publish ride');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex justify-center py-16 text-white/70">Loading your profile…</div>
    );
  }

  if (!vehicles.length) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-center border border-amber-500/30 bg-amber-500/10">
        <Car className="w-10 h-10 mx-auto text-amber-400 mb-2" />
        <p className="font-medium text-white">No approved car for carpool</p>
        <p className="text-sm text-white/70 mt-1">
          Carpools require a verified car. Bikes and rickshaws are for on-demand rides only.
        </p>
        <button type="button" onClick={() => navigate('/profile')} className={`mt-4 ${driverBtnPrimary}`}>
          Go to Profile
        </button>
      </div>
    );
  }

  const pickup = form.originCoords
    ? {
        lat: form.originCoords[1],
        lng: form.originCoords[0],
        name: form.originAddress,
        address: form.originAddress
      }
    : null;
  const destination = form.destinationCoords
    ? {
        lat: form.destinationCoords[1],
        lng: form.destinationCoords[0],
        name: form.destinationAddress,
        address: form.destinationAddress
      }
    : null;

  const pointToCoords = (point) =>
    point?.lng != null && point?.lat != null ? [point.lng, point.lat] : null;

  const choiceBtn = (active) =>
    `flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-sm font-medium border transition outline-none ${
      active ? driverChoiceActive : driverChoiceIdle
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-8">
      {error && (
        <div className="flex gap-2 rounded-lg bg-red-950/50 border border-red-500/30 p-3 text-sm text-red-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex gap-2 rounded-lg bg-emerald-950/50 border border-emerald-500/30 p-3 text-sm text-emerald-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          {success}
        </div>
      )}

      <Section title="Your car (carpool)" icon={Car}>
        <p className="text-xs text-white/60 mb-2">
          Share seats on a scheduled route. Passengers book individual seats; fuel cost is split.
        </p>
        <select
          value={form.vehicleId}
          onChange={(e) => patch({ vehicleId: e.target.value })}
          className={driverInput}
        >
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.company || v.make} {v.model} · {v.licensePlate || v.plateNumber}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Route" icon={MapPin}>
        <p className="text-sm text-white/70 mb-3">Tap the map to set pickup, then destination.</p>
        <MapClickPicker
          className="h-[220px] sm:h-[260px] border-emerald-500/20"
          pickup={pickup}
          destination={destination}
          onPickupChange={(point) =>
            patch({
              originAddress: point.address || point.name,
              originCoords: pointToCoords(point)
            })
          }
          onDestinationChange={(point) =>
            patch({
              destinationAddress: point.address || point.name,
              destinationCoords: pointToCoords(point)
            })
          }
        />
        {pickup && destination && (
          <div className="mt-4 h-48 rounded-xl overflow-hidden border border-emerald-500/20">
            <TripMapView pickup={pickup} destination={destination} />
          </div>
        )}
      </Section>

      <Section title="Schedule" icon={Calendar}>
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(RIDE_TYPES).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => patch({ rideType: value })}
              className={choiceBtn(form.rideType === value)}
            >
              {value === RIDE_TYPES.RECURRING ? (
                <span className="flex items-center justify-center gap-1">
                  <Repeat className="w-4 h-4" /> Recurring
                </span>
              ) : (
                'One-time'
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm block">
            <span className="text-white/70 flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5" />
              {form.rideType === RIDE_TYPES.RECURRING ? 'Series start' : 'Departure date'}
            </span>
            <input
              type="date"
              required={form.rideType === RIDE_TYPES.ONE_TIME}
              value={form.departureDate}
              onChange={(e) => patch({ departureDate: e.target.value })}
              className={driverInput}
            />
          </label>
          <label className="text-sm block">
            <span className="text-white/70 flex items-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5" /> Time
            </span>
            <input
              type="time"
              value={form.departureTime}
              onChange={(e) => patch({ departureTime: e.target.value })}
              className={driverInput}
            />
          </label>
        </div>

        {form.rideType === RIDE_TYPES.RECURRING && (
          <div className="mt-4">
            <p className="text-sm text-white/70 mb-2">Repeat on</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`w-11 h-11 rounded-full text-xs font-semibold border ${
                    form.recurrenceDays.includes(d.value)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slateCustom-600 text-white/70'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <label className="block mt-3 text-sm text-white/70">
              Weeks ahead
              <input
                type="number"
                min={1}
                max={8}
                value={form.weeksAhead}
                onChange={(e) => patch({ weeksAhead: Number(e.target.value) })}
                className={`mt-1 w-24 ml-2 ${driverInput}`}
              />
            </label>
          </div>
        )}
      </Section>

      <Section title="Seats & pricing" icon={Users}>
        <label className="block text-sm mb-3">
          <span className="text-white/70">Passenger seats</span>
          <input
            type="range"
            min={1}
            max={6}
            value={form.totalSeats}
            onChange={(e) => patch({ totalSeats: Number(e.target.value) })}
            className="w-full mt-2 accent-emerald-500"
          />
          <span className="font-semibold text-emerald-300">{form.totalSeats} seats</span>
        </label>
        <PricingCalculator variant="driver" {...{
          totalSeats: form.totalSeats,
          totalFuelCost: form.totalFuelCost,
          onFuelChange: (v) => patch({ totalFuelCost: v }),
          onCostPerSeatChange: (c) => patch({ costPerSeat: c }),
          originCoords: form.originCoords,
          destinationCoords: form.destinationCoords,
          autoFuelFromDistance: form.autoFuelFromDistance,
          onAutoFuelChange: (v) => patch({ autoFuelFromDistance: v })
        }} />
      </Section>

      <Section title="Restrictions" icon={Shield}>
        <div className="space-y-2">
          {[
            { key: 'womenOnly', label: 'Women-only' },
            { key: 'universityOnly', label: 'University only' },
            { key: 'officeOnly', label: 'Office only' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 text-sm text-white/85 cursor-pointer">
              <input
                type="checkbox"
                checked={form.restrictions[key]}
                onChange={(e) =>
                  patch({ restrictions: { ...form.restrictions, [key]: e.target.checked } })
                }
                className="rounded border-slateCustom-600 accent-emerald-500"
              />
              {label}
            </label>
          ))}
        </div>
      </Section>

      <Section title="Comfort" icon={Wind}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm block">
            <span className="text-white/70 flex items-center gap-1 mb-1">
              <Luggage className="w-3.5 h-3.5" /> Luggage
            </span>
            <select
              value={form.amenities.luggageAllowed}
              onChange={(e) =>
                patch({ amenities: { ...form.amenities, luggageAllowed: e.target.value } })
              }
              className={driverInput}
            >
              {LUGGAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm block">
            <span className="text-white/70 flex items-center gap-1 mb-1">
              <Cigarette className="w-3.5 h-3.5" /> Smoking
            </span>
            <select
              value={form.amenities.smoking}
              onChange={(e) =>
                patch({ amenities: { ...form.amenities, smoking: e.target.value } })
              }
              className={driverInput}
            >
              {SMOKING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-3 mt-4 text-sm text-white/85 cursor-pointer">
          <input
            type="checkbox"
            checked={form.amenities.hasAC}
            onChange={(e) =>
              patch({ amenities: { ...form.amenities, hasAC: e.target.checked } })
            }
            className="rounded accent-emerald-500"
          />
          Air conditioning (AC)
        </label>
      </Section>

      {communities.length > 0 && (
        <Section title="Communities" icon={Users}>
          <div className="flex flex-wrap gap-2">
            {communities.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => toggleCommunity(c._id)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  form.allowedCommunities.includes(c._id)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-slateCustom-600 text-white/70'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </Section>
      )}

      <label className="block text-sm">
        <span className="text-white/70">Notes</span>
        <textarea
          value={form.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          maxLength={300}
          rows={2}
          className={`mt-1 ${driverInput}`}
        />
      </label>

      <button type="submit" disabled={submitting} className={`w-full ${driverBtnPrimary}`}>
        {submitting ? 'Publishing…' : 'Publish ride'}
      </button>
    </form>
  );
}

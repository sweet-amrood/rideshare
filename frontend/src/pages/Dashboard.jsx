import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import api from '@/api/axios';
import { endpoints } from '@/api/endpoints';
import {
  Car,
  MapPin,
  Clock,
  Calendar,
  Users,
  TrendingUp,
  ShieldCheck,
  MessageSquare,
  Truck,
  Ticket
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isRider, isDriver, roleLabel } = useRoles();
  const [passengerTrips, setPassengerTrips] = useState([]);
  const [driverTrips, setDriverTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      const { data } = await api.get(endpoints.bookings.myTrips);
      if (data.success) {
        setPassengerTrips(data.data.passengerTrips);
        setDriverTrips(data.data.driverTrips);
      }
    } catch (error) {
      console.error('Failed to load trips history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  useEffect(() => {
    if (location.state?.reason === 'role') {
      toast.error('That page is not available for your current commuter role. Change role in Profile.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const activeTrips = (isRider ? passengerTrips.length : 0) + (isDriver ? driverTrips.length : 0);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500/20 via-indigo-500/5 to-transparent border border-brand-500/20 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome, {user.name}!</h1>
          <p className="text-white/85 max-w-xl text-sm leading-relaxed">
            {isRider && isDriver && (
              <>You are set up as passenger and driver. Book trips or publish your own schedule.</>
            )}
            {isRider && !isDriver && (
              <>Find carpools near you, split fuel costs, and travel with trusted commuters.</>
            )}
            {isDriver && !isRider && (
              <>Review passenger booking requests, publish carpools, and manage your vehicles.</>
            )}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-brand-300 font-bold">{roleLabel}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {isRider && (
            <button
              type="button"
              onClick={() => navigate('/find')}
              className="btn-primary w-full py-2.5 border-0 outline-none flex items-center justify-center gap-2"
            >
              <Ticket className="h-4 w-4" />
              Book ride
            </button>
          )}
          {isDriver && (
            <button
              type="button"
              onClick={() => navigate('/offer')}
              className="w-full py-2.5 rounded-xl font-semibold border-0 outline-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition"
            >
              <Truck className="h-4 w-4" />
              Driver hub
            </button>
          )}
          {!isRider && !isDriver && (
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="btn-primary w-full py-2.5 border-0 outline-none"
            >
              Set your role
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
              Fuel split saved
            </div>
            <div className="text-xl font-bold text-white mt-1">Rs. 4,850</div>
            <div className="text-[10px] text-green-400 font-semibold mt-0.5">This month</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
              Active commutes
            </div>
            <div className="text-xl font-bold text-white mt-1">{activeTrips} trips</div>
            <div className="text-[10px] text-white/75 font-semibold mt-0.5">Scheduled</div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white/70 uppercase tracking-widest leading-none">
              Trust standing
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {user.verification?.domainVerified ? 'Verified domain' : 'Standard'}
            </div>
            <div className="text-[10px] text-white/75 font-semibold mt-0.5">
              {user.verification?.domainVerified
                ? user.verification.organizationName
                : 'Complete verification in Profile'}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`grid gap-8 ${
          isRider && isDriver ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'
        }`}
      >
        {isRider && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-400" />
              <span>My booked rides</span>
            </h2>

            {loading ? (
              <div className="h-40 glass-panel rounded-2xl flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : passengerTrips.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center space-y-5 border border-white/5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15">
                  <Calendar className="h-8 w-8 text-brand-400" />
                </div>
                <p className="text-white text-sm leading-relaxed max-w-xs mx-auto">
                  No booked trips yet. Search carpools on your route.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/find')}
                    className="btn-primary w-full py-2.5 border-0 outline-none"
                  >
                    Book a ride
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/bookings')}
                    className="w-full py-2.5 rounded-xl border border-brand-500/40 text-brand-300 text-sm font-semibold hover:bg-brand-500/10"
                  >
                    My bookings
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {passengerTrips.map((booking) => (
                  <div
                    key={booking._id}
                    className="glass-panel p-5 rounded-2xl space-y-4 border-l-2 border-brand-500"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-xs font-bold text-brand-400 uppercase tracking-widest">
                          {booking.status}
                        </div>
                        <div className="text-base font-bold text-white mt-1">
                          Driver: {booking.rideId?.driverId?.name}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white bg-slateCustom-800 px-3 py-1 rounded-lg">
                        Rs. {booking.farePaid}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-white/85">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="truncate">From: {booking.pickupPoint.address}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-brand-400 shrink-0" />
                        <span>
                          Depart: {new Date(booking.rideId?.departureDate).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {booking.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/chat/${booking.rideId._id}`)}
                        className="btn-primary w-full py-2.5 border-0 outline-none"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Live tracker & chat
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {isDriver && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              <span>My published rides</span>
            </h2>

            {loading ? (
              <div className="h-40 glass-panel rounded-2xl flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : driverTrips.length === 0 ? (
              <div className="glass-panel p-10 rounded-2xl text-center space-y-5 border border-white/5">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15">
                  <Car className="h-8 w-8 text-brand-400" />
                </div>
                <p className="text-white text-sm leading-relaxed max-w-xs mx-auto">
                  No rides published yet. Open Driver hub to accept requests or publish a route.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/offer')}
                  className="w-full py-2.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0 outline-none"
                >
                  Open driver hub
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {driverTrips.map((ride) => (
                  <div
                    key={ride._id}
                    className="glass-panel p-5 rounded-2xl space-y-4 border-l-2 border-green-500"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="text-xs font-bold text-green-400 uppercase tracking-widest">
                          {ride.status}
                          {ride.isRecurring && (
                            <span className="ml-2 bg-slateCustom-800 text-slate-100 text-[8px] px-1.5 py-0.5 rounded uppercase">
                              Recurring
                            </span>
                          )}
                        </div>
                        <div className="text-base font-bold text-white mt-1">
                          {ride.vehicleId?.make} {ride.vehicleId?.model}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white bg-slateCustom-800 px-3 py-1 rounded-lg">
                        Rs. {ride.costPerSeat} / seat
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-white/85">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="truncate">{ride.origin.address}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-brand-400 shrink-0" />
                        <span>{new Date(ride.departureDate).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-brand-400 shrink-0" />
                        <span>
                          {ride.availableSeats} of {ride.totalSeats} seats left
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${ride._id}`)}
                      className="btn-primary w-full py-2.5 border-0 outline-none"
                    >
                      Live tracker & chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isRider && !isDriver && (
          <div className="glass-panel p-8 rounded-2xl text-center text-white/80 text-sm">
            Choose a commuter role in Profile to unlock booking or offering rides.
          </div>
        )}
      </div>
    </div>
  );
}

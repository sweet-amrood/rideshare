import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
  Ticket,
  ArrowRight,
  Zap,
  Star
} from 'lucide-react';
import AppButton from '@/components/common/AppButton';
import AnimatedCard from '@/components/animations/AnimatedCard';
import AnimatedNumber from '@/components/animations/AnimatedNumber';
import ScrollReveal from '@/components/animations/ScrollReveal';
import { StaggerList, StaggerItem } from '@/components/animations/StaggerList';
import { SkeletonCard } from '@/components/animations/Skeleton';
import EmptyState from '@/components/animations/EmptyState';
import { paths } from '@/app/router/paths';

function StatCard({ icon: Icon, label, value, sub, gradient = 'brand' }) {
  const gradients = {
    brand: 'bg-gradient-card-brand',
    emerald: 'bg-gradient-card-emerald',
    amber: 'bg-gradient-card-amber',
    rose: 'bg-gradient-card-rose'
  };
  const iconColors = {
    brand: 'text-brand-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    rose: 'text-rose-300'
  };
  const iconBg = {
    brand: 'rgba(79,94,244,0.2)',
    emerald: 'rgba(16,185,129,0.2)',
    amber: 'rgba(245,158,11,0.2)',
    rose: 'rgba(239,68,68,0.2)'
  };
  return (
    <AnimatedCard className={`glass-card rounded-2xl p-5 flex items-center gap-4 ${gradients[gradient]}`} hover={false}>
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg[gradient] }}>
        <Icon className={`h-5 w-5 ${iconColors[gradient]}`} />
      </div>
      <div className="min-w-0">
        <div className="section-label truncate">{label}</div>
        <div className="text-xl font-extrabold text-white mt-1 leading-tight">
          {/\d/.test(String(value)) ? <AnimatedNumber value={value} /> : value}
        </div>
        {sub && <div className="text-[11px] text-white/45 mt-0.5 truncate">{sub}</div>}
      </div>
    </AnimatedCard>
  );
}

function TripCard({ booking, onClick }) {
  const statusColors = {
    CONFIRMED: 'badge-emerald',
    PENDING: 'badge-amber',
    REJECTED: 'badge-red',
    CANCELLED: 'badge-red',
    COMPLETED: 'badge-brand'
  };
  return (
    <AnimatedCard
      className="glass-card rounded-2xl p-5 space-y-4"
      style={{ borderLeft: '2px solid rgba(79,94,244,0.5)' }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0">
          <span className={statusColors[booking.status] || 'badge-brand'}>
            {booking.status}
          </span>
          <div className="text-sm font-bold text-white truncate mt-1">
            Driver: {booking.rideId?.driverId?.name}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-extrabold text-white">Rs. {booking.farePaid}</div>
          <div className="text-[10px] text-white/40">fare paid</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/65">
          <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
          <span className="truncate">{booking.pickupPoint?.address || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/65">
          <Clock className="h-3.5 w-3.5 text-brand-400 shrink-0" />
          <span>{new Date(booking.rideId?.departureDate).toLocaleString()}</span>
        </div>
      </div>
      {booking.status === 'CONFIRMED' && (
        <AppButton fullWidth size="sm" onClick={onClick}>
          <MessageSquare className="h-3.5 w-3.5" />
          Live tracker &amp; chat
        </AppButton>
      )}
    </AnimatedCard>
  );
}

function DriverRideCard({ ride, onClick }) {
  return (
    <AnimatedCard
      className="glass-card rounded-2xl p-5 space-y-4"
      style={{ borderLeft: '2px solid rgba(16,185,129,0.5)' }}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="space-y-1 min-w-0">
          <span className="badge-emerald">
            {ride.status}
            {ride.isRecurring && <span className="ml-1.5 opacity-70">· recurring</span>}
          </span>
          <div className="text-sm font-bold text-white mt-1 truncate">
            {ride.vehicleId?.make} {ride.vehicleId?.model}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-extrabold text-white">Rs. {ride.costPerSeat}</div>
          <div className="text-[10px] text-white/40">per seat</div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-white/65">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{ride.origin?.address}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/65">
          <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{new Date(ride.departureDate).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/65">
          <Users className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{ride.availableSeats} of {ride.totalSeats} seats available</span>
        </div>
      </div>
      <AppButton fullWidth size="sm" variant="success" onClick={onClick}>
        <MessageSquare className="h-3.5 w-3.5" />
        Live tracker &amp; chat
      </AppButton>
    </AnimatedCard>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isRider, isDriver, roleLabel } = useRoles();
  const [passengerTrips, setPassengerTrips] = useState([]);
  const [driverTrips, setDriverTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(endpoints.bookings.myTrips)
      .then(({ data }) => {
        if (data.success) {
          setPassengerTrips(data.data.passengerTrips);
          setDriverTrips(data.data.driverTrips);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (location.state?.reason === 'role') {
      toast.error('That page is not available for your current commuter role. Change role in Profile.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const activeTrips =
    (isRider ? passengerTrips.length : 0) + (isDriver ? driverTrips.length : 0);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      <ScrollReveal>
      {/* ── HERO SECTION ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(79,94,244,0.18) 0%, rgba(139,92,246,0.10) 50%, rgba(6,182,212,0.06) 100%)',
          border: '1px solid rgba(79,94,244,0.25)'
        }}>
        {/* Decorative blobs */}
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.6), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5), transparent 70%)', transform: 'translateY(50%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="section-label flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-brand-400" />
              {roleLabel}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {greeting},{' '}
              <span className="gradient-text">{user?.name?.split(' ')[0]}!</span>
            </h1>
            <p className="text-white/50 text-sm leading-relaxed max-w-lg">
              {isRider && isDriver
                ? 'You are set up as both passenger and driver. Book trips or publish your own schedule.'
                : isRider
                  ? 'Find carpools near you, split fuel costs, and travel with trusted commuters.'
                  : isDriver
                    ? 'Review passenger booking requests, publish carpools, and manage your vehicles.'
                    : 'Complete your profile to unlock booking and offering rides.'}
            </p>
            {user?.verification?.domainVerified && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}>
                <ShieldCheck className="h-3 w-3" />
                {user.verification.organizationName} · Verified
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            {isRider && (
              <AppButton onClick={() => navigate(paths.find)} size="lg">
                <Ticket className="h-4 w-4" />
                Find a ride
                <ArrowRight className="h-3.5 w-3.5 opacity-70" />
              </AppButton>
            )}
            {isDriver && (
              <AppButton variant="success" size="lg" onClick={() => navigate(paths.offer)}>
                <Truck className="h-4 w-4" />
                Driver hub
              </AppButton>
            )}
            {!isRider && !isDriver && (
              <AppButton size="lg" onClick={() => navigate(paths.profile)}>
                Set your role
                <ArrowRight className="h-3.5 w-3.5 opacity-70" />
              </AppButton>
            )}
          </div>
        </div>
      </div>
      </ScrollReveal>

      <ScrollReveal delay={0.05}>
      {/* ── STATS ROW ── */}
      <StaggerList className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StaggerItem>
        <StatCard
          icon={TrendingUp}
          label="Fuel split saved"
          value="Rs. 4,850"
          sub="This month"
          gradient="brand"
        />
        </StaggerItem>
        <StaggerItem>
        <StatCard
          icon={Users}
          label="Active commutes"
          value={`${activeTrips} trips`}
          sub="Scheduled"
          gradient="emerald"
        />
        </StaggerItem>
        <StaggerItem>
        <StatCard
          icon={Star}
          label="Trust standing"
          value={user?.verification?.domainVerified ? 'Verified' : 'Standard'}
          sub={
            user?.verification?.domainVerified
              ? user.verification.organizationName
              : 'Complete verification'
          }
          gradient="amber"
        />
        </StaggerItem>
      </StaggerList>
      </ScrollReveal>

      <ScrollReveal delay={0.08}>
      <div className={`grid gap-8 ${isRider && isDriver ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>

        {isRider && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(79,94,244,0.2)' }}>
                  <Ticket className="h-3.5 w-3.5 text-brand-400" />
                </div>
                My booked rides
              </h2>
              <button
                type="button"
                onClick={() => navigate(paths.bookings)}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors"
              >
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {loading ? (
              <SkeletonCard lines={2} />
            ) : passengerTrips.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No trips yet"
                description="Search carpools on your route to get started."
                action={
                  <div className="space-y-2 w-full max-w-xs">
                    <AppButton fullWidth onClick={() => navigate(paths.find)}>
                      <Ticket className="h-3.5 w-3.5" />
                      Browse rides
                    </AppButton>
                    <AppButton fullWidth variant="secondary" onClick={() => navigate(paths.bookings)}>
                      My booking history
                    </AppButton>
                  </div>
                }
              />
            ) : (
              <StaggerList className="space-y-3">
                <AnimatePresence mode="popLayout">
                {passengerTrips.map((b) => (
                  <StaggerItem key={b._id} layout>
                  <TripCard
                    booking={b}
                    onClick={() => navigate(paths.chat(b.rideId._id))}
                  />
                  </StaggerItem>
                ))}
                </AnimatePresence>
              </StaggerList>
            )}
          </div>
        )}

        {isDriver && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(16,185,129,0.2)' }}>
                  <Truck className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                My published rides
              </h2>
              <button
                type="button"
                onClick={() => navigate(paths.offer)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-transparent border-0 cursor-pointer transition-colors"
              >
                Driver hub <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {loading ? (
              <SkeletonCard lines={2} />
            ) : driverTrips.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No rides published"
                description="Open the driver hub to accept requests or publish a route."
                action={
                  <AppButton fullWidth variant="success" onClick={() => navigate(paths.offer)}>
                    <Truck className="h-3.5 w-3.5" />
                    Open driver hub
                  </AppButton>
                }
              />
            ) : (
              <StaggerList className="space-y-3">
                <AnimatePresence mode="popLayout">
                {driverTrips.map((ride) => (
                  <StaggerItem key={ride._id} layout>
                  <DriverRideCard
                    ride={ride}
                    onClick={() => navigate(paths.chat(ride._id))}
                  />
                  </StaggerItem>
                ))}
                </AnimatePresence>
              </StaggerList>
            )}
          </div>
        )}

        {!isRider && !isDriver && (
          <EmptyState
            icon={Users}
            title="Set your commuter role"
            description="Choose a commuter role in Profile to unlock booking or offering rides."
            action={
              <AppButton onClick={() => navigate(paths.profile)}>
                Set up your role
                <ArrowRight className="h-3.5 w-3.5" />
              </AppButton>
            }
          />
        )}
      </div>
      </ScrollReveal>
    </div>
  );
}

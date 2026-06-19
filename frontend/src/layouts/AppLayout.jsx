import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Car,
  Ticket,
  Truck,
  User,
  LogOut,
  Map,
  LayoutDashboard,
  History,
  Users,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import PageTransition from '@/components/common/PageTransition';
import { useEffect, useState } from 'react';
import DriverOnlineToggle from '@/components/layout/DriverOnlineToggle';
import DriverActiveVehiclePicker from '@/components/layout/DriverActiveVehiclePicker';
import DriverActiveVehicleModal from '@/components/layout/DriverActiveVehicleModal';
import CommuterRoleToggle from '@/components/layout/CommuterRoleToggle';
import { profileService } from '@/api/services/profile.service';
import { isDriver } from '@/utils/roles';
import { getUserAvatarUrl } from '@/utils/defaultAvatar';
import NotificationBell from '@/components/layout/NotificationBell';
import ModeSwitcher from '@/components/common/ModeSwitcher';
import { paths } from '@/app/router/paths';
import { StaggerList, StaggerItem } from '@/components/animations/StaggerList';
import { springGentle } from '@/animations/motionConfig';
import { sidebarTransition, sidebarVariants } from '@/animations/sidebarVariants';

const ICONS = {
  dashboard: LayoutDashboard,
  find: Ticket,
  carpool: Users,
  bookings: History,
  driver: Truck,
  profile: User,
  map: Map
};

const navClass = (item) => ({ isActive }) => {
  const driverItem = item.iconKey === 'driver';
  if (isActive && driverItem) {
    return 'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold no-underline transition-all nav-item-active-driver text-emerald-300 text-sm';
  }
  return [
    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold no-underline transition-all text-sm',
    isActive
      ? 'nav-item-active text-brand-200'
      : 'text-white/60 hover:text-white/90 hover:bg-white/5 border border-transparent'
  ].join(' ');
};

const mobileNavClass = (item) => ({ isActive }) => {
  const driverItem = item.iconKey === 'driver';
  if (isActive && driverItem)
    return 'flex flex-col items-center gap-0.5 text-[11px] font-semibold no-underline text-emerald-400';
  return `flex flex-col items-center gap-0.5 text-[11px] font-semibold no-underline transition-colors ${
    isActive ? 'text-brand-300' : 'text-white/45 hover:text-white/75'
  }`;
};

export default function AppLayout() {
  const { user, logout, setUser } = useAuth();
  const { navItems } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [pickVehicles, setPickVehicles] = useState([]);

  useEffect(() => {
    if (!user?._id) return;
    profileService.getMyProfile().then((res) => {
      if (!res.success) return;
      const u = res.data?.user;
      if (!u) return;
      setUser({
        roles: u.roles,
        driverSetupComplete: u.driverSetupComplete,
        driverApplicant: u.driverApplicant,
        verification: u.verification,
        driverAvailability: u.driverAvailability
      });
    });
  }, [user?._id, setUser]);

  useEffect(() => {
    if (!user || !isDriver(user.roles)) return;
    profileService.getDriverStatus().then((res) => {
      const list = res.data?.approvedVehicles || [];
      if (list.length > 1 && !res.data?.activeVehicleId) {
        setPickVehicles(list);
        setVehicleModalOpen(true);
      }
    });
  }, [user?._id, user?.roles]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <div className="flex h-screen flex-col bg-slateCustom-900 text-white overflow-hidden bg-grid">
      {/* Ambient glow orbs — desktop only */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden hidden md:block" aria-hidden>
        <div className="orb orb-brand w-[500px] h-[500px] -top-40 -left-40 opacity-30" />
        <div className="orb orb-violet w-[400px] h-[400px] top-1/2 -right-32 opacity-20" />
      </div>

      <div className="flex min-h-0 flex-1 relative z-10">
        {/* ── DESKTOP SIDEBAR ── */}
        <motion.aside
          initial="initial"
          animate="animate"
          variants={sidebarVariants}
          transition={sidebarTransition}
          className="w-60 hidden md:flex flex-col justify-between py-6 px-4 border-r border-white/[0.06] shrink-0"
          style={{ background: 'rgba(8, 12, 20, 0.8)', backdropFilter: 'blur(20px)' }}
        >

          {/* Logo */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2 mb-2">
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}>
                <Car className="h-4.5 w-4.5 text-white" />
                <div className="absolute inset-0 rounded-xl glow-brand opacity-60" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-[15px] text-white tracking-wide leading-tight">
                  RIDE SHARE
                </div>
                <div className="text-[9px] text-brand-400/80 font-bold uppercase tracking-[0.2em] leading-none mt-0.5">
                  Commuter Hub
                </div>
              </div>
            </div>

            {/* User card */}
            <div className="rounded-xl p-3 space-y-3"
              style={{
                background: 'linear-gradient(135deg, rgba(79,94,244,0.1) 0%, rgba(139,92,246,0.06) 100%)',
                border: '1px solid rgba(79,94,244,0.2)'
              }}>
              <div className="flex items-center gap-2.5">
                <div className="relative shrink-0">
                  {user?.profile?.avatarUrl ? (
                    <img
                      src={getUserAvatarUrl(user)}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                      style={{ border: '1.5px solid rgba(79,94,244,0.5)' }}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}>
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-slateCustom-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] text-white truncate leading-tight">
                    {user?.name}
                  </div>
                  <div className="text-[10px] text-white/40 truncate">{user?.email}</div>
                </div>
              </div>
              <CommuterRoleToggle />
            </div>

            {/* Driver controls */}
            <div className="space-y-1.5">
              <DriverActiveVehiclePicker
                onNeedsPick={async (needs) => {
                  if (!needs) return;
                  const res = await profileService.getDriverStatus();
                  setPickVehicles(res.data?.approvedVehicles || []);
                  setVehicleModalOpen(true);
                }}
              />
              <DriverOnlineToggle
            onNeedsVehiclePick={async () => {
              const res = await profileService.getDriverStatus();
              setPickVehicles(res.data?.approvedVehicles || []);
              setVehicleModalOpen(true);
            }}
          />
            </div>

            {/* Nav */}
            <StaggerList className="space-y-0.5">
              <div className="section-label px-3 mb-2">Navigation</div>
              {navItems.map((item) => {
                const { to, label, iconKey, end } = item;
                const Icon = ICONS[iconKey] || Car;
                return (
                  <StaggerItem key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={navClass(item)}
                      style={{ textDecoration: 'none', position: 'relative' }}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active-indicator"
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background:
                                  item.iconKey === 'driver'
                                    ? 'rgba(16,185,129,0.12)'
                                    : 'rgba(79,94,244,0.12)',
                                border:
                                  item.iconKey === 'driver'
                                    ? '1px solid rgba(16,185,129,0.25)'
                                    : '1px solid rgba(79,94,244,0.25)'
                              }}
                              transition={springGentle}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-3 w-full">
                            <motion.span
                              animate={isActive ? { rotate: [0, -8, 0] } : { rotate: 0 }}
                              transition={{ duration: 0.35 }}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                            </motion.span>
                            <motion.span
                              initial={false}
                              animate={{ opacity: 1 }}
                              className="truncate"
                            >
                              {label}
                            </motion.span>
                          </span>
                        </>
                      )}
                    </NavLink>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </div>

          {/* Logout */}
          <div className="space-y-2">
            <div className="divider-brand" />
            <button
              type="button"
              onClick={() => { logout(); navigate(paths.login); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-all border-0 bg-transparent mt-1"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign out</span>
            </button>
          </div>
        </motion.aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Top bar — desktop & mobile */}
          <header
            className="shrink-0 z-[100] border-b border-white/[0.06]"
            style={{ background: 'rgba(8, 12, 20, 0.92)', backdropFilter: 'blur(20px)' }}
          >
            <div className="h-14 flex items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-2 md:hidden">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4f5ef4, #7c3aed)' }}
                >
                  <Car className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-extrabold text-sm tracking-wide text-white">RIDE SHARE</span>
              </div>
              <div className="hidden md:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
                  Commuter Hub
                </p>
                <p className="text-sm font-semibold text-white/90 leading-tight">
                  Welcome back, {user?.name?.split(' ')[0] || 'there'}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                  style={{
                    background: 'rgba(79,94,244,0.12)',
                    border: '1px solid rgba(79,94,244,0.28)'
                  }}
                >
                  <Zap className="h-3 w-3 text-brand-400" />
                  <span className="text-brand-300">Live</span>
                </div>
                <ModeSwitcher variant="compact" className="hidden sm:flex" />
                <NotificationBell />
              </div>
            </div>
            <div className="px-4 pb-2.5 md:hidden">
              <CommuterRoleToggle size="compact" />
            </div>
          </header>

          {/* Page content */}
          <section className="flex-1 overflow-y-auto p-4 md:p-8 text-white">
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                <Outlet />
              </PageTransition>
            </AnimatePresence>
          </section>

          {/* Mobile bottom nav */}
          <footer className="md:hidden shrink-0 z-20 border-t border-white/[0.06] px-2 pb-safe"
            style={{ background: 'rgba(8, 12, 20, 0.9)', backdropFilter: 'blur(20px)', height: '64px' }}>
            <StaggerList className="flex justify-around items-center h-full" as="div">
              {navItems.map((item) => {
                const { to, shortLabel, iconKey, end } = item;
                const Icon = ICONS[iconKey] || Car;
                return (
                  <StaggerItem key={to} className="flex-1 flex justify-center">
                    <NavLink
                      to={to}
                      end={end}
                      className={mobileNavClass(item)}
                      style={{ textDecoration: 'none' }}
                    >
                      {({ isActive }) => (
                        <motion.div
                          className="flex flex-col items-center gap-0.5"
                          whileTap={{ scale: 0.92 }}
                          transition={springGentle}
                        >
                          <div
                            className={`p-1.5 rounded-lg transition-all ${
                              isActive
                                ? item.iconKey === 'driver'
                                  ? 'bg-emerald-500/20'
                                  : 'bg-brand-500/20'
                                : ''
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span>{shortLabel}</span>
                          {isActive && (
                            <motion.div
                              layoutId="mobile-nav-indicator"
                              className="h-0.5 w-5 rounded-full bg-brand-400 mt-0.5"
                              transition={springGentle}
                            />
                          )}
                        </motion.div>
                      )}
                    </NavLink>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          </footer>
        </main>
      </div>

      <DriverActiveVehicleModal
        open={vehicleModalOpen}
        vehicles={pickVehicles.length ? pickVehicles : undefined}
        onDone={() => setVehicleModalOpen(false)}
      />
    </div>
  );
}

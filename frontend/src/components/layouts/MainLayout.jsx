import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Car, Ticket, Truck, User, LogOut, Map, LayoutDashboard, History, Users } from 'lucide-react';
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
import DemoModeBanner from '@/components/common/DemoModeBanner';

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
  const isDriver = item.iconKey === 'driver';
  if (isActive && isDriver) {
    return [
      'w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold no-underline transition-all',
      'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
    ].join(' ');
  }
  return [
    'w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold no-underline transition-all',
    '[&>span]:no-underline [&>svg]:shrink-0',
    isActive
      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/10'
      : 'text-white/85 hover:text-white hover:bg-brand-500/10 hover:border-brand-500/30 border-2 border-transparent'
  ].join(' ');
};

const mobileNavClass = (item) => ({ isActive }) => {
  const isDriver = item.iconKey === 'driver';
  if (isActive && isDriver) return 'flex flex-col items-center gap-0.5 text-xs font-semibold no-underline text-emerald-300';
  return `flex flex-col items-center gap-0.5 text-xs font-semibold no-underline ${
    isActive ? 'text-brand-300' : 'text-white/90'
  }`;
};

export default function MainLayout() {
  const { user, logout, setUser } = useAuth();
  const { navItems } = useRoles();
  const navigate = useNavigate();
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

  return (
    <div className="flex h-screen flex-col bg-slateCustom-900 text-white overflow-hidden bg-grid">
      <DemoModeBanner />
      <div className="flex min-h-0 flex-1">
      <aside className="w-64 glass-panel border-y-0 border-l-0 hidden md:flex flex-col justify-between p-6">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white shadow-lg shadow-brand-500/20">
              <Car className="h-5.5 w-5.5" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-wider">RIDE SHARE</span>
              <div className="text-[10px] text-brand-400 font-bold uppercase tracking-widest leading-none">
                COMMUTER HUB
              </div>
            </div>
          </div>

          <div className="p-2.5 bg-brand-500/5 border border-brand-500/20 rounded-lg space-y-2">
            <div className="flex items-center gap-2.5">
              <img
                src={getUserAvatarUrl(user)}
                alt=""
                className="h-8 w-8 rounded-full object-cover border border-brand-500/40 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[13px] text-white truncate leading-tight">
                  {user?.name}
                </div>
              </div>
            </div>
            <CommuterRoleToggle />
          </div>

          <div className="space-y-2">
          <DriverActiveVehiclePicker
            onNeedsPick={async (needs) => {
              if (!needs) return;
              const res = await profileService.getDriverStatus();
              setPickVehicles(res.data?.approvedVehicles || []);
              setVehicleModalOpen(true);
            }}
          />
          <DriverOnlineToggle />
          </div>

          <nav className="space-y-1 mt-3">
            {navItems.map((item) => {
              const { to, label, iconKey, end } = item;
              const Icon = ICONS[iconKey] || Car;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={navClass(item)}
                  style={{ textDecoration: 'none' }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="no-underline">{label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all no-underline border-0 bg-transparent"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout Session</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden shrink-0 z-10 border-b border-slateCustom-800 glass-panel">
          <div className="h-14 flex items-center px-4">
            <div className="flex items-center gap-2.5">
              <Car className="h-6 w-6 text-brand-400" />
              <span className="font-extrabold text-base tracking-wider text-white">RIDE SHARE</span>
            </div>
          </div>
          <div className="px-4 pb-3">
            <CommuterRoleToggle size="compact" />
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-8 text-white">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </section>

        <footer className="h-16 border-t border-slateCustom-800 glass-panel md:hidden flex justify-around items-center shrink-0 z-10 px-1">
          {navItems.map((item) => {
            const { to, shortLabel, iconKey, end } = item;
            const Icon = ICONS[iconKey] || Car;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={mobileNavClass(item)}
                style={{ textDecoration: 'none' }}
              >
                <Icon className="h-5 w-5" />
                <span>{shortLabel}</span>
              </NavLink>
            );
          })}
        </footer>
      </main>

      <DriverActiveVehicleModal
        open={vehicleModalOpen}
        vehicles={pickVehicles.length ? pickVehicles : undefined}
        onDone={() => setVehicleModalOpen(false)}
      />
      </div>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CommuteIcon from '@mui/icons-material/Commute';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import ReportIcon from '@mui/icons-material/Report';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CampaignIcon from '@mui/icons-material/Campaign';
import SecurityIcon from '@mui/icons-material/Security';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import PriceChangeIcon from '@mui/icons-material/PriceChange';

const NAV = [
  { to: '/', label: 'Overview', icon: DashboardIcon },
  { to: '/users', label: 'Users', icon: PeopleIcon },
  { to: '/drivers', label: 'Drivers', icon: TwoWheelerIcon },
  { to: '/vehicles', label: 'Vehicles', icon: DirectionsCarIcon },
  { to: '/verifications', label: 'Verifications', icon: VerifiedUserIcon },
  { to: '/rides', label: 'Rides', icon: CommuteIcon },
  { to: '/bookings', label: 'Bookings', icon: BookOnlineIcon },
  { to: '/reports', label: 'Trust & Safety', icon: SecurityIcon },
  { to: '/fare-settings', label: 'Fare factors', icon: PriceChangeIcon },
  { to: '/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { to: '/notifications', label: 'Notifications', icon: CampaignIcon }
];

export default function Sidebar() {
  const open = useSelector((s) => s.ui.sidebarOpen);

  return (
    <aside
      className={`${open ? 'w-64' : 'w-[72px]'} shrink-0 border-r border-slate-800 bg-slate-900/95 transition-all duration-200 hidden md:flex flex-col`}
    >
      <div className="p-4 border-b border-slate-800">
        <p className={`font-extrabold text-indigo-400 ${!open && 'text-center text-xs'}`}>
          {open ? 'Ride Share' : 'RS'}
        </p>
        {open && <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Console</p>}
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon fontSize="small" />
            {open && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

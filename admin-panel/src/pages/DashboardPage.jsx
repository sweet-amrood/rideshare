import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, List, ListItem, ListItemText, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import CommuteIcon from '@mui/icons-material/Commute';
import BookOnlineIcon from '@mui/icons-material/BookOnline';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ReportIcon from '@mui/icons-material/Report';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PieChartIcon from '@mui/icons-material/PieChart';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import HistoryIcon from '@mui/icons-material/History';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { loadOverview, loadActivity, loadCharts } from '@/store/slices/dashboardSlice';
import StatCard from '@/components/common/StatCard';
import ChartPanel from '@/components/dashboard/ChartPanel';
import PageHeader from '@/components/common/PageHeader';

const COLORS = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#a78bfa'];

const formatPieData = (rows) =>
  (rows || []).map((r) => ({
    name: r._id || 'Unknown',
    count: r.count
  }));

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { overview, activity, charts, realtime, loading } = useSelector((s) => s.dashboard);
  const chartsLoading = loading && !charts;

  useEffect(() => {
    dispatch(loadOverview());
    dispatch(loadActivity());
    dispatch(loadCharts());
  }, [dispatch]);

  const bookingGrowth = charts?.bookingsByDay?.length ? charts.bookingsByDay : [];
  const pieData = formatPieData(charts?.bookingStatusBreakdown);
  const usersGrowth = charts?.usersByDay?.length ? charts.usersByDay : [];

  const stats = overview
    ? [
        { title: 'Total users', value: overview.totalUsers, icon: PeopleIcon, color: 'primary' },
        {
          title: 'Drivers',
          value: overview.totalDrivers,
          subtitle: `${overview.totalRiders} riders`,
          icon: PeopleIcon,
          color: 'secondary'
        },
        { title: 'Active rides', value: overview.activeRides, icon: CommuteIcon, color: 'primary' },
        { title: 'Bookings', value: overview.totalBookings, icon: BookOnlineIcon, color: 'secondary' },
        {
          title: 'Completed rides',
          value: overview.completedRides,
          icon: CheckCircleIcon,
          color: 'success'
        },
        {
          title: 'Pending verifications',
          value: overview.pendingVerifications,
          icon: VerifiedUserIcon,
          color: 'warning'
        },
        {
          title: 'Revenue (PKR)',
          value: overview.totalRevenue?.toLocaleString?.() ?? overview.totalRevenue,
          icon: AttachMoneyIcon,
          color: 'success'
        },
        { title: 'Open reports', value: overview.openReports, icon: ReportIcon, color: 'error' },
        { title: 'Vehicles', value: overview.totalVehicles, icon: DirectionsCarIcon, color: 'primary' },
        {
          title: 'Live now',
          value: realtime?.activeBookings ?? '—',
          subtitle: `${realtime?.activeRides ?? 0} active rides`,
          icon: OnlinePredictionIcon,
          color: 'secondary'
        }
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Platform overview"
        subtitle="Startup-style command center for Ride Share operations"
      />
      <Grid container spacing={2} className="mb-6">
        {stats.map((s) => (
          <Grid item xs={6} sm={4} md={3} key={s.title}>
            <StatCard {...s} loading={loading && !overview} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <ChartPanel
            title="Booking growth (30 days)"
            icon={TrendingUpIcon}
            loading={chartsLoading}
            emptyMessage={!chartsLoading && !bookingGrowth.length ? 'No bookings in the last 30 days' : null}
          >
            {bookingGrowth.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={bookingGrowth}>
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Bookings"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </Grid>
        <Grid item xs={12} lg={4}>
          <ChartPanel
            title="Booking status"
            icon={PieChartIcon}
            loading={chartsLoading}
            emptyMessage={!chartsLoading && !pieData.length ? 'No booking data yet' : null}
          >
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={72}
                    label={({ name, count }) => `${name}: ${count}`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartPanel
            title="New users"
            icon={GroupAddIcon}
            loading={chartsLoading}
            emptyMessage={!chartsLoading && !usersGrowth.length ? 'No new signups in the last 30 days' : null}
          >
            {usersGrowth.length > 0 && (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={usersGrowth}>
                  <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  />
                  <Bar dataKey="count" name="Users" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartPanel title="Recent activity" icon={HistoryIcon} loading={loading && !activity?.length}>
            {!activity?.length && !loading ? (
              <Typography variant="body2" color="text.secondary" className="py-12 text-center">
                No recent platform activity
              </Typography>
            ) : (
              <List dense className="max-h-[220px] overflow-y-auto">
                {(activity || []).slice(0, 10).map((item, i) => (
                  <ListItem key={i} divider>
                    <ListItemText
                      primary={item.title}
                      secondary={new Date(item.at).toLocaleString()}
                      primaryTypographyProps={{ fontSize: 13 }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </ChartPanel>
        </Grid>
      </Grid>
    </div>
  );
}

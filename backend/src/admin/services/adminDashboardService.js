const User = require('../../models/User');
const Ride = require('../../models/Ride');
const Booking = require('../../models/Booking');
const Vehicle = require('../../models/Vehicle');
const Report = require('../../models/Report');
const VerificationRequest = require('../../models/VerificationRequest');

const getOverview = async () => {
  const [
    totalUsers,
    totalDrivers,
    totalRiders,
    activeRides,
    totalBookings,
    completedRides,
    pendingVerifications,
    openReports,
    totalVehicles,
    revenueAgg
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: { $in: ['DRIVER'] } }),
    User.countDocuments({ roles: { $in: ['RIDER'] } }),
    Ride.countDocuments({ status: { $in: ['SCHEDULED', 'ACTIVE'] } }),
    Booking.countDocuments(),
    Ride.countDocuments({ status: 'COMPLETED' }),
    VerificationRequest.countDocuments({ status: 'PENDING' }),
    Report.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
    Vehicle.countDocuments(),
    Booking.aggregate([
      { $match: { paymentStatus: { $in: ['PAID', 'REFUND_PENDING'] } } },
      { $group: { _id: null, total: { $sum: '$farePaid' } } }
    ])
  ]);

  const suspendedUsers = await User.countDocuments({ accountStatus: { $ne: 'ACTIVE' } });

  return {
    totalUsers,
    totalDrivers,
    totalRiders,
    activeRides,
    totalBookings,
    completedRides,
    pendingVerifications,
    openReports,
    totalVehicles,
    suspendedUsers,
    onlineUsers: 0,
    totalRevenue: revenueAgg[0]?.total || 0,
    reportsSubmitted: await Report.countDocuments()
  };
};

const getRecentActivity = async (limit = 20) => {
  const [users, rides, bookings, reports] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(5).select('name email roles createdAt profile'),
    Ride.find().sort({ createdAt: -1 }).limit(5).populate('driverId', 'name').select('origin destination status departureDate'),
    Booking.find().sort({ createdAt: -1 }).limit(5).populate('passengerId', 'name').select('status farePaid seatsBooked createdAt'),
    Report.find().sort({ createdAt: -1 }).limit(5).populate('reporterId reportedUserId', 'name').select('category status createdAt')
  ]);

  const feed = [
    ...users.map((u) => ({
      type: 'USER_REGISTERED',
      title: `New user: ${u.name}`,
      subtitle: u.email,
      at: u.createdAt,
      meta: { userId: u._id }
    })),
    ...rides.map((r) => ({
      type: 'RIDE_POSTED',
      title: `Ride by ${r.driverId?.name || 'Driver'}`,
      subtitle: `${r.origin?.address} → ${r.destination?.address}`,
      at: r.createdAt,
      meta: { rideId: r._id, status: r.status }
    })),
    ...bookings.map((b) => ({
      type: 'BOOKING',
      title: `Booking ${b.status}`,
      subtitle: `${b.passengerId?.name} · Rs.${b.farePaid}`,
      at: b.createdAt,
      meta: { bookingId: b._id }
    })),
    ...reports.map((r) => ({
      type: 'REPORT',
      title: `Report: ${r.category}`,
      subtitle: r.status,
      at: r.createdAt,
      meta: { reportId: r._id }
    }))
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);

  return feed;
};

const getChartData = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [usersByDay, ridesByDay, bookingsByDay] = await Promise.all([
    User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Ride.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$farePaid' }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const bookingStatusBreakdown = await Booking.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const topUniversities = await User.aggregate([
    { $match: { 'profile.universityOrCompany': { $ne: '' } } },
    { $group: { _id: '$profile.universityOrCompany', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);

  const peakHours = await Ride.aggregate([
    {
      $group: {
        _id: { $hour: '$departureDate' },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 12 }
  ]);

  return {
    usersByDay,
    ridesByDay,
    bookingsByDay,
    bookingStatusBreakdown,
    topUniversities,
    peakHours
  };
};

module.exports = { getOverview, getRecentActivity, getChartData };

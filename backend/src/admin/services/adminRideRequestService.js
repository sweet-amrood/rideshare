const RideRequest = require('../../models/RideRequest');
const User = require('../../models/User');
const Review = require('../../models/Review');
const Report = require('../../models/Report');
const { RIDE_REQUEST_STATUS } = require('../../constants/rideRequest');

const ONGOING = [RIDE_REQUEST_STATUS.ACCEPTED, RIDE_REQUEST_STATUS.IN_PROGRESS];
const DONE = [RIDE_REQUEST_STATUS.COMPLETED];

const listRideRequests = async ({ page = 1, limit = 25, bucket, vehicleType }) => {
  const q = {};
  if (bucket === 'ongoing') q.status = { $in: ONGOING };
  else if (bucket === 'completed') q.status = { $in: DONE };
  else if (bucket === 'searching') {
    q.status = { $in: [RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING] };
  }
  if (vehicleType) q.vehicleType = vehicleType;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    RideRequest.find(q)
      .populate('passengerId', 'name email phoneNumber accountStatus')
      .populate('acceptedDriverId', 'name email phoneNumber accountStatus')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RideRequest.countDocuments(q)
  ]);

  return {
    items: items.map((r) => ({
      ...r,
      type: 'ON_DEMAND',
      agreedFare: r.agreedFare ?? r.passengerOfferedFare
    })),
    total,
    page,
    limit
  };
};

const listDriversEnriched = async ({ status, page = 1, limit = 100 }) => {
  const q = {
    $or: [
      { roles: { $in: ['DRIVER'] } },
      { driverApplicant: true },
      { 'verification.cnicUrl': { $nin: [null, ''] } }
    ]
  };
  if (status === 'pending') {
    q['verification.status'] = { $in: ['PENDING', 'UNVERIFIED'] };
    q.accountStatus = { $nin: ['SUSPENDED', 'BANNED'] };
  } else if (status === 'active') {
    q['verification.status'] = 'APPROVED';
    q.driverSetupComplete = true;
    q.accountStatus = 'ACTIVE';
  } else if (status === 'blocked') {
    q.accountStatus = { $in: ['SUSPENDED', 'BANNED'] };
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password').lean(),
    User.countDocuments(q)
  ]);

  const ids = items.map((d) => d._id);
  const stats = await RideRequest.aggregate([
    { $match: { acceptedDriverId: { $in: ids } } },
    {
      $group: {
        _id: '$acceptedDriverId',
        ongoing: {
          $sum: { $cond: [{ $in: ['$status', ONGOING] }, 1, 0] }
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', RIDE_REQUEST_STATUS.COMPLETED] }, 1, 0] }
        }
      }
    }
  ]);
  const statMap = Object.fromEntries(stats.map((s) => [String(s._id), s]));

  return {
    items: items.map((d) => ({
      ...d,
      rideStats: statMap[String(d._id)] || { ongoing: 0, completed: 0 }
    })),
    total,
    page,
    limit
  };
};

const listBookingsUnified = async ({ page = 1, limit = 20, status, source }) => {
  const Booking = require('../../models/Booking');
  const results = { carpool: [], onDemand: [], totalCarpool: 0, totalOnDemand: 0 };

  if (source !== 'on_demand') {
    const bq = status ? { status } : {};
    const skip = (page - 1) * limit;
    [results.carpool, results.totalCarpool] = await Promise.all([
      Booking.find(bq)
        .populate('passengerId', 'name email phoneNumber')
        .populate({
          path: 'rideId',
          populate: { path: 'driverId', select: 'name email phoneNumber' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(bq)
    ]);
  }

  if (source !== 'carpool') {
    const rq = {};
    if (status === 'COMPLETED') rq.status = RIDE_REQUEST_STATUS.COMPLETED;
    else if (status) rq.status = status;
    const skip = (page - 1) * limit;
    [results.onDemand, results.totalOnDemand] = await Promise.all([
      RideRequest.find(rq)
        .populate('passengerId', 'name email')
        .populate('acceptedDriverId', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RideRequest.countDocuments(rq)
    ]);
  }

  return { ...results, page, limit };
};

const getRideRequestDetail = async (id) => {
  const request = await RideRequest.findById(id)
    .populate('passengerId', 'name email phoneNumber profile')
    .populate('acceptedDriverId', 'name email phoneNumber profile')
    .lean();
  if (!request) {
    const err = new Error('Ride request not found');
    err.statusCode = 404;
    throw err;
  }
  const reviews = await Review.find({ rideRequestId: id })
    .populate('reviewerId', 'name')
    .lean();
  const reports = await Report.find({ rideRequestId: id })
    .populate('reporterId', 'name')
    .populate('reportedUserId', 'name')
    .lean();
  return { request, reviews, reports };
};

module.exports = {
  listRideRequests,
  listDriversEnriched,
  listBookingsUnified,
  getRideRequestDetail
};

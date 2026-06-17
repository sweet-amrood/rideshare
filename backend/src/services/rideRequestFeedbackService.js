const RideRequest = require('../models/RideRequest');
const Review = require('../models/Review');
const Report = require('../models/Report');
const User = require('../models/User');
const { RIDE_REQUEST_STATUS } = require('../constants/rideRequest');
const { markViewerClosed } = require('./activeRideService');

const assertCompletedParticipant = async (requestId, userId) => {
  const request = await RideRequest.findById(requestId);
  if (!request) throw new Error('Ride not found');
  if (request.status !== RIDE_REQUEST_STATUS.COMPLETED) {
    const err = new Error('Reviews and reports are only allowed after the ride is completed');
    err.statusCode = 400;
    throw err;
  }
  const isPassenger = String(request.passengerId) === String(userId);
  const isDriver = String(request.acceptedDriverId) === String(userId);
  if (!isPassenger && !isDriver) {
    const err = new Error('You were not part of this ride');
    err.statusCode = 403;
    throw err;
  }
  const revieweeId = isPassenger ? request.acceptedDriverId : request.passengerId;
  return { request, revieweeId, role: isPassenger ? 'PASSENGER' : 'DRIVER' };
};

const submitReview = async (requestId, reviewerId, { rating, comment }) => {
  const { request, revieweeId } = await assertCompletedParticipant(requestId, reviewerId);

  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  const existing = await Review.findOne({
    revieweeId,
    reviewerId,
    rideRequestId: requestId
  });
  if (existing) {
    throw new Error('You already reviewed this ride');
  }

  const review = await Review.create({
    revieweeId,
    reviewerId,
    rideRequestId: requestId,
    rating,
    comment: (comment || '').trim().slice(0, 500)
  });

  const all = await Review.find({ revieweeId });
  const user = await User.findById(revieweeId);
  if (user) {
    user.rating.average = Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10;
    user.rating.count = all.length;
    await user.save();
  }

  await review.populate('reviewerId', 'name profile');
  await markViewerClosed(
    requestId,
    reviewerId,
    String(request.passengerId) === String(reviewerId) ? 'PASSENGER' : 'DRIVER'
  );
  return review;
};

const submitReport = async (requestId, reporterId, { category, description }) => {
  const { request, revieweeId } = await assertCompletedParticipant(requestId, reporterId);

  if (!category || !description?.trim()) {
    throw new Error('Category and description are required');
  }

  const report = await Report.create({
    reporterId,
    reportedUserId: revieweeId,
    rideRequestId: requestId,
    category,
    description: description.trim().slice(0, 2000),
    status: 'OPEN'
  });

  return report;
};

module.exports = { submitReview, submitReport, assertCompletedParticipant };

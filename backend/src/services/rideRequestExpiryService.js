const RideRequest = require('../models/RideRequest');
const { RIDE_REQUEST_STATUS, SEARCH_AUTO_CANCEL_MINUTES } = require('../constants/rideRequest');
const { emitRideRequestEvent } = require('./realtimeService');

const searchAutoCancelDate = () =>
  new Date(Date.now() + SEARCH_AUTO_CANCEL_MINUTES * 60 * 1000);

const autoCancelRequest = async (request, reason = 'No driver found within 5 minutes') => {
  if (!request) return null;
  if (![RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING].includes(request.status)) {
    return request;
  }

  request.status = RIDE_REQUEST_STATUS.CANCELLED;
  request.cancelledAt = new Date();
  request.cancelledBy = 'SYSTEM';
  request.cancelReason = reason;
  request.searchAutoCancelAt = null;
  await request.save();

  const payload = {
    requestId: request._id,
    cancelledBy: 'SYSTEM',
    reason,
    auto: true
  };
  emitRideRequestEvent(String(request.passengerId), 'ride-request:cancelled', payload);

  return request;
};

const processDueSearchCancellations = async (passengerId = null) => {
  const q = {
    status: { $in: [RIDE_REQUEST_STATUS.SEARCHING, RIDE_REQUEST_STATUS.OFFERS_PENDING] },
    searchAutoCancelAt: { $lte: new Date() }
  };
  if (passengerId) q.passengerId = passengerId;

  const due = await RideRequest.find(q).limit(50);
  for (const doc of due) {
    await autoCancelRequest(doc);
  }
  return due.length;
};

const clearSearchAutoCancel = async (requestId) => {
  await RideRequest.updateOne({ _id: requestId }, { $set: { searchAutoCancelAt: null } });
};

module.exports = {
  searchAutoCancelDate,
  autoCancelRequest,
  processDueSearchCancellations,
  clearSearchAutoCancel
};

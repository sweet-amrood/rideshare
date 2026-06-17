let appIo = null;

const setAppIo = (io) => {
  appIo = io;
};

const emitToUser = (userId, event, payload) => {
  if (!appIo || !userId) return;
  appIo.to(`user:${userId}`).emit(event, payload);
};

const emitRideRequestEvent = (userId, event, payload) => {
  emitToUser(userId, event, { ...payload, at: new Date().toISOString() });
};

const emitToRideRequest = (requestId, event, payload) => {
  if (!appIo || !requestId) return;
  appIo.to(`ride-request:${requestId}`).emit(event, { ...payload, at: new Date().toISOString() });
};

module.exports = { setAppIo, emitToUser, emitRideRequestEvent, emitToRideRequest };

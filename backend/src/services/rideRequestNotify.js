const { createNotification } = require('./notificationService');

const notifyInApp = async (userId, type, request, extra = {}) => {
  await createNotification({
    userId,
    type,
    title: extra.title || 'Ride update',
    body: extra.body || '',
    data: {
      requestId: request._id,
      requestRef: request.requestRef,
      ...extra.data
    }
  });
};

module.exports = { notifyInApp };

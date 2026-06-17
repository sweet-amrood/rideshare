const Notification = require('../models/Notification');

const notifyInApp = async (userId, type, request, extra = {}) => {
  try {
    await Notification.create({
      userId,
      type,
      title: extra.title || 'Ride update',
      body: extra.body || '',
      data: { requestId: request._id, requestRef: request.requestRef, ...extra.data }
    });
  } catch (err) {
    console.warn('Notification skipped:', err.message);
  }
};

module.exports = { notifyInApp };

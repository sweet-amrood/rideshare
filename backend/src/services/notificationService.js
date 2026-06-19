const Notification = require('../models/Notification');
const { emitToUser } = require('./realtimeService');

const formatNotification = (doc) => {
  const n = doc?.toObject ? doc.toObject() : doc;
  return {
    _id: n._id,
    type: n.type,
    title: n.title,
    body: n.body,
    data: n.data || {},
    read: !!n.read,
    createdAt: n.createdAt
  };
};

const createNotification = async ({ userId, type, title, body, data = {} }) => {
  if (!userId || !type || !title) return null;
  try {
    const doc = await Notification.create({
      userId,
      type,
      title,
      body: body || '',
      data
    });
    const payload = formatNotification(doc);
    emitToUser(String(userId), 'notification:new', payload);
    return doc;
  } catch (err) {
    console.warn('[notification] create skipped:', err.message);
    return null;
  }
};

const listNotifications = async (userId, { limit = 40, unreadOnly = false } = {}) => {
  const query = { userId };
  if (unreadOnly) query.read = false;
  const items = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, limit))
    .lean();
  return items.map(formatNotification);
};

const countUnread = (userId) => Notification.countDocuments({ userId, read: false });

const markRead = async (userId, notificationId) => {
  const doc = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { read: true },
    { new: true }
  ).lean();
  return doc ? formatNotification(doc) : null;
};

const markAllRead = async (userId) => {
  await Notification.updateMany({ userId, read: false }, { read: true });
  return countUnread(userId);
};

module.exports = {
  createNotification,
  listNotifications,
  countUnread,
  markRead,
  markAllRead,
  formatNotification
};

const {
  listNotifications,
  countUnread,
  markRead,
  markAllRead
} = require('../services/notificationService');

const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 40;
    const unreadOnly = req.query.unreadOnly === 'true';
    const [items, unreadCount] = await Promise.all([
      listNotifications(req.user._id, { limit, unreadOnly }),
      countUnread(req.user._id)
    ]);
    return res.json({ success: true, data: items, unreadCount });
  } catch (e) {
    next(e);
  }
};

const patchRead = async (req, res, next) => {
  try {
    const item = await markRead(req.user._id, req.params.id);
    if (!item) {
      res.status(404);
      throw new Error('Notification not found');
    }
    const unreadCount = await countUnread(req.user._id);
    return res.json({ success: true, data: item, unreadCount });
  } catch (e) {
    next(e);
  }
};

const patchReadAll = async (req, res, next) => {
  try {
    const unreadCount = await markAllRead(req.user._id);
    return res.json({ success: true, unreadCount });
  } catch (e) {
    next(e);
  }
};

module.exports = { getNotifications, patchRead, patchReadAll };

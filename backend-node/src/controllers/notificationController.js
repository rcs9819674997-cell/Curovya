const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const getUserId = (req) => req.user.id || req.user.sub;

/**
 * List my notifications
 */
const listNotifications = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  let notifications = await Notification.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  notifications = notifications.map(n => {
    const obj = { ...n };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(notifications);
});

/**
 * Get unread count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const count = await Notification.countDocuments({ 
    user_id: userId, 
    read: false 
  });

  res.json({ count });
});

/**
 * Mark notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { notif_id } = req.params;

  const result = await Notification.updateOne(
    { id: notif_id, user_id: userId },
    { read: true }
  );

  if (result.matchedCount === 0) {
    throw new ApiError(404, 'Notification not found');
  }

  res.json({ ok: true });
});

/**
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  await Notification.updateMany(
    { user_id: userId, read: false },
    { read: true }
  );

  res.json({ ok: true });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

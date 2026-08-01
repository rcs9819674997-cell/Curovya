const Notification = require('../models/Notification');
const { generateId } = require('./helpers');
const logger = require('./logger');

// Lazy-require redis to avoid circular dependency during module load
let _redis = null;
const getRedis = () => {
  if (!_redis) _redis = require('../config/redis');
  return _redis;
};

/**
 * Push a notification to a user and publish via Redis pub/sub.
 *
 * @param {string} userId   – Target user's id
 * @param {string} type     – Notification type (appointment, lab, prescription, etc.)
 * @param {string} title    – Short title
 * @param {string} body     – Notification body text
 * @param {string|null} action – Optional deep-link action path
 */
async function pushNotification(userId, type, title, body, action = null) {
  try {
    await Notification.create({
      id: generateId(),
      user_id: userId,
      type,
      title,
      body,           // ← matches Notification model's `body` field
      read: false,
      action,
    });

    // Publish to Redis for real-time updates (non-blocking)
    const redis = getRedis();
    await redis.publish(`notification:${userId}`, {
      type,
      title,
      body,
      action,
    });
  } catch (error) {
    // Notification failure should never crash the request
    logger.error('Failed to push notification:', error);
  }
}

module.exports = { pushNotification };

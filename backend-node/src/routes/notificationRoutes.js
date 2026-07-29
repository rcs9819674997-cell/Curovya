const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.get('/', authenticate, notificationController.listNotifications);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.post('/:notif_id/read', authenticate, notificationController.markAsRead);
router.post('/read-all', authenticate, notificationController.markAllAsRead);

module.exports = router;

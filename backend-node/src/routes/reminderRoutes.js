const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminderController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.get('/', authenticate, reminderController.listReminders);
router.post('/', authenticate, reminderController.createReminder);
router.post('/from-prescription/:rx_id', authenticate, reminderController.createRemindersFromPrescription);
router.patch('/:rem_id', authenticate, reminderController.updateReminder);
router.delete('/:rem_id', authenticate, reminderController.deleteReminder);
router.post('/:rem_id/log', authenticate, reminderController.logDose);
router.get('/today', authenticate, reminderController.getTodaysDoses);
router.get('/:rem_id/logs', authenticate, reminderController.getDoseLogs);

module.exports = router;

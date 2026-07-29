const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.post('/', authenticate, appointmentController.bookAppointment);
router.get('/', authenticate, appointmentController.listMyAppointments);
router.get('/:appt_id', authenticate, appointmentController.getAppointment);
router.get('/:appt_id/queue', authenticate, appointmentController.getQueueView);
router.delete('/:appt_id', authenticate, appointmentController.cancelAppointment);

module.exports = router;

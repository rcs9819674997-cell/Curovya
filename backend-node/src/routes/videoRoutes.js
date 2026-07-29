const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { authenticate, requireDoctor } = require('../middleware/auth');

// Protected routes
router.post('/token', authenticate, videoController.generateVideoToken);
router.post('/start', authenticate, requireDoctor, videoController.startVideoConsultation);
router.post('/end', authenticate, videoController.endVideoConsultation);
router.get('/appointment/:appointment_id', authenticate, videoController.getVideoAppointmentStatus);

module.exports = router;

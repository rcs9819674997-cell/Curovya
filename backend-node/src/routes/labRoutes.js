const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { authenticate, requireLabAdmin } = require('../middleware/auth');

// Public routes
router.get('/tests', labController.listLabTests);

// Protected patient routes
router.post('/bookings', authenticate, labController.bookLabTest);
router.get('/bookings', authenticate, labController.listMyLabBookings);

// Protected lab admin routes
router.get('/dashboard', authenticate, requireLabAdmin, labController.getLabDashboard);
router.get('/bookings/all', authenticate, requireLabAdmin, labController.listAllLabBookings);
router.patch('/bookings/:booking_id', authenticate, requireLabAdmin, labController.updateLabBooking);

module.exports = router;

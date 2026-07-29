const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, doctorController.listDoctors);
router.get('/specialties', optionalAuth, doctorController.getSpecialties);
router.get('/:doctor_id', optionalAuth, doctorController.getDoctor);
router.get('/:doctor_id/slots', optionalAuth, doctorController.getDoctorSlots);
router.get('/:doctor_id/reviews', optionalAuth, doctorController.getDoctorReviews);

// Protected routes
router.post('/:doctor_id/reviews', authenticate, doctorController.submitReview);
router.get('/:doctor_id/my-review', authenticate, doctorController.getMyReview);

module.exports = router;

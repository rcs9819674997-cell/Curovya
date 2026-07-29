const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, requireDoctor } = require('../middleware/auth');

// Protected patient routes
router.get('/', authenticate, prescriptionController.listPrescriptions);
router.get('/:rx_id', authenticate, prescriptionController.getPrescription);

// Protected doctor routes
router.post('/', authenticate, requireDoctor, prescriptionController.createPrescription);

module.exports = router;

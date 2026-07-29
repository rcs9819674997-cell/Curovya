const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, emergencyController.listEmergencyContacts);
router.get('/contacts', optionalAuth, emergencyController.listEmergencyContacts);

module.exports = router;

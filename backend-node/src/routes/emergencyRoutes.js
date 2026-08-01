const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { optionalAuth } = require('../middleware/auth');

// Public / Optional Auth routes
router.get('/', optionalAuth, emergencyController.listEmergencyContacts);
router.get('/contacts', optionalAuth, emergencyController.listEmergencyContacts);
router.get('/services', optionalAuth, emergencyController.listEmergencyContacts);
router.post('/dispatch', optionalAuth, emergencyController.dispatchEmergency);

module.exports = router;

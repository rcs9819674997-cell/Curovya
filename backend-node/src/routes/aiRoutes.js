const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Routes
router.post('/symptom-check', optionalAuth, apiLimiter, aiController.symptomCheck);
router.post('/symptom-checker', optionalAuth, apiLimiter, aiController.symptomCheck);

module.exports = router;

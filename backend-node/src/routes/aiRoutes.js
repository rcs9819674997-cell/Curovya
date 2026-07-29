const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// Protected routes
router.post('/symptom-check', authenticate, apiLimiter, aiController.symptomCheck);

module.exports = router;

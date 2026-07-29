const express = require('express');
const router = express.Router();
const healthRecordController = require('../controllers/healthRecordController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.get('/', authenticate, healthRecordController.listHealthRecords);

module.exports = router;

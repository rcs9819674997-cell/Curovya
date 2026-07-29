const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticate, optionalAuth } = require('../middleware/auth');

router.get('/faqs', optionalAuth, supportController.getFaqs);
router.post('/tickets', authenticate, supportController.createTicket);
router.get('/tickets', authenticate, supportController.getTickets);

module.exports = router;

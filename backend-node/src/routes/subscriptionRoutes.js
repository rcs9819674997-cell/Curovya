const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.get('/plan', paymentController.getSubscriptionPlan);
router.get('/me', authenticate, paymentController.getMySubscription);
router.get('/mine', authenticate, paymentController.getMySubscription);
router.post('/subscribe', authenticate, paymentController.subscribe);
router.post('/cancel', authenticate, paymentController.cancelSubscription);

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.post('/initiate', authenticate, paymentController.initiatePayment);
router.get('/checkout/:tx_uuid', paymentController.paymentCheckout);
router.get('/verify', paymentController.verifyPayment);
router.get('/failure', paymentController.paymentFailure);
router.get('/:tx_uuid/status', authenticate, paymentController.getPaymentStatus);

// Subscription routes
router.get('/subscription-plan', paymentController.getSubscriptionPlan);
router.get('/subscription/plan', paymentController.getSubscriptionPlan);
router.get('/subscription/me', authenticate, paymentController.getMySubscription);
router.post('/subscription/subscribe', authenticate, paymentController.subscribe);
router.post('/subscription/cancel', authenticate, paymentController.cancelSubscription);

module.exports = router;

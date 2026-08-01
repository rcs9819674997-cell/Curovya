const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.post('/change-password', authenticate, authController.changePassword);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateProfile);
router.post('/logout', authenticate, authController.logout);

// Test route without authentication
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Auth routes working' });
});


module.exports = router;

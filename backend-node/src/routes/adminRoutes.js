const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

router.use(authenticate, requireSuperAdmin);

router.get('/overview', adminController.getOverview);
router.get('/users', adminController.getUsers);
router.post('/users/:user_id/approve', adminController.approveUser);
router.post('/users/:user_id/suspend', adminController.suspendUser);
router.post('/users/:user_id/unsuspend', adminController.unsuspendUser);
router.get('/clinics', adminController.getClinics);
router.post('/clinics/:clinic_id/approve', adminController.approveClinic);
router.get('/tickets', adminController.getTickets);
router.post('/tickets/:ticket_id/reply', adminController.replyTicket);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;

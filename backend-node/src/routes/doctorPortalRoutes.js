const express = require('express');
const router = express.Router();
const doctorPortalController = require('../controllers/doctorPortalController');
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, requireDoctor } = require('../middleware/auth');

// Protected doctor routes
router.get('/stats', authenticate, requireDoctor, doctorPortalController.getDoctorStats);
router.get('/appointments', authenticate, requireDoctor, doctorPortalController.getDoctorAppointments);
router.get('/slots', authenticate, requireDoctor, doctorPortalController.getDoctorSlots);
router.post('/slots', authenticate, requireDoctor, doctorPortalController.addDoctorSlot);
router.post('/slots/bulk', authenticate, requireDoctor, doctorPortalController.bulkAddDoctorSlots);
router.delete('/slots/:slot_id', authenticate, requireDoctor, doctorPortalController.deleteDoctorSlot);
router.get('/prescriptions', authenticate, requireDoctor, doctorPortalController.getDoctorPrescriptions);
router.post('/prescriptions', authenticate, requireDoctor, prescriptionController.createPrescription);
router.post('/queue/call-next', authenticate, requireDoctor, doctorPortalController.callNextPatient);
router.post('/queue/:appointment_id/complete', authenticate, requireDoctor, doctorPortalController.completeCurrentPatient);
router.post('/queue/:appointment_id/no-show', authenticate, requireDoctor, doctorPortalController.markNoShow);
router.post('/queue/:appointment_id/skip', authenticate, requireDoctor, doctorPortalController.skipPatient);
router.post('/queue/:appointment_id/recall', authenticate, requireDoctor, doctorPortalController.recallPatient);
router.get('/queue/doctor/:doctor_id/:date', authenticate, doctorPortalController.getDoctorQueueSnapshot);
router.get('/doctor/:doctor_id/:date', authenticate, doctorPortalController.getDoctorQueueSnapshot);

module.exports = router;

const express = require('express');
const router = express.Router();
const clinicController = require('../controllers/clinicController');
const { authenticate, requireClinicStaff, requireClinicAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/mine', requireClinicStaff, clinicController.getMine);
router.get('/:clinic_id/dashboard', requireClinicStaff, clinicController.getDashboard);
router.get('/:clinic_id/appointments', requireClinicStaff, clinicController.getAppointments);
router.get('/:clinic_id/doctors', requireClinicStaff, clinicController.getDoctors);
router.get('/:clinic_id/staff', requireClinicAdmin, clinicController.getStaff);
router.post('/:clinic_id/staff', requireClinicAdmin, clinicController.addStaff);
router.delete('/:clinic_id/staff/:staff_id', requireClinicAdmin, clinicController.removeStaff);
router.post('/:clinic_id/walk-in', requireClinicStaff, clinicController.bookWalkIn);
router.patch('/appointments/:appt_id/status', requireClinicStaff, clinicController.updateAppointmentStatus);

module.exports = router;

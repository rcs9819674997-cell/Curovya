const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Prescription = require('../models/Prescription');
const Slot = require('../models/Slot');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, formatDate, formatTime, generateBookingId } = require('../utils/helpers');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Get doctor stats
 */
const getDoctorStats = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const today = formatDate(new Date());
  
  const allAppointments = await Appointment.find({ doctor_id: doctorId }).lean();
  const todayAppointments = allAppointments.filter(a => a.date === today);
  const upcomingAppointments = allAppointments.filter(a => a.date >= today && a.status === 'confirmed');
  
  const totalRevenue = allAppointments.reduce((sum, a) => sum + (a.consultation_fee || 0), 0);
  
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartDate = formatDate(monthStart);
  const monthlyRevenue = allAppointments
    .filter(a => a.date >= monthStartDate)
    .reduce((sum, a) => sum + (a.consultation_fee || 0), 0);
  
  const prescriptions = await Prescription.find({ doctor_id: doctorId }).lean();
  const followupsPending = prescriptions.filter(p => p.follow_up_date).length;
  
  const doctor = await Doctor.findOne({ id: doctorId }).lean() || {};

  res.json({
    total_consultations: allAppointments.length,
    today_count: todayAppointments.length,
    upcoming_count: upcomingAppointments.length,
    monthly_revenue: monthlyRevenue,
    total_revenue: totalRevenue,
    followups_pending: followupsPending,
    avg_rating: doctor.rating || 0,
    review_count: doctor.review_count || 0,
  });
});


/**
 * Get doctor appointments
 */
const getDoctorAppointments = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { date, scope = 'upcoming' } = req.query;
  const today = formatDate(new Date());

  const filter = { doctor_id: doctorId };
  
  if (date) {
    filter.date = date;
  } else if (scope === 'today') {
    filter.date = today;
  } else if (scope === 'upcoming') {
    filter.date = { $gte: today };
  }

  let appointments = await Appointment.find(filter)
    .sort({ date: 1, time: 1 })
    .limit(500)
    .lean();

  // Attach patient details
  const patientIds = [...new Set(appointments.map(a => a.patient_id))];
  const patients = await User.find({ id: { $in: patientIds } })
    .select('id full_name phone email')
    .lean();

  const patientMap = {};
  patients.forEach(p => {
    patientMap[p.id] = p;
  });

  appointments = appointments.map(a => ({
    ...a,
    patient_name: patientMap[a.patient_id]?.full_name || 'Patient',
    patient_phone: patientMap[a.patient_id]?.phone || '',
    patient_email: patientMap[a.patient_id]?.email || '',
  }));

  res.json({
    success: true,
    appointments,
  });
});

/**
 * Get doctor slots
 */
const getDoctorSlots = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { date } = req.query;

  const filter = { doctor_id: doctorId };
  if (date) {
    filter.date = date;
  }

  let slots = await Slot.find(filter).lean();
  slots.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  res.json({
    success: true,
    slots,
  });
});

/**
 * Add doctor slot
 */
const addDoctorSlot = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { date, time } = req.body;

  const existing = await Slot.findOne({ doctor_id: doctorId, date, time });
  if (existing) {
    throw new ApiError(400, 'Slot already exists at this time');
  }

  const slot = await Slot.create({
    id: generateId(),
    doctor_id: doctorId,
    date,
    time,
    is_booked: false,
  });

  // Clear cache
  await redis.del(`slots:${doctorId}`);
  await redis.del(`slots:${doctorId}:${date}`);

  res.status(201).json({
    success: true,
    slot: slot.toObject(),
  });
});

/**
 * Bulk add doctor slots
 */
const bulkAddDoctorSlots = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { date, times } = req.body;

  const created = [];
  for (const time of times) {
    const existing = await Slot.findOne({ doctor_id: doctorId, date, time });
    if (!existing) {
      const slot = await Slot.create({
        id: generateId(),
        doctor_id: doctorId,
        date,
        time,
        is_booked: false,
      });
      created.push(slot.toObject());
    }
  }

  // Clear cache
  await redis.del(`slots:${doctorId}`);
  await redis.del(`slots:${doctorId}:${date}`);

  res.status(201).json({
    success: true,
    slots: created,
  });
});

/**
 * Delete doctor slot
 */
const deleteDoctorSlot = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { slot_id } = req.params;

  const slot = await Slot.findOne({ id: slot_id, doctor_id: doctorId });
  if (!slot) {
    throw new ApiError(404, 'Slot not found');
  }

  if (slot.is_booked) {
    throw new ApiError(400, 'Cannot delete a booked slot');
  }

  await Slot.deleteOne({ id: slot_id });

  // Clear cache
  await redis.del(`slots:${doctorId}`);
  await redis.del(`slots:${doctorId}:${slot.date}`);

  res.json({
    success: true,
  });
});

/**
 * Get doctor prescriptions
 */
const getDoctorPrescriptions = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const prescriptions = await Prescription.find({ doctor_id: doctorId })
    .sort({ created_at: -1 })
    .limit(500)
    .lean();

  res.json({
    success: true,
    prescriptions,
  });
});

/**
 * Call next patient in queue
 */
const callNextPatient = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const today = formatDate(new Date());

  // Auto-complete any currently in_consultation
  await Appointment.updateMany(
    { doctor_id: doctorId, date: today, queue_status: 'in_consultation' },
    { queue_status: 'completed', status: 'completed', completed_at: new Date() }
  );

  // Backfill queue_status for legacy rows
  await Appointment.updateMany(
    { doctor_id: doctorId, date: today, queue_status: { $exists: false } },
    { queue_status: 'waiting' }
  );

  const appointments = await Appointment.find({
    doctor_id: doctorId,
    date: today,
    status: { $ne: 'cancelled' },
  })
    .sort({ token_number: 1 })
    .lean();

  // Find next waiting patient
  const waiting = appointments.filter(a => 
    ['waiting', 'skipped'].includes(a.queue_status || 'waiting')
  );
  waiting.sort((a, b) => a.token_number - b.token_number);

  if (waiting.length === 0) {
    const counts = {
      waiting: 0,
      in_consultation: 0,
      completed: 0,
      no_show: 0,
      skipped: 0,
    };
    appointments.forEach(a => {
      counts[a.queue_status || 'waiting'] = (counts[a.queue_status || 'waiting'] || 0) + 1;
    });

    return res.json({
      success: true,
      ok: false,
      message: 'No patients waiting',
      counts,
    });
  }

  const nextPatient = waiting[0];
  await Appointment.findOneAndUpdate({ id: nextPatient.id }, {
    queue_status: 'in_consultation',
    called_at: new Date(),
  });


  logger.info('Next patient called', { doctorId, appointmentId: nextPatient.id, tokenNumber: nextPatient.token_number });

  res.json({
    success: true,
    ok: true,
    appointment_id: nextPatient.id,
    token_number: nextPatient.token_number,
  });
});

/**
 * Complete current patient
 */
const completeCurrentPatient = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { appointment_id } = req.params;

  const appointment = await Appointment.findOne({ id: appointment_id, doctor_id: doctorId });
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  await Appointment.findOneAndUpdate({ id: appointment_id }, {
    queue_status: 'completed',
    status: 'completed',
    completed_at: new Date(),
  });

  logger.info('Patient completed', { doctorId, appointmentId: appointment_id });

  res.json({
    success: true,
    ok: true,
    appointment_id,
    queue_status: 'completed',
  });
});

/**
 * Mark patient as no-show
 */
const markNoShow = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { appointment_id } = req.params;

  const appointment = await Appointment.findOne({ id: appointment_id, doctor_id: doctorId });
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  await Appointment.findOneAndUpdate({ id: appointment_id }, {
    queue_status: 'no_show',
    status: 'cancelled',
    completed_at: new Date(),
  });


  logger.info('Patient marked as no-show', { doctorId, appointmentId: appointment_id });

  res.json({
    success: true,
    ok: true,
    appointment_id,
    queue_status: 'no_show',
  });
});

/**
 * Skip patient
 */
const skipPatient = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { appointment_id } = req.params;

  const appointment = await Appointment.findOne({ id: appointment_id, doctor_id: doctorId });
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  const today = formatDate(new Date());
  const todayAppointments = await Appointment.find({
    doctor_id: doctorId,
    date: today,
    status: { $ne: 'cancelled' },
  }).lean();

  const maxToken = Math.max(...todayAppointments.map(a => a.token_number), appointment.token_number);

  await Appointment.findOneAndUpdate({ id: appointment_id }, {
    queue_status: 'skipped',
    token_number: maxToken + 1,
    called_at: null,
  });

  logger.info('Patient skipped', { doctorId, appointmentId: appointment_id });

  res.json({
    success: true,
    ok: true,
    appointment_id,
    queue_status: 'skipped',
  });
});

/**
 * Recall patient
 */
const recallPatient = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { appointment_id } = req.params;

  const appointment = await Appointment.findOne({ id: appointment_id, doctor_id: doctorId });
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  await Appointment.findOneAndUpdate({ id: appointment_id }, {
    queue_status: 'waiting',
  });

  logger.info('Patient recalled', { doctorId, appointmentId: appointment_id });

  res.json({
    success: true,
    ok: true,
    appointment_id,
    queue_status: 'waiting',
  });
});

/**
 * Get doctor queue snapshot for a date
 */
const getDoctorQueueSnapshot = asyncHandler(async (req, res) => {
  const { doctor_id, date } = req.params;
  
  const rows = await Appointment.find({
    doctor_id,
    date,
    status: { $ne: 'cancelled' },
  }).sort({ token_number: 1 }).lean();

  const patientIds = Array.from(new Set(rows.map(r => r.patient_id)));
  const patients = await User.find(
    { id: { $in: patientIds } },
    { password_hash: 0, otp: 0 }
  ).lean();
  
  const pMap = {};
  patients.forEach(p => { pMap[p.id] = p; });

  const appointments = rows.map(r => {
    const details = r.patient_details || {};
    const patient_name = details.full_name || (pMap[r.patient_id] && pMap[r.patient_id].full_name) || 'Patient';
    const obj = { ...r, patient_name };
    if (req.user && req.user.role === 'doctor' && req.user.doctor_id === doctor_id) {
      obj.patient_phone = (pMap[r.patient_id] && pMap[r.patient_id].phone) || '';
    }
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  const inCons = appointments.find(a => a.queue_status === 'in_consultation');
  const nextWait = appointments.find(a => (!a.queue_status || a.queue_status === 'waiting'));

  const counts = {
    waiting: appointments.filter(a => (!a.queue_status || a.queue_status === 'waiting')).length,
    in_consultation: appointments.filter(a => a.queue_status === 'in_consultation').length,
    completed: appointments.filter(a => a.queue_status === 'completed').length,
    no_show: appointments.filter(a => a.queue_status === 'no_show').length,
    skipped: appointments.filter(a => a.queue_status === 'skipped').length,
  };

  res.json({
    doctor_id,
    date,
    currently_serving_token: inCons ? inCons.token_number : null,
    currently_serving_appointment_id: inCons ? inCons.id : null,
    next_token: nextWait ? nextWait.token_number : null,
    counts,
    total: appointments.length,
    last_updated: new Date().toISOString(),
    appointments,
  });
});

module.exports = {
  getDoctorStats,
  getDoctorAppointments,
  getDoctorSlots,
  addDoctorSlot,
  bulkAddDoctorSlots,
  deleteDoctorSlot,
  getDoctorPrescriptions,
  callNextPatient,
  completeCurrentPatient,
  markNoShow,
  skipPatient,
  recallPatient,
  getDoctorQueueSnapshot,
};


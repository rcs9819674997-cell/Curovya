const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Slot = require('../models/Slot');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, generateBookingId, formatDate, formatTime, addMinutes } = require('../utils/helpers');
const { pushNotification } = require('../utils/notificationHelper');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const AVG_MINUTES_PER_PATIENT = 8;

/**
 * Book appointment
 */
const bookAppointment = asyncHandler(async (req, res) => {
  const { doctor_id, slot_id, consultation_type = 'clinic', payment_method = 'esewa', patient_details } = req.body;

  // Get doctor
  const doctor = await Doctor.findOne({ id: doctor_id }).lean();
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  // Get slot
  const slot = await Slot.findOne({ id: slot_id, doctor_id });
  if (!slot) {
    throw new ApiError(404, 'Slot not found');
  }

  if (slot.is_booked) {
    throw new ApiError(400, 'Slot already booked');
  }

  // Calculate token number
  const sameDayCount = await Appointment.countDocuments({ doctor_id, date: slot.date });
  const token_number = sameDayCount + 5;
  const current_serving = Math.max(1, token_number - Math.floor(Math.random() * 3) - 2);

  // Create appointment
  const appointment = await Appointment.create({
    id: generateId(),
    booking_id: generateBookingId(),
    token_number,
    patient_id: req.user.sub,
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    doctor_specialty: doctor.specialty,
    doctor_photo_url: doctor.photo_url,
    clinic_name: doctor.clinic_name,
    clinic_address: doctor.clinic_address,
    date: slot.date,
    time: slot.time,
    consultation_type,
    consultation_fee: doctor.consultation_fee,
    payment_method,
    payment_status: payment_method === 'esewa' ? 'pending' : 'paid',
    status: 'confirmed',
    queue_status: 'waiting',
    current_serving,
    patient_details: patient_details || {
      full_name: req.user.full_name,
      relation: 'Self',
    },
    mode: consultation_type,
  });

  // Update slot
  await Slot.findOneAndUpdate({ id: slot.id }, { is_booked: true });


  // Send notification
  await pushNotification(req.user.sub, 'appointment', 'Appointment confirmed', 
    `Your appointment with ${doctor.name} on ${slot.date} at ${slot.time} is confirmed (Token #${token_number}).`,
    `/ticket/${appointment.id}`
  );

  // Clear cache
  await redis.del(`slots:${doctor_id}`);
  await redis.del(`slots:${doctor_id}:${slot.date}`);

  logger.info('Appointment booked', { appointmentId: appointment.id, patientId: req.user.sub, doctorId: doctor_id });

  res.status(201).json({
    success: true,
    appointment: appointment.toObject(),
  });
});

/**
 * List my appointments
 */
const listMyAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ patient_id: req.user.sub })
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  res.json({
    success: true,
    appointments,
  });
});

/**
 * Get single appointment
 */
const getAppointment = asyncHandler(async (req, res) => {
  const { appt_id } = req.params;
  const userId = req.user.id || req.user.sub;

  const appointment = await Appointment.findOne({ 
    id: appt_id, 
    patient_id: userId 
  }).lean();

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Simulate live queue progression
  const created = new Date(appointment.created_at);
  const minutes = Math.floor((new Date() - created) / 60000);
  appointment.current_serving = Math.min(
    appointment.token_number,
    (appointment.current_serving || 1) + Math.floor(minutes / 3)
  );

  const apptObj = { ...appointment };
  delete apptObj._id;
  delete apptObj.__v;

  res.json(apptObj);
});

/**
 * Get queue view for appointment
 */
const getQueueView = asyncHandler(async (req, res) => {
  const { appt_id } = req.params;
  const userId = req.user.id || req.user.sub;

  const appointment = await Appointment.findOne({ 
    id: appt_id, 
    patient_id: userId 
  }).lean();

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Get all appointments for this doctor on this date
  const allAppointments = await Appointment.find({
    doctor_id: appointment.doctor_id,
    date: appointment.date,
    status: { $ne: 'cancelled' },
  })
    .select('id patient_id patient_details consultation_fee payment_method queue_status token_number')
    .sort({ token_number: 1 })
    .lean();

  // Find currently in consultation
  const inConsultation = allAppointments.find(a => a.queue_status === 'in_consultation');
  
  // Calculate position
  const ahead = allAppointments.filter(a => 
    a.token_number < appointment.token_number && 
    ['waiting', 'in_consultation', 'skipped'].includes(a.queue_status)
  );

  let position;
  if (appointment.queue_status === 'in_consultation') {
    position = 0;
  } else if (['completed', 'no_show'].includes(appointment.queue_status)) {
    position = -1;
  } else {
    position = ahead.length;
  }

  const AVG_MIN_PER_PATIENT = 8;
  const estimatedWait = Math.max(0, position) * AVG_MIN_PER_PATIENT;

  // Calculate queue stats
  const counts = {
    waiting: 0,
    in_consultation: 0,
    completed: 0,
    no_show: 0,
    skipped: 0,
  };

  allAppointments.forEach(a => {
    counts[a.queue_status || 'waiting'] = (counts[a.queue_status || 'waiting'] || 0) + 1;
  });

  res.json({
    appointment_id: appointment.id,
    my_token: appointment.token_number,
    my_status: appointment.queue_status || 'waiting',
    currently_serving_token: inConsultation?.token_number || null,
    position_ahead: position,
    estimated_wait_minutes: estimatedWait,
    counts,
    last_updated: new Date(),
  });
});


/**
 * Cancel appointment
 */
const cancelAppointment = asyncHandler(async (req, res) => {
  const { appt_id } = req.params;

  const appointment = await Appointment.findOne({ 
    id: appt_id, 
    patient_id: req.user.sub 
  });

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.status === 'completed') {
    throw new ApiError(400, 'Cannot cancel completed appointment');
  }

  await Appointment.findOneAndUpdate({ id: appt_id }, {
    status: 'cancelled',
    queue_status: 'cancelled',
  });

  // If slot exists, mark as available
  if (appointment.date && appointment.time) {
    const slot = await Slot.findOne({
      doctor_id: appointment.doctor_id,
      date: appointment.date,
      time: appointment.time,
    });
    if (slot) {
      await Slot.findOneAndUpdate({ id: slot.id }, { is_booked: false });
    }
  }


  // Clear cache
  await redis.del(`slots:${appointment.doctor_id}`);
  await redis.del(`slots:${appointment.doctor_id}:${appointment.date}`);

  logger.info('Appointment cancelled', { appointmentId: appt_id, patientId: req.user.sub });

  res.json({
    success: true,
    message: 'Appointment cancelled successfully',
  });
});

// pushNotification imported from ../utils/notificationHelper

module.exports = {
  bookAppointment,
  listMyAppointments,
  getAppointment,
  getQueueView,
  cancelAppointment,
};

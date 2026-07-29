const Appointment = require('../models/Appointment');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const config = require('../config');
const { stableUid } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Generate video token for Agora
 */
const generateVideoToken = asyncHandler(async (req, res) => {
  const { appointment_id } = req.body;

  const appointment = await Appointment.findOne({ id: appointment_id }).lean();
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.mode !== 'video') {
    throw new ApiError(400, 'This appointment is not a video consultation');
  }

  // Check if user is a participant
  const isDoctor = req.user.role === 'doctor' && req.user.doctor_id === appointment.doctor_id;
  const isPatient = req.user.role === 'patient' && appointment.patient_id === req.user.sub;

  if (!isDoctor && !isPatient) {
    throw new ApiError(403, 'Not a participant of this appointment');
  }

  const role = 'publisher'; // Both sides can publish
  const channel = `appt_${appointment_id.substring(0, 32)}`;
  const uid = stableUid(req.user.sub);
  const expiresAt = Math.floor(Date.now() / 1000) + config.agoraTokenTtlSeconds;

  // Check if Agora credentials are configured
  if (!config.agoraAppId || !config.agoraAppCertificate) {
    logger.warn('Agora credentials not configured, returning mock token');
    return res.json({
      success: true,
      token_response: {
        app_id: '',
        channel,
        uid,
        role,
        token: '',
        expires_at: expiresAt,
        mock: true,
        appointment_id,
      },
    });
  }

  try {
    const RtcTokenBuilder = require('agora-access-token').RtcTokenBuilder;
    const agoraRole = 1; // publisher

    const token = RtcTokenBuilder.buildTokenWithUid(
      config.agoraAppId,
      config.agoraAppCertificate,
      channel,
      uid,
      agoraRole,
      expiresAt
    );

    logger.info('Video token generated', { appointmentId, userId: req.user.sub });

    res.json({
      success: true,
      token_response: {
        app_id: config.agoraAppId,
        channel,
        uid,
        role,
        token,
        expires_at: expiresAt,
        mock: false,
        appointment_id,
      },
    });
  } catch (error) {
    logger.error('Token generation failed:', error);
    throw new ApiError(500, `Token generation failed: ${error.message}`);
  }
});

/**
 * Start video consultation (doctor only)
 */
const startVideoConsultation = asyncHandler(async (req, res) => {
  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const { appointment_id } = req.body;

  const appointment = await Appointment.findOne({ 
    id: appointment_id, 
    doctor_id: doctorId 
  }).lean();

  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (appointment.mode !== 'video') {
    throw new ApiError(400, 'Not a video consultation');
  }

  await Appointment.findByIdAndUpdate(appointment_id, {
    video_status: 'doctor_ready',
    video_started_at: new Date(),
  });

  // Notify patient
  await pushNotification(
    appointment.patient_id,
    'appointment',
    'Doctor is ready — join now',
    'Your doctor is waiting in the video consultation room.',
    `/video-call/${appointment_id}`
  );

  logger.info('Video consultation started', { appointmentId, doctorId });

  res.json({
    success: true,
    ok: true,
    video_status: 'doctor_ready',
  });
});

/**
 * End video consultation
 */
const endVideoConsultation = asyncHandler(async (req, res) => {
  const { appointment_id } = req.body;

  const appointment = await Appointment.findOne({ id: appointment_id }).lean();
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check if user is a participant
  const isDoctor = req.user.role === 'doctor' && req.user.doctor_id === appointment.doctor_id;
  const isPatient = req.user.role === 'patient' && appointment.patient_id === req.user.sub;

  if (!isPatient && !isDoctor) {
    throw new ApiError(403, 'Not a participant');
  }

  await Appointment.findByIdAndUpdate(appointment_id, {
    video_status: 'ended',
    video_ended_at: new Date(),
  });

  logger.info('Video consultation ended', { appointmentId, userId: req.user.sub });

  res.json({
    success: true,
    ok: true,
    video_status: 'ended',
  });
});

/**
 * Get video appointment status
 */
const getVideoAppointmentStatus = asyncHandler(async (req, res) => {
  const { appointment_id } = req.params;

  const appointment = await Appointment.findOne({ id: appointment_id }).lean();
  if (!appointment) {
    throw new ApiError(404, 'Appointment not found');
  }

  // Check if user is a participant
  const isDoctor = req.user.role === 'doctor' && req.user.doctor_id === appointment.doctor_id;
  const isPatient = req.user.role === 'patient' && appointment.patient_id === req.user.sub;

  if (!isPatient && !isDoctor) {
    throw new ApiError(403, 'Not a participant');
  }

  res.json({
    success: true,
    status: {
      appointment_id,
      mode: appointment.mode,
      video_status: appointment.video_status || 'not_started',
      doctor_ready: appointment.video_status === 'doctor_ready',
      ended: appointment.video_status === 'ended',
    },
  });
});

/**
 * Helper function to push notification
 */
async function pushNotification(userId, type, title, body, action = null) {
  try {
    const Notification = require('../models/Notification');
    const { generateId } = require('../utils/helpers');
    const redis = require('../config/redis');

    await Notification.create({
      id: generateId(),
      user_id: userId,
      type,
      title,
      body,
      read: false,
      action,
    });
    
    await redis.publish(`notification:${userId}`, {
      type,
      title,
      body,
      action,
    });
  } catch (error) {
    logger.error('Failed to push notification:', error);
  }
}

module.exports = {
  generateVideoToken,
  startVideoConsultation,
  endVideoConsultation,
  getVideoAppointmentStatus,
};

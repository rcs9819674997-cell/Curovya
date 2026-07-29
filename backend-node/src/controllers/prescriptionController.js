const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, formatDate } = require('../utils/helpers');

const getUserId = (req) => req.user.id || req.user.sub;

/**
 * List my prescriptions
 */
const listPrescriptions = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  let prescriptions = await Prescription.find({ patient_id: userId })
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  prescriptions = prescriptions.map(p => {
    const obj = { ...p };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(prescriptions);
});

/**
 * Get single prescription
 */
const getPrescription = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rx_id } = req.params;

  const prescription = await Prescription.findOne({ 
    id: rx_id, 
    patient_id: userId 
  }).lean();

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  const rxObj = { ...prescription };
  delete rxObj._id;
  delete rxObj.__v;

  res.json(rxObj);
});

/**
 * Create prescription (doctor only)
 */
const createPrescription = asyncHandler(async (req, res) => {
  const { patient_id, appointment_id, diagnosis, symptoms, medicines, follow_up_days, notes } = req.body;

  const doctorId = req.user.doctor_id;
  if (!doctorId) {
    throw new ApiError(403, 'Doctor access required');
  }

  const doctor = await Doctor.findOne({ id: doctorId }).lean();
  if (!doctor) {
    throw new ApiError(404, 'Doctor profile missing');
  }

  const patient = await User.findOne({ id: patient_id }).lean();
  if (!patient) {
    throw new ApiError(404, 'Patient not found');
  }

  let follow_up_date = null;
  if (follow_up_days && follow_up_days > 0) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + follow_up_days);
    follow_up_date = formatDate(followUpDate);
  }

  const rxId = generateId('rx');
  const now = new Date().toISOString();

  const prescription = await Prescription.create({
    id: rxId,
    patient_id,
    doctor_id: doctorId,
    doctor_name: doctor.name,
    doctor_specialty: doctor.specialty,
    diagnosis,
    symptoms: symptoms || [],
    medicines,
    follow_up_date,
    notes: notes || '',
    created_at: now,
  });

  await HealthRecord.create({
    id: generateId('hr'),
    patient_id,
    type: 'prescription',
    title: `${diagnosis} - Rx`,
    description: `Prescription from ${doctor.name}`,
    doctor_name: doctor.name,
    date: formatDate(new Date()),
    created_at: now,
  });

  try {
    await Notification.create({
      id: generateId('notif'),
      user_id: patient_id,
      title: 'New prescription available',
      message: `${doctor.name} has issued a prescription for ${diagnosis}.`,
      type: 'prescription',
      is_read: false,
      created_at: now,
    });
  } catch (err) {}

  if (appointment_id) {
    await Appointment.findOneAndUpdate({ id: appointment_id }, {
      status: 'completed',
      queue_status: 'completed',
      completed_at: now,
    });
  }

  const rxObj = prescription.toObject();
  delete rxObj._id;
  delete rxObj.__v;

  res.status(201).json(rxObj);
});

module.exports = {
  listPrescriptions,
  getPrescription,
  createPrescription,
};

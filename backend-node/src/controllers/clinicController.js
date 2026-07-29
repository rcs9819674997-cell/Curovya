const Clinic = require('../models/Clinic');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, formatDate, hashPassword } = require('../utils/helpers');

// Helper to get clinic_id from user
const getClinicIdFromUser = (user) => {
  return user.clinic_id;
};

/**
 * Get current user's clinic
 */
const getMine = asyncHandler(async (req, res) => {
  const clinicId = getClinicIdFromUser(req.user);
  if (!clinicId) {
    throw new ApiError(403, 'Clinic staff/admin access required');
  }
  const clinic = await Clinic.findOne({ id: clinicId }).lean();
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }
  res.json(clinic);
});

/**
 * Get clinic dashboard stats
 */
const getDashboard = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const clinicId = getClinicIdFromUser(req.user);
  if (clinicId !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const clinic = await Clinic.findOne({ id: clinic_id }).lean();
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const today = formatDate(new Date());

  const docs = await Doctor.find({ id: { $in: clinic.doctor_ids || [] } }).lean();
  const docIds = docs.map(d => d.id);

  const todayAppts = await Appointment.find({
    doctor_id: { $in: docIds },
    date: today,
  }).sort({ time: 1 }).lean();

  const allAppts = await Appointment.find({
    doctor_id: { $in: docIds },
  }).lean();

  const total = todayAppts.length;
  const completed = todayAppts.filter(a => a.status === 'completed' || a.queue_status === 'completed').length;
  const in_consultation = todayAppts.filter(a => a.queue_status === 'in_consultation').length;
  const waiting = todayAppts.filter(a => (!a.queue_status || a.queue_status === 'waiting') && a.status === 'confirmed').length;
  const cancelled = todayAppts.filter(a => a.status === 'cancelled').length;

  const todays_revenue = todayAppts
    .filter(a => a.payment_status === 'paid')
    .reduce((sum, a) => sum + (a.consultation_fee || 0), 0);

  const monthKey = new Date().toISOString().substring(0, 7);
  const monthly_revenue = allAppts
    .filter(a => a.payment_status === 'paid' && String(a.date).startsWith(monthKey))
    .reduce((sum, a) => sum + (a.consultation_fee || 0), 0);

  const patientIds = new Set(allAppts.map(a => a.patient_id));

  const doctor_stats = docs.map(d => {
    const dToday = todayAppts.filter(a => a.doctor_id === d.id);
    return {
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      photo_url: d.photo_url,
      today_count: dToday.length,
      today_completed: dToday.filter(a => a.queue_status === 'completed').length,
      today_revenue: dToday.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + (a.consultation_fee || 0), 0),
    };
  });

  const upcomingDates = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    upcomingDates.push(formatDate(d));
  }

  const upcoming_next_7_days = allAppts.filter(a => upcomingDates.includes(a.date) && a.status === 'confirmed').length;

  res.json({
    clinic,
    date: today,
    today: {
      total,
      completed,
      in_consultation,
      waiting,
      cancelled,
      revenue: todays_revenue,
    },
    monthly_revenue,
    total_patients: patientIds.size,
    upcoming_next_7_days,
    doctor_count: docs.length,
    doctors: doctor_stats,
  });
});

/**
 * Get clinic appointments list
 */
const getAppointments = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const clinicId = getClinicIdFromUser(req.user);
  if (clinicId !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const clinic = await Clinic.findOne({ id: clinic_id }).lean();
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const { date, doctor_id, status, q } = req.query;

  const filt = { doctor_id: { $in: clinic.doctor_ids || [] } };
  if (date) filt.date = date;
  if (doctor_id) filt.doctor_id = doctor_id;
  if (status && status !== 'all') filt.status = status;

  let appts = await Appointment.find(filt).sort({ date: -1, time: 1 }).lean();

  const pids = Array.from(new Set(appts.map(a => a.patient_id)));
  const patients = await User.find({ id: { $in: pids } }).lean();
  const pMap = {};
  patients.forEach(p => { pMap[p.id] = p; });

  appts = appts.map(a => {
    const p = pMap[a.patient_id] || {};
    const pd = a.patient_details || {};
    const patient_name = pd.full_name || p.full_name || 'Patient';
    const patient_phone = pd.phone || p.phone || '';
    return {
      ...a,
      patient_name,
      patient_phone,
    };
  });

  if (q) {
    const ql = q.toLowerCase();
    appts = appts.filter(a =>
      (a.patient_name && a.patient_name.toLowerCase().includes(ql)) ||
      (a.patient_phone && a.patient_phone.includes(ql)) ||
      (a.booking_id && a.booking_id.toLowerCase().includes(ql))
    );
  }

  res.json(appts);
});

/**
 * Get doctors in clinic
 */
const getDoctors = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const clinicId = getClinicIdFromUser(req.user);
  if (clinicId !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const clinic = await Clinic.findOne({ id: clinic_id }).lean();
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  const docs = await Doctor.find({ id: { $in: clinic.doctor_ids || [] } }).lean();
  const today = formatDate(new Date());

  const docsWithStats = await Promise.all(docs.map(async d => {
    const today_count = await Appointment.countDocuments({ doctor_id: d.id, date: today });
    return {
      ...d,
      today_count,
    };
  }));

  res.json(docsWithStats);
});

/**
 * Get clinic staff list
 */
const getStaff = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  if (req.user.role !== 'clinic_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Clinic admin access required');
  }
  if (req.user.clinic_id !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const staff = await User.find(
    { clinic_id, role: 'receptionist' },
    { password_hash: 0, otp: 0 }
  ).lean();

  res.json(staff);
});

/**
 * Add staff member to clinic
 */
const addStaff = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  if (req.user.role !== 'clinic_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Clinic admin access required');
  }
  if (req.user.clinic_id !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const { full_name, email, phone, password } = req.body;
  if (!full_name || !email || !password) {
    throw new ApiError(400, 'Full name, email, and password are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(400, 'Email already in use');
  }

  const uid = generateId('usr');
  const password_hash = await hashPassword(password);

  const newUser = await User.create({
    id: uid,
    full_name,
    email: email.toLowerCase(),
    phone: phone || '',
    password_hash,
    role: 'receptionist',
    is_verified: true,
    clinic_id,
    language: 'en',
    created_at: new Date().toISOString(),
  });

  const userObj = newUser.toObject();
  delete userObj.password_hash;
  delete userObj._id;

  res.json(userObj);
});

/**
 * Delete staff member from clinic
 */
const removeStaff = asyncHandler(async (req, res) => {
  const { clinic_id, staff_id } = req.params;
  if (req.user.role !== 'clinic_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Clinic admin access required');
  }
  if (req.user.clinic_id !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const user = await User.findOne({ id: staff_id, clinic_id, role: 'receptionist' });
  if (!user) {
    throw new ApiError(404, 'Staff not found');
  }

  await User.deleteOne({ id: staff_id });
  res.json({ ok: true });
});

/**
 * Book walk-in appointment
 */
const bookWalkIn = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const clinicId = getClinicIdFromUser(req.user);
  if (clinicId !== clinic_id && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Not your clinic');
  }

  const { doctor_id, patient_name, patient_phone, patient_age, patient_gender, symptoms, date: reqDate, time: reqTime } = req.body;

  const clinic = await Clinic.findOne({ id: clinic_id }).lean();
  if (!clinic || !(clinic.doctor_ids || []).includes(doctor_id)) {
    throw new ApiError(400, 'Doctor not part of this clinic');
  }

  const doc = await Doctor.findOne({ id: doctor_id }).lean();
  if (!doc) {
    throw new ApiError(404, 'Doctor not found');
  }

  const date = reqDate || formatDate(new Date());
  const nowTime = new Date().toTimeString().substring(0, 5);
  const time = reqTime || nowTime;

  let patient = await User.findOne({ phone: patient_phone, role: 'patient' });
  let patient_id;

  if (!patient) {
    patient_id = generateId('usr');
    const randomPass = await hashPassword(generateId('pass'));
    await User.create({
      id: patient_id,
      full_name: patient_name,
      email: `walkin-${patient_id.substring(0, 8)}@hamrodoctor.np`,
      phone: patient_phone,
      password_hash: randomPass,
      role: 'patient',
      is_verified: false,
      is_walk_in: true,
      language: 'en',
      created_at: new Date().toISOString(),
    });
  } else {
    patient_id = patient.id;
  }

  const count = await Appointment.countDocuments({ doctor_id: doc.id, date });
  const token = count + 1;
  const randomNum = Math.floor(100000 + Math.random() * 900000);

  const appt = await Appointment.create({
    id: generateId('apt'),
    booking_id: `HD-W${randomNum}`,
    token_number: token,
    patient_id,
    doctor_id: doc.id,
    doctor_name: doc.name,
    doctor_specialty: doc.specialty,
    doctor_photo_url: doc.photo_url,
    clinic_name: doc.clinic_name,
    clinic_address: doc.clinic_address,
    date,
    time,
    consultation_type: 'clinic',
    consultation_fee: doc.consultation_fee,
    payment_method: 'cash',
    payment_status: 'paid',
    status: 'confirmed',
    queue_status: 'waiting',
    is_walk_in: true,
    current_serving: Math.max(1, token - 1),
    patient_details: {
      full_name: patient_name,
      phone: patient_phone,
      age: patient_age,
      gender: patient_gender,
      symptoms,
    },
    created_by_staff: req.user.id,
    created_at: new Date().toISOString(),
  });

  const apptObj = appt.toObject();
  delete apptObj._id;
  delete apptObj.__v;

  res.json(apptObj);
});

/**
 * Update appointment status from clinic/receptionist
 */
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { appt_id } = req.params;
  const { action } = req.body;
  const clinicId = getClinicIdFromUser(req.user);

  const appt = await Appointment.findOne({ id: appt_id });
  if (!appt) {
    throw new ApiError(404, 'Appointment not found');
  }

  if (clinicId) {
    const clinic = await Clinic.findOne({ id: clinicId }).lean();
    if (!clinic || !(clinic.doctor_ids || []).includes(appt.doctor_id)) {
      throw new ApiError(403, "Not your clinic's appointment");
    }
  }

  const updates = {};
  const now = new Date().toISOString();

  if (action === 'check_in') {
    updates.checked_in_at = now;
    updates.queue_status = 'waiting';
  } else if (action === 'call_next') {
    updates.queue_status = 'in_consultation';
    updates.called_at = now;
  } else if (action === 'complete') {
    updates.queue_status = 'completed';
    updates.status = 'completed';
    updates.completed_at = now;
  } else if (action === 'no_show') {
    updates.queue_status = 'no_show';
    updates.status = 'cancelled';
    updates.completed_at = now;
  } else {
    throw new ApiError(400, 'Invalid action');
  }

  Object.assign(appt, updates);
  await appt.save();

  const apptObj = appt.toObject();
  delete apptObj._id;
  delete apptObj.__v;

  res.json(apptObj);
});

module.exports = {
  getMine,
  getDashboard,
  getAppointments,
  getDoctors,
  getStaff,
  addStaff,
  removeStaff,
  bookWalkIn,
  updateAppointmentStatus,
};

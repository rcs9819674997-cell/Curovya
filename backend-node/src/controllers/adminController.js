const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const LabBooking = require('../models/LabBooking');
const SupportTicket = require('../models/SupportTicket');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId } = require('../utils/helpers');

// Helper to log audit actions
const logAudit = async (actor, action, target = '', meta = {}) => {
  try {
    await AuditLog.create({
      id: generateId('audit'),
      actor_id: actor.id,
      actor_email: actor.email,
      actor_role: actor.role,
      action,
      target,
      meta,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Audit log error shouldn't crash request
  }
};

/**
 * Get superadmin overview stats
 */
const getOverview = asyncHandler(async (req, res) => {
  const users_total = await User.countDocuments({});
  const doctors_total = await User.countDocuments({ role: 'doctor' });
  const clinics_total = await Clinic.countDocuments({});
  const appts_total = await Appointment.countDocuments({});
  const labs_total = await LabBooking.countDocuments({});
  const pending_docs = await User.countDocuments({ role: 'doctor', is_approved: { $ne: true } });
  const pending_clinics = await Clinic.countDocuments({ is_approved: { $ne: true } });
  const subs_active = await User.countDocuments({ 'subscription.active': true });

  const paidAppts = await Appointment.find({ payment_status: 'paid' }, { consultation_fee: 1 }).lean();
  const appt_revenue = paidAppts.reduce((sum, a) => sum + (a.consultation_fee || 0), 0);

  const labBookings = await LabBooking.find({}, { price: 1 }).lean();
  const lab_rev = labBookings.reduce((sum, b) => sum + (b.price || 0), 0);

  const sub_rev = subs_active * 199;

  res.json({
    users_total,
    doctors_total,
    clinics_total,
    appts_total,
    labs_total,
    pending_approvals: { doctors: pending_docs, clinics: pending_clinics },
    active_subscribers: subs_active,
    revenue: {
      appointments: Number(appt_revenue.toFixed(2)),
      labs: Number(lab_rev.toFixed(2)),
      subscriptions: Number(sub_rev.toFixed(2)),
      total: Number((appt_revenue + lab_rev + sub_rev).toFixed(2)),
    },
  });
});

/**
 * Get all users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const query = {};
  if (role) query.role = role;
  if (q) {
    query.$or = [
      { full_name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const items = await User.find(query, { password_hash: 0, otp: 0, reset_otp: 0 })
    .sort({ created_at: -1 })
    .limit(500)
    .lean();

  res.json(items);
});

/**
 * Approve user (doctor or staff)
 */
const approveUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const user = await User.findOne({ id: user_id });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.is_approved = true;
  user.is_verified = true;
  await user.save();

  if (user.doctor_id) {
    await Doctor.findOneAndUpdate({ id: user.doctor_id }, { is_approved: true });
  }
  if (user.clinic_id) {
    await Clinic.findOneAndUpdate({ id: user.clinic_id }, { is_approved: true });
  }

  await logAudit(req.user, 'approve_user', user_id);
  res.json({ ok: true, user: { id: user.id, is_approved: true } });
});

/**
 * Suspend user
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const user = await User.findOne({ id: user_id });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.is_suspended = true;
  await user.save();

  await logAudit(req.user, 'suspend_user', user_id);
  res.json({ ok: true });
});

/**
 * Unsuspend user
 */
const unsuspendUser = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  const user = await User.findOne({ id: user_id });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  user.is_suspended = false;
  await user.save();

  await logAudit(req.user, 'unsuspend_user', user_id);
  res.json({ ok: true });
});

/**
 * Get all clinics
 */
const getClinics = asyncHandler(async (req, res) => {
  const items = await Clinic.find({}).limit(500).lean();
  res.json(items);
});

/**
 * Approve clinic
 */
const approveClinic = asyncHandler(async (req, res) => {
  const { clinic_id } = req.params;
  const clinic = await Clinic.findOne({ id: clinic_id });
  if (!clinic) {
    throw new ApiError(404, 'Clinic not found');
  }

  clinic.is_approved = true;
  await clinic.save();

  await logAudit(req.user, 'approve_clinic', clinic_id);
  res.json({ ok: true });
});

/**
 * Get all support tickets for admin
 */
const getTickets = asyncHandler(async (req, res) => {
  const items = await SupportTicket.find({}).sort({ created_at: -1 }).limit(500).lean();
  res.json(items);
});

/**
 * Reply to support ticket
 */
const replyTicket = asyncHandler(async (req, res) => {
  const { ticket_id } = req.params;
  const { reply, status } = req.body;

  const ticket = await SupportTicket.findOne({ id: ticket_id });
  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  ticket.reply = reply;
  if (status) ticket.status = status;
  await ticket.save();

  try {
    await Notification.create({
      id: generateId('notif'),
      user_id: ticket.user_id,
      title: 'Support reply received',
      body: reply,
      type: 'system',
      is_read: false,
      created_at: new Date().toISOString(),
    });
  } catch (err) {}

  const ticketObj = ticket.toObject();
  delete ticketObj._id;
  delete ticketObj.__v;

  res.json(ticketObj);
});

/**
 * Get system audit logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 100;
  const items = await AuditLog.find({}).sort({ created_at: -1 }).limit(limit).lean();
  res.json(items);
});

module.exports = {
  getOverview,
  getUsers,
  approveUser,
  suspendUser,
  unsuspendUser,
  getClinics,
  approveClinic,
  getTickets,
  replyTicket,
  getAuditLogs,
};

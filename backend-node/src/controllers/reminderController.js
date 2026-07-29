const Reminder = require('../models/Reminder');
const DoseLog = require('../models/DoseLog');
const FamilyMember = require('../models/FamilyMember');
const Prescription = require('../models/Prescription');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId, formatDate, addDays } = require('../utils/helpers');

const getUserId = (req) => req.user.id || req.user.sub;

/**
 * List reminders
 */
const listReminders = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { active, family_member_id } = req.query;

  const filter = { user_id: userId };
  if (active !== undefined) {
    filter.active = active === 'true' || active === true;
  }
  if (family_member_id) {
    filter.family_member_id = family_member_id;
  }

  let reminders = await Reminder.find(filter)
    .sort({ created_at: -1 })
    .limit(300)
    .lean();

  const memberIds = Array.from(new Set(reminders.filter(r => r.family_member_id).map(r => r.family_member_id)));
  if (memberIds.length > 0) {
    const members = await FamilyMember.find({ id: { $in: memberIds } }).lean();
    const memberMap = {};
    members.forEach(m => {
      memberMap[m.id] = m.full_name;
    });
    reminders = reminders.map(r => ({
      ...r,
      family_member_name: r.family_member_id ? memberMap[r.family_member_id] : null,
    }));
  }

  reminders = reminders.map(r => {
    const obj = { ...r };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(reminders);
});

/**
 * Create reminder
 */
const createReminder = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { medicine_name, dosage, times, duration_days, instructions, family_member_id, prescription_id } = req.body;

  if (!times || times.length === 0) {
    throw new ApiError(400, 'At least one reminder time is required');
  }

  if (duration_days <= 0) {
    throw new ApiError(400, 'duration_days must be > 0');
  }

  const start = new Date();
  const end = addDays(start, duration_days - 1);

  let family_member_name = null;
  if (family_member_id) {
    const member = await FamilyMember.findOne({ id: family_member_id, owner_id: userId });
    if (member) {
      family_member_name = member.full_name;
    }
  }

  const reminder = await Reminder.create({
    id: generateId('rem'),
    user_id: userId,
    family_member_id,
    family_member_name,
    prescription_id,
    medicine_name,
    dosage,
    times,
    duration_days,
    start_date: formatDate(start),
    end_date: formatDate(end),
    instructions: instructions || '',
    active: true,
    created_at: new Date().toISOString(),
  });

  const reminderObj = reminder.toObject();
  delete reminderObj._id;
  delete reminderObj.__v;

  res.json(reminderObj);
});


/**
 * Create reminders from prescription
 */
const createRemindersFromPrescription = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rx_id } = req.params;

  const prescription = await Prescription.findOne({ 
    id: rx_id, 
    patient_id: userId 
  }).lean();

  if (!prescription) {
    throw new ApiError(404, 'Prescription not found');
  }

  const DEFAULT_TIMES = ['08:00', '14:00', '20:00'];
  const created = [];
  const start = new Date();

  for (const medicine of (prescription.medicines || [])) {
    const dosage = String(medicine.dosage || '').trim();
    const duration = String(medicine.duration || '').trim();

    let times = [];
    const parts = dosage.replace(',', '-').split('-').map(p => p.trim());
    for (let i = 0; i < Math.min(parts.length, 3); i++) {
      try {
        if (parseInt(parts[i].split(' ')[0]) > 0) {
          times.push(DEFAULT_TIMES[i]);
        }
      } catch (e) {}
    }
    if (times.length === 0) {
      times = [DEFAULT_TIMES[0]];
    }

    let days = 7;
    for (const token of duration.split(/\s+/)) {
      try {
        const n = parseInt(token);
        if (n > 0) {
          days = n;
          break;
        }
      } catch (e) {}
    }
    if (duration.toLowerCase().includes('week')) {
      days *= 7;
    }
    if (duration.toLowerCase().includes('month')) {
      days = Math.max(days, 30);
    }

    const end = addDays(start, days - 1);

    const reminder = await Reminder.create({
      id: generateId('rem'),
      user_id: userId,
      family_member_id: null,
      family_member_name: null,
      prescription_id: rx_id,
      medicine_name: medicine.name || 'Medicine',
      dosage,
      times,
      duration_days: days,
      start_date: formatDate(start),
      end_date: formatDate(end),
      instructions: medicine.instructions || '',
      active: true,
      created_at: new Date().toISOString(),
    });

    const remObj = reminder.toObject();
    delete remObj._id;
    delete remObj.__v;
    created.push(remObj);
  }

  res.json({
    ok: true,
    count: created.length,
    reminders: created,
  });
});


/**
 * Update reminder
 */
const updateReminder = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rem_id } = req.params;
  const { times, duration_days, active, instructions } = req.body;

  const reminder = await Reminder.findOne({ id: rem_id, user_id: userId });
  if (!reminder) {
    throw new ApiError(404, 'Reminder not found');
  }

  const updateData = {};
  if (times !== undefined) updateData.times = times;
  if (duration_days !== undefined) {
    const start = new Date(reminder.start_date);
    const end = addDays(start, duration_days - 1);
    updateData.duration_days = duration_days;
    updateData.end_date = formatDate(end);
  }
  if (active !== undefined) updateData.active = active;
  if (instructions !== undefined) updateData.instructions = instructions;

  const updated = await Reminder.findOneAndUpdate({ id: rem_id, user_id: userId }, updateData, { new: true }).lean();

  const updatedObj = { ...updated };
  delete updatedObj._id;
  delete updatedObj.__v;

  res.json(updatedObj);
});

/**
 * Delete reminder
 */
const deleteReminder = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rem_id } = req.params;

  const reminder = await Reminder.findOne({ id: rem_id, user_id: userId });
  if (!reminder) {
    throw new ApiError(404, 'Reminder not found');
  }

  await Reminder.deleteOne({ id: rem_id });
  await DoseLog.deleteMany({ reminder_id: rem_id });

  res.json({ ok: true });
});

/**
 * Log dose
 */
const logDose = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rem_id } = req.params;
  const { time, date, status = 'taken' } = req.body;

  const reminder = await Reminder.findOne({ id: rem_id, user_id: userId });
  if (!reminder) {
    throw new ApiError(404, 'Reminder not found');
  }

  const doseDate = date || formatDate(new Date());

  const existing = await DoseLog.findOne({ reminder_id: rem_id, date: doseDate, time });
  if (existing) {
    const updated = await DoseLog.findOneAndUpdate(
      { id: existing.id },
      { status, logged_at: new Date().toISOString() },
      { new: true }
    ).lean();
    delete updated._id;
    delete updated.__v;
    return res.json(updated);
  }

  const log = await DoseLog.create({
    id: generateId('log'),
    reminder_id: rem_id,
    date: doseDate,
    time,
    status,
    logged_at: new Date().toISOString(),
  });

  const logObj = log.toObject();
  delete logObj._id;
  delete logObj.__v;

  res.json(logObj);
});


/**
 * Get today's doses
 */
const getTodaysDoses = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const today = formatDate(new Date());

  const reminders = await Reminder.find({
    user_id: userId,
    active: true,
    start_date: { $lte: today },
    end_date: { $gte: today },
  }).lean();

  const reminderIds = reminders.map(r => r.id);
  const logs = await DoseLog.find({
    reminder_id: { $in: reminderIds },
    date: today,
  }).lean();

  const logMap = {};
  logs.forEach(log => {
    logMap[`${log.reminder_id}_${log.time}`] = log.status;
  });

  const doses = [];
  reminders.forEach(reminder => {
    (reminder.times || []).forEach(time => {
      doses.push({
        reminder_id: reminder.id,
        medicine_name: reminder.medicine_name,
        dosage: reminder.dosage || '',
        instructions: reminder.instructions || '',
        family_member_name: reminder.family_member_name,
        time,
        date: today,
        status: logMap[`${reminder.id}_${time}`] || 'pending',
      });
    });
  });

  doses.sort((a, b) => a.time.localeCompare(b.time));

  const total = doses.length;
  const taken = doses.filter(d => d.status === 'taken').length;
  const missed = doses.filter(d => d.status === 'missed').length;
  const pending = doses.filter(d => d.status === 'pending').length;

  res.json({
    date: today,
    doses,
    counts: { total, taken, missed, pending },
    adherence_pct: total > 0 ? Math.round((taken / total) * 100) : 0,
  });
});

/**
 * Get dose logs for reminder
 */
const getDoseLogs = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { rem_id } = req.params;

  const reminder = await Reminder.findOne({ id: rem_id, user_id: userId });
  if (!reminder) {
    throw new ApiError(404, 'Reminder not found');
  }

  const logs = await DoseLog.find({ reminder_id: rem_id })
    .sort({ logged_at: -1 })
    .limit(500)
    .lean();

  const cleanLogs = logs.map(l => {
    const obj = { ...l };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(cleanLogs);
});

module.exports = {
  listReminders,
  createReminder,
  createRemindersFromPrescription,
  updateReminder,
  deleteReminder,
  logDose,
  getTodaysDoses,
  getDoseLogs,
};

const mongoose = require('mongoose');

const doseLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  reminder_id: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['taken', 'missed', 'skipped'],
    default: 'taken',
  },
  logged_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
doseLogSchema.index({ reminder_id: 1, date: 1, time: 1 }, { unique: true });
doseLogSchema.index({ reminder_id: 1, logged_at: -1 });

module.exports = mongoose.model('DoseLog', doseLogSchema);

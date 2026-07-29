const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  user_id: {
    type: String,
    required: true,
  },
  family_member_id: String,
  family_member_name: String,
  prescription_id: String,
  medicine_name: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
    default: '',
  },
  times: [{
    type: String,
    required: true,
  }],
  duration_days: {
    type: Number,
    required: true,
  },
  start_date: {
    type: String,
    required: true,
  },
  end_date: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    default: '',
  },
  active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
reminderSchema.index({ user_id: 1, active: 1, created_at: -1 });
reminderSchema.index({ family_member_id: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);

const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  doctor_id: {
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
  is_booked: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
slotSchema.index({ doctor_id: 1, date: 1, time: 1 }, { unique: true });
slotSchema.index({ doctor_id: 1, date: 1 });
slotSchema.index({ is_booked: 1 });

module.exports = mongoose.model('Slot', slotSchema);

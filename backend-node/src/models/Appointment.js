const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  booking_id: {
    type: String,
    required: true,
  },
  token_number: {
    type: Number,
    required: true,
  },
  patient_id: {
    type: String,
    required: true,
  },
  doctor_id: {
    type: String,
    required: true,
  },
  doctor_name: {
    type: String,
    required: true,
  },
  doctor_specialty: {
    type: String,
    required: true,
  },
  doctor_photo_url: {
    type: String,
    required: true,
  },
  clinic_name: {
    type: String,
    required: true,
  },
  clinic_address: {
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
  consultation_type: {
    type: String,
    enum: ['clinic', 'video'],
    default: 'clinic',
  },
  consultation_fee: {
    type: Number,
    required: true,
  },
  payment_method: {
    type: String,
    enum: ['esewa', 'khalti', 'card', 'cash'],
    default: 'esewa',
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed',
  },
  queue_status: {
    type: String,
    enum: ['waiting', 'in_consultation', 'completed', 'no_show', 'skipped'],
    default: 'waiting',
  },
  current_serving: {
    type: Number,
    default: 1,
  },
  patient_details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  is_walk_in: {
    type: Boolean,
    default: false,
  },
  checked_in_at: Date,
  called_at: Date,
  completed_at: Date,
  created_by_staff: String,
  transaction_uuid: String,
  mode: {
    type: String,
    enum: ['clinic', 'video'],
    default: 'clinic',
  },
  video_status: {
    type: String,
    enum: ['not_started', 'doctor_ready', 'ended'],
    default: 'not_started',
  },
  video_started_at: Date,
  video_ended_at: Date,
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
appointmentSchema.index({ patient_id: 1, created_at: -1 });
appointmentSchema.index({ doctor_id: 1, date: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ queue_status: 1 });
appointmentSchema.index({ token_number: 1 });

appointmentSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

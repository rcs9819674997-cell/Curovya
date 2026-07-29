const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  patient_id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['prescription', 'lab_report', 'x_ray', 'ct_scan', 'mri', 'ecg', 'vaccination'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  doctor_name: {
    type: String,
    default: '',
  },
  date: {
    type: String,
    required: true,
  },
  file_url: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
healthRecordSchema.index({ patient_id: 1, date: -1 });
healthRecordSchema.index({ type: 1 });

module.exports = mongoose.model('HealthRecord', healthRecordSchema);

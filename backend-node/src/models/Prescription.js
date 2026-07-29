const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
    required: true,
  },
  duration: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    default: '',
  },
});

const prescriptionSchema = new mongoose.Schema({
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
  diagnosis: {
    type: String,
    required: true,
  },
  symptoms: [{
    type: String,
  }],
  medicines: [medicineSchema],
  follow_up_date: {
    type: String,
  },
  notes: {
    type: String,
    default: '',
  },
  appointment_id: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
prescriptionSchema.index({ patient_id: 1, created_at: -1 });
prescriptionSchema.index({ doctor_id: 1, created_at: -1 });
prescriptionSchema.index({ appointment_id: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);

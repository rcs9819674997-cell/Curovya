const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  name: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true,
  },
  qualification: {
    type: String,
    required: true,
  },
  experience_years: {
    type: Number,
    required: true,
  },
  languages: [{
    type: String,
  }],
  clinic_name: {
    type: String,
    required: true,
  },
  clinic_address: {
    type: String,
    required: true,
  },
  consultation_fee: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  review_count: {
    type: Number,
    default: 0,
  },
  online_consult: {
    type: Boolean,
    default: false,
  },
  photo_url: {
    type: String,
    required: true,
  },
  about: {
    type: String,
    default: '',
  },
  is_approved: {
    type: Boolean,
    default: true,
  },
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
doctorSchema.index({ specialty: 1 });
doctorSchema.index({ name: 'text', specialty: 'text', clinic_name: 'text' });
doctorSchema.index({ rating: -1 });
doctorSchema.index({ consultation_fee: 1 });
doctorSchema.index({ online_consult: 1 });

doctorSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Doctor', doctorSchema);

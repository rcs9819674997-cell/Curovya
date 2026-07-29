const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  full_name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password_hash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'clinic_admin', 'lab_admin', 'receptionist', 'super_admin'],
    default: 'patient',
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  is_approved: {
    type: Boolean,
    default: true,
  },
  is_suspended: {
    type: Boolean,
    default: false,
  },
  is_walk_in: {
    type: Boolean,
    default: false,
  },
  otp: String,
  otp_expires: Date,
  reset_otp: String,
  reset_otp_expires: Date,
  language: {
    type: String,
    default: 'en',
  },
  doctor_id: String,
  clinic_id: String,
  subscription: {
    active: {
      type: Boolean,
      default: false,
    },
    plan: String,
    price: Number,
    payment_method: String,
    started_at: Date,
    expires_at: Date,
    transaction_uuid: String,
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

// Indexes for better query performance
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

userSchema.index({ clinic_id: 1 });
userSchema.index({ doctor_id: 1 });
userSchema.index({ 'subscription.active': 1 });

// Update the updated_at field before saving
userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('User', userSchema);

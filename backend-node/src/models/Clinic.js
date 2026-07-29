const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
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
  address: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  admin_user_id: {
    type: String,
    required: true,
  },
  doctor_ids: [{
    type: String,
  }],
  departments: [{
    type: String,
  }],
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
clinicSchema.index({ admin_user_id: 1 });
clinicSchema.index({ doctor_ids: 1 });

clinicSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Clinic', clinicSchema);

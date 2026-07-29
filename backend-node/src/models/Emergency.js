const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['hospital', 'ambulance', 'blood_bank', 'police'],
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  distance_km: {
    type: Number,
    required: true,
  },
  open_24_7: {
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
emergencySchema.index({ type: 1 });
emergencySchema.index({ distance_km: 1 });

module.exports = mongoose.model('Emergency', emergencySchema);

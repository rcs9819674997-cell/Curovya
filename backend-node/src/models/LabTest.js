const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
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
  category: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  home_collection: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    required: true,
  },
  turnaround_hours: {
    type: Number,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
labTestSchema.index({ name: 'text' });
labTestSchema.index({ category: 1 });

module.exports = mongoose.model('LabTest', labTestSchema);

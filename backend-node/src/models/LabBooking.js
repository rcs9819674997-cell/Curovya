const mongoose = require('mongoose');

const labBookingSchema = new mongoose.Schema({
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
  test_id: {
    type: String,
    required: true,
  },
  test_name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  home_collection: {
    type: Boolean,
    default: false,
  },
  address: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['booked', 'sample_collected', 'processing', 'ready', 'delivered'],
    default: 'booked',
  },
  technician_name: String,
  report_url: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
labBookingSchema.index({ patient_id: 1, created_at: -1 });
labBookingSchema.index({ status: 1 });
labBookingSchema.index({ date: 1 });

module.exports = mongoose.model('LabBooking', labBookingSchema);

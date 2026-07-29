const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transaction_uuid: {
    type: String,
    required: true,
    unique: true,
  },
  user_id: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  use_case: {
    type: String,
    enum: ['appointment', 'subscription'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  return_url: {
    type: String,
    required: true,
  },
  doctor_id: String,
  slot_id: String,
  consultation_type: String,
  patient_details: mongoose.Schema.Types.Mixed,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
transactionSchema.index({ user_id: 1, created_at: -1 });
transactionSchema.index({ status: 1 });


module.exports = mongoose.model('Transaction', transactionSchema);

const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  user_id: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['appointment', 'payment', 'technical', 'prescription', 'other', 'General', 'Bookings', 'Payments', 'Video Consult', 'Lab Tests', 'Prescriptions', 'Technical', 'Appointment', 'Payment', 'Other'],
    default: 'General',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
  },
  reply: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
supportTicketSchema.index({ user_id: 1, created_at: -1 });
supportTicketSchema.index({ status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

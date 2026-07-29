const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  actor_id: {
    type: String,
    required: true,
  },
  actor_email: {
    type: String,
    required: true,
  },
  actor_role: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  target: String,
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
auditLogSchema.index({ actor_id: 1, created_at: -1 });
auditLogSchema.index({ action: 1, created_at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

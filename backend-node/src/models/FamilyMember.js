const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  owner_id: {
    type: String,
    required: true,
  },
  full_name: {
    type: String,
    required: true,
  },
  relation: {
    type: String,
    enum: ['self', 'spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'other'],
    required: true,
  },
  age: Number,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  blood_group: String,
  phone: String,
  allergies: String,
  medical_conditions: String,
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
familyMemberSchema.index({ owner_id: 1, relation: 1 });


module.exports = mongoose.model('FamilyMember', familyMemberSchema);

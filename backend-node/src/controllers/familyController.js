const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId } = require('../utils/helpers');

const getUserId = (req) => req.user.id || req.user.sub;

/**
 * List family members
 */
const listFamilyMembers = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  let members = await FamilyMember.find({ owner_id: userId })
    .sort({ created_at: 1 })
    .lean();

  // Ensure self profile exists
  const hasSelf = members.some(m => m.relation === 'self');
  if (!hasSelf) {
    const user = await User.findOne({ id: userId }).lean() || {};
    const selfMember = await FamilyMember.create({
      id: generateId('fm'),
      owner_id: userId,
      full_name: user.full_name || req.user.full_name || 'Self',
      relation: 'self',
      phone: user.phone || req.user.phone || '',
      created_at: new Date().toISOString(),
    });
    const selfObj = selfMember.toObject();
    delete selfObj._id;
    delete selfObj.__v;
    members.unshift(selfObj);
  } else {
    members = members.map(m => {
      const obj = { ...m };
      delete obj._id;
      delete obj.__v;
      return obj;
    });
  }

  res.json(members);
});

/**
 * Create family member
 */
const createFamilyMember = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { full_name, relation, age, gender, blood_group, phone, allergies, medical_conditions } = req.body;

  if (relation === 'self') {
    const existing = await FamilyMember.findOne({ owner_id: userId, relation: 'self' });
    if (existing) {
      throw new ApiError(400, 'Self profile already exists');
    }
  }

  const member = await FamilyMember.create({
    id: generateId('fm'),
    owner_id: userId,
    full_name,
    relation,
    age,
    gender,
    blood_group,
    phone,
    allergies,
    medical_conditions,
    created_at: new Date().toISOString(),
  });

  const memberObj = member.toObject();
  delete memberObj._id;
  delete memberObj.__v;

  res.json(memberObj);
});


/**
 * Update family member
 */
const updateFamilyMember = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { member_id } = req.params;
  const { full_name, relation, age, gender, blood_group, phone, allergies, medical_conditions } = req.body;

  const member = await FamilyMember.findOne({ id: member_id, owner_id: userId });
  if (!member) {
    throw new ApiError(404, 'Family member not found');
  }

  const updateData = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (relation !== undefined) updateData.relation = relation;
  if (age !== undefined) updateData.age = age;
  if (gender !== undefined) updateData.gender = gender;
  if (blood_group !== undefined) updateData.blood_group = blood_group;
  if (phone !== undefined) updateData.phone = phone;
  if (allergies !== undefined) updateData.allergies = allergies;
  if (medical_conditions !== undefined) updateData.medical_conditions = medical_conditions;

  const updated = await FamilyMember.findOneAndUpdate({ id: member_id, owner_id: userId }, updateData, { new: true }).lean();

  const updatedObj = { ...updated };
  delete updatedObj._id;
  delete updatedObj.__v;

  res.json(updatedObj);
});

/**
 * Delete family member
 */
const deleteFamilyMember = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { member_id } = req.params;

  const member = await FamilyMember.findOne({ id: member_id, owner_id: userId });
  if (!member) {
    throw new ApiError(404, 'Family member not found');
  }

  if (member.relation === 'self') {
    throw new ApiError(400, 'Cannot delete self profile');
  }

  await FamilyMember.deleteOne({ id: member_id });

  res.json({ ok: true });
});

module.exports = {
  listFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
};

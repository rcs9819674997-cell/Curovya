const Emergency = require('../models/Emergency');
const { asyncHandler } = require('../middleware/errorHandler');
const redis = require('../config/redis');

/**
 * List emergency contacts
 */
const listEmergencyContacts = asyncHandler(async (req, res) => {
  const { type } = req.query;

  const filter = {};
  if (type) {
    filter.type = type;
  }

  const cacheKey = `emergency:${type || 'all'}`;
  let contacts = await redis.get(cacheKey);

  if (!contacts) {
    contacts = await Emergency.find(filter)
      .sort({ distance_km: 1 })
      .limit(50)
      .lean();

    contacts = contacts.map(c => {
      const obj = { ...c };
      delete obj._id;
      delete obj.__v;
      return obj;
    });

    await redis.set(cacheKey, contacts, 3600);
  }

  res.json(contacts);
});

module.exports = {
  listEmergencyContacts,
};

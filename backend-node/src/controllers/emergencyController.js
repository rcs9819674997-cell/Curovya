const Emergency = require('../models/Emergency');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId } = require('../utils/helpers');
const redis = require('../config/redis');

/**
 * List emergency contacts / services
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

/**
 * Dispatch emergency service (Ambulance / Emergency SOS)
 */
const dispatchEmergency = asyncHandler(async (req, res) => {
  const { location, patient_name, contact_number, notes } = req.body;

  const dispatchId = generateId('sos');
  const dispatchRecord = {
    dispatch_id: dispatchId,
    location: location || 'Unknown',
    patient_name: patient_name || 'Emergency Patient',
    contact_number: contact_number || '',
    notes: notes || '',
    status: 'dispatched',
    eta_minutes: Math.floor(Math.random() * 10) + 5,
    timestamp: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    dispatch: dispatchRecord,
  });
});

module.exports = {
  listEmergencyContacts,
  dispatchEmergency,
};

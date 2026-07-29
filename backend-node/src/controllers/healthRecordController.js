const HealthRecord = require('../models/HealthRecord');
const { asyncHandler } = require('../middleware/errorHandler');

const getUserId = (req) => req.user.id || req.user.sub;

/**
 * List my health records
 */
const listHealthRecords = asyncHandler(async (req, res) => {
  const userId = getUserId(req);
  const { type } = req.query;

  const filter = { patient_id: userId };
  if (type && type !== 'all') {
    filter.type = type;
  }

  let records = await HealthRecord.find(filter)
    .sort({ date: -1 })
    .limit(500)
    .lean();

  records = records.map(r => {
    const obj = { ...r };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(records);
});

module.exports = {
  listHealthRecords,
};

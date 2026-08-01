const LabTest = require('../models/LabTest');
const LabBooking = require('../models/LabBooking');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId } = require('../utils/helpers');
const { pushNotification } = require('../utils/notificationHelper');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * List available lab tests
 */
const listLabTests = asyncHandler(async (req, res) => {
  const { q } = req.query;

  const filter = {};
  if (q) {
    filter.name = { $regex: q, $options: 'i' };
  }

  const cacheKey = `lab_tests:${q || 'all'}`;
  let tests = await redis.get(cacheKey);

  if (!tests) {
    tests = await LabTest.find(filter).limit(200).lean();
    await redis.set(cacheKey, tests, 600); // Cache for 10 minutes
  }

  res.json({
    success: true,
    tests,
  });
});

/**
 * Book lab test
 */
const bookLabTest = asyncHandler(async (req, res) => {
  const { test_id, home_collection, date, address } = req.body;

  const test = await LabTest.findOne({ id: test_id }).lean();
  if (!test) {
    throw new ApiError(404, 'Test not found');
  }

  const booking = await LabBooking.create({
    id: generateId(),
    patient_id: req.user.sub,
    test_id: test.id,
    test_name: test.name,
    price: test.price,
    date,
    home_collection,
    address: address || '',
    status: 'booked',
  });

  // Send notification
  await pushNotification(req.user.sub, 'lab', 'Lab test booked',
    `${test.name} booked for ${date}.${home_collection ? ' Home sample collection.' : ''}`
  );

  logger.info('Lab test booked', { bookingId: booking.id, patientId: req.user.sub, testId: test.id });

  res.status(201).json({
    success: true,
    booking: booking.toObject(),
  });
});

/**
 * List my lab bookings
 */
const listMyLabBookings = asyncHandler(async (req, res) => {
  const bookings = await LabBooking.find({ patient_id: req.user.sub })
    .sort({ created_at: -1 })
    .limit(200)
    .lean();

  res.json({
    success: true,
    bookings,
  });
});

/**
 * Lab admin: Get dashboard stats
 */
const getLabDashboard = asyncHandler(async (req, res) => {
  const bookings = await LabBooking.find({}).lean();

  const total = bookings.length;
  const by_status = {
    booked: 0,
    sample_collected: 0,
    processing: 0,
    ready: 0,
    delivered: 0,
  };

  let revenue = 0;
  let home_collections = 0;

  bookings.forEach(b => {
    by_status[b.status] = (by_status[b.status] || 0) + 1;
    revenue += b.price || 0;
    if (b.home_collection) home_collections++;
  });

  res.json({
    total_bookings: total,
    by_status,
    revenue: Math.round(revenue * 100) / 100,
    home_collections,
  });
});

/**
 * Lab admin: List all bookings
 */
const listAllLabBookings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  let bookings = await LabBooking.find(filter)
    .sort({ created_at: -1 })
    .limit(500)
    .lean();

  // Enrich with patient details
  const patientIds = [...new Set(bookings.map(b => b.patient_id))];
  const patients = await User.find({ id: { $in: patientIds } })
    .select('id full_name phone')
    .lean();

  const patientMap = {};
  patients.forEach(p => {
    patientMap[p.id] = p;
  });

  bookings = bookings.map(b => {
    const obj = {
      ...b,
      patient_name: patientMap[b.patient_id]?.full_name || 'Unknown',
      patient_phone: patientMap[b.patient_id]?.phone || '',
    };
    delete obj._id;
    delete obj.__v;
    return obj;
  });

  res.json(bookings);
});

/**
 * Lab admin: Update booking status
 */
const updateLabBooking = asyncHandler(async (req, res) => {
  const { booking_id } = req.params;
  const { status, technician_name, report_url } = req.body;

  const updateData = {};
  if (status) updateData.status = status;
  if (technician_name !== undefined) updateData.technician_name = technician_name;
  if (report_url !== undefined) updateData.report_url = report_url;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, 'Nothing to update');
  }

  const booking = await LabBooking.findOneAndUpdate({ id: booking_id }, updateData, { new: true }).lean();
  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  // Notify patient on status changes
  if (status === 'ready') {
    await pushNotification(booking.patient_id, 'lab', 'Lab report ready',
      `Your ${booking.test_name} report is ready to download.`,
      '/records'
    );
  } else if (status === 'sample_collected') {
    await pushNotification(booking.patient_id, 'lab', 'Sample collected',
      `Sample collected for ${booking.test_name}. Report expected soon.`
    );
  }

  logger.info('Lab booking updated', { booking_id, status, updatedBy: req.user.id });

  const bookingObj = { ...booking };
  delete bookingObj._id;
  delete bookingObj.__v;

  res.json(bookingObj);
});


// pushNotification imported from ../utils/notificationHelper

module.exports = {
  listLabTests,
  bookLabTest,
  listMyLabBookings,
  getLabDashboard,
  listAllLabBookings,
  updateLabBooking,
};

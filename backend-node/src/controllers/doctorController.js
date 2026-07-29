const Doctor = require('../models/Doctor');
const Slot = require('../models/Slot');
const Review = require('../models/Review');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateId } = require('../utils/helpers');
const redis = require('../config/redis');
const logger = require('../utils/logger');

const getUserId = (req) => req.user ? (req.user.id || req.user.sub) : null;

/**
 * List doctors with filters
 */
const listDoctors = asyncHandler(async (req, res) => {
  const { q, specialty, gender, min_rating, max_fee, online } = req.query;

  const filter = {};

  if (specialty && specialty.toLowerCase() !== 'all') {
    filter.specialty = specialty;
  }

  if (gender) {
    filter.gender = gender;
  }

  if (min_rating) {
    filter.rating = { $gte: parseFloat(min_rating) };
  }

  if (max_fee) {
    filter.consultation_fee = { $lte: parseFloat(max_fee) };
  }

  if (online !== undefined) {
    filter.online_consult = online === 'true' || online === true;
  }

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { specialty: { $regex: q, $options: 'i' } },
      { clinic_name: { $regex: q, $options: 'i' } },
    ];
  }

  const cacheKey = `doctors:${JSON.stringify(filter)}`;
  let doctors = await redis.get(cacheKey);

  if (!doctors) {
    doctors = await Doctor.find(filter).limit(500).lean();
    doctors = doctors.map(d => {
      const obj = { ...d };
      delete obj._id;
      delete obj.__v;
      return obj;
    });
    await redis.set(cacheKey, doctors, 300);
  }

  res.json(doctors);
});

/**
 * Get all specialties
 */
const getSpecialties = asyncHandler(async (req, res) => {
  const cacheKey = 'specialties';
  let specialties = await redis.get(cacheKey);

  if (!specialties) {
    specialties = await Doctor.distinct('specialty');
    specialties.sort();
    await redis.set(cacheKey, specialties, 3600);
  }

  res.json(specialties);
});

/**
 * Get single doctor by ID
 */
const getDoctor = asyncHandler(async (req, res) => {
  const { doctor_id } = req.params;

  const cacheKey = `doctor:${doctor_id}`;
  let doctor = await redis.get(cacheKey);

  if (!doctor) {
    doctor = await Doctor.findOne({ id: doctor_id }).lean();
    if (!doctor) {
      throw new ApiError(404, 'Doctor not found');
    }
    delete doctor._id;
    delete doctor.__v;
    await redis.set(cacheKey, doctor, 600);
  }

  res.json(doctor);
});

/**
 * Get doctor slots
 */
const getDoctorSlots = asyncHandler(async (req, res) => {
  const { doctor_id } = req.params;
  const { date } = req.query;

  const filter = { doctor_id };
  if (date) {
    filter.date = date;
  }

  const cacheKey = `slots:${doctor_id}:${date || 'all'}`;
  let slots = await redis.get(cacheKey);

  if (!slots) {
    slots = await Slot.find(filter).lean();
    slots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    slots = slots.map(s => {
      const obj = { ...s };
      delete obj._id;
      delete obj.__v;
      return obj;
    });
    await redis.set(cacheKey, slots, 300);
  }

  res.json(slots);
});

/**
 * Get doctor reviews
 */
const getDoctorReviews = asyncHandler(async (req, res) => {
  const { doctor_id } = req.params;

  const cacheKey = `reviews:${doctor_id}`;
  let reviews = await redis.get(cacheKey);

  if (!reviews) {
    reviews = await Review.find({ doctor_id }).sort({ created_at: -1 }).limit(100).lean();
    reviews = reviews.map(r => {
      const obj = { ...r };
      delete obj._id;
      delete obj.__v;
      return obj;
    });
    await redis.set(cacheKey, reviews, 600);
  }

  res.json(reviews);
});

/**
 * Submit doctor review
 */
const submitReview = asyncHandler(async (req, res) => {
  const { doctor_id } = req.params;
  const { rating, comment, appointment_id } = req.body;
  const userId = getUserId(req);

  if (rating < 1 || rating > 5) {
    throw new ApiError(422, 'Rating must be between 1 and 5');
  }

  const doctor = await Doctor.findOne({ id: doctor_id });
  if (!doctor) {
    throw new ApiError(404, 'Doctor not found');
  }

  const appointmentFilter = { doctor_id, patient_id: userId };
  if (appointment_id) {
    appointmentFilter.id = appointment_id;
  }

  const appointment = await Appointment.findOne(appointmentFilter);
  if (!appointment) {
    throw new ApiError(400, 'You can only review doctors after booking an appointment');
  }

  const user = await User.findOne({ id: userId }).lean() || {};
  let review = await Review.findOne({ doctor_id, patient_id: userId });

  const now = new Date().toISOString();

  if (review) {
    review.rating = rating;
    review.comment = comment;
    review.created_at = now;
    await review.save();
  } else {
    review = await Review.create({
      id: generateId('rev'),
      doctor_id,
      patient_id: userId,
      patient_name: user.full_name || req.user.full_name || 'Patient',
      rating,
      comment,
      appointment_id,
      verified: true,
      created_at: now,
    });
  }

  // Recalculate doctor rating
  const allReviews = await Review.find({ doctor_id }).lean();
  if (allReviews.length > 0) {
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    doctor.rating = Math.round(avgRating * 10) / 10;
    doctor.review_count = allReviews.length;
    await doctor.save();

    await redis.del(`doctor:${doctor_id}`);
  }

  await redis.del(`reviews:${doctor_id}`);

  const reviewObj = review.toObject();
  delete reviewObj._id;
  delete reviewObj.__v;

  res.json(reviewObj);
});

/**
 * Get current user's review for a doctor
 */
const getMyReview = asyncHandler(async (req, res) => {
  const { doctor_id } = req.params;
  const userId = getUserId(req);

  const review = await Review.findOne({ doctor_id, patient_id: userId }).lean();

  if (!review) {
    return res.json({});
  }

  const reviewObj = { ...review };
  delete reviewObj._id;
  delete reviewObj.__v;

  res.json(reviewObj);
});

module.exports = {
  listDoctors,
  getSpecialties,
  getDoctor,
  getDoctorSlots,
  getDoctorReviews,
  submitReview,
  getMyReview,
};

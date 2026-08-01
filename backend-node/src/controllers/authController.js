const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Clinic = require('../models/Clinic');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { hashPassword, verifyPassword, generateOTP, generateId, addMinutes, sanitizeUser } = require('../utils/helpers');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * User signup
 */
const signup = asyncHandler(async (req, res) => {
  const {
    full_name,
    email,
    phone,
    password,
    role = 'patient',
    license_number,
    specialty,
    qualification,
    experience_years,
    clinic_name,
    clinic_address,
    consultation_fee,
    languages,
    lab_name,
    lab_address,
    departments,
    test_categories,
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, 'Email already registered');
  }

  // Provider roles require admin approval before login access is granted
  const isProviderRole = ['doctor', 'clinic_admin', 'lab_admin', 'receptionist'].includes(role);
  const isApproved = !isProviderRole;

  // Generate OTP
  const otp = generateOTP();
  const otpExpires = addMinutes(new Date(), 10);

  const userId = generateId();
  let doctorId = null;
  let clinicId = null;

  if (role === 'doctor') {
    doctorId = `doc-${generateId()}`;
    try {
      await Doctor.create({
        id: doctorId,
        name: full_name,
        specialty: specialty || 'General Physician',
        gender: 'male',
        qualification: qualification || 'MBBS',
        experience_years: Number(experience_years) || 1,
        languages: Array.isArray(languages) ? languages : ['Nepali', 'English'],
        clinic_name: clinic_name || 'Curovya Associated Clinic',
        clinic_address: clinic_address || 'Kathmandu, Nepal',
        consultation_fee: Number(consultation_fee) || 500,
        photo_url: 'https://images.unsplash.com/photo-1612349316228-5942a9b489c2?w=400&q=80',
        is_approved: false,
      });
    } catch (err) {
      logger.warn('Failed creating Doctor record during signup:', err.message);
    }
  } else if (role === 'clinic_admin') {
    clinicId = `clinic-${generateId()}`;
    try {
      await Clinic.create({
        id: clinicId,
        name: clinic_name || `${full_name}'s Clinic`,
        address: clinic_address || 'Kathmandu, Nepal',
        phone: phone,
        departments: Array.isArray(departments) ? departments : ['General Medicine'],
        is_approved: false,
      });
    } catch (err) {
      logger.warn('Failed creating Clinic record during signup:', err.message);
    }
  }

  // Create user
  const user = await User.create({
    id: userId,
    full_name,
    email: email.toLowerCase(),
    phone,
    password_hash: await hashPassword(password),
    role,
    is_verified: false,
    is_approved: isApproved,
    otp,
    otp_expires: otpExpires,
    language: 'en',
    doctor_id: doctorId,
    clinic_id: clinicId,
    license_number,
    specialty,
    qualification,
    experience_years: Number(experience_years) || 0,
    clinic_name,
    clinic_address,
    consultation_fee: Number(consultation_fee) || 0,
    languages: Array.isArray(languages) ? languages : [],
    lab_name,
    lab_address,
    departments: Array.isArray(departments) ? departments : [],
    test_categories: Array.isArray(test_categories) ? test_categories : [],
  });

  // Generate tokens
  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
    doctor_id: user.doctor_id,
    clinic_id: user.clinic_id,
  });

  // Cache user in Redis for quick access
  await redis.setSession(user.id, sanitizeUser(user.toObject()));

  logger.info('User signed up successfully', { userId: user.id, email: user.email, role: user.role, isApproved });

  res.status(201).json({
    success: true,
    access_token: accessToken,
    token_type: 'bearer',
    user: sanitizeUser(user.toObject()),
    dev_otp: otp, // Only for development
  });
});

/**
 * User login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if user is suspended
  if (user.is_suspended) {
    throw new ApiError(403, 'Account has been suspended');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Check if provider account is pending admin verification
  if (['doctor', 'clinic_admin', 'lab_admin', 'receptionist'].includes(user.role) && !user.is_approved) {
    return res.status(403).json({
      success: false,
      is_pending_approval: true,
      message: 'Your provider account is pending verification by Curovya Admin. Access will be granted once your credentials are reviewed.',
      user: sanitizeUser(user.toObject()),
    });
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    sub: user.id,
    role: user.role,
    doctor_id: user.doctor_id,
    clinic_id: user.clinic_id,
  });

  // Cache user in Redis (non-blocking)
  redis.setSession(user.id, sanitizeUser(user.toObject())).catch(err => {
    logger.error('Redis session caching failed:', err);
  });

  logger.info('User logged in successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    access_token: accessToken,
    token_type: 'bearer',
    user: sanitizeUser(user.toObject()),
  });
});

/**
 * Verify OTP
 */
const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.otp !== otp) {
    throw new ApiError(400, 'Invalid OTP');
  }

  // Check OTP expiration
  if (user.otp_expires && new Date(user.otp_expires) < new Date()) {
    throw new ApiError(400, 'OTP expired. Please resend.');
  }

  // Update user as verified
  await User.findOneAndUpdate({ id: user.id }, {
    is_verified: true,
    otp: undefined,
    otp_expires: undefined,
  });

  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('User verified successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Account verified successfully',
  });
});

/**
 * Resend OTP
 */
const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const otp = generateOTP();
  const otpExpires = addMinutes(new Date(), 10);

  await User.findOneAndUpdate({ id: user.id }, {
    otp,
    otp_expires: otpExpires,
  });

  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('OTP resent successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    dev_otp: otp, // Only for development
  });
});

/**
 * Get current user
 */
const getMe = asyncHandler(async (req, res) => {
  // Try to get from cache first
  let user = await redis.getSession(req.user.sub);
  
  if (!user) {
    user = await User.findOne({ id: req.user.sub }).select('-password_hash -otp -reset_otp -otp_expires -reset_otp_expires');
    if (user) {
      await redis.setSession(req.user.sub, user.toObject());
    }
  }

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  res.json({
    success: true,
    user: sanitizeUser(typeof user.toObject === 'function' ? user.toObject() : user),
  });
});

/**
 * Forgot password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't leak account existence
    return res.json({
      success: true,
      message: 'If the account exists, an OTP has been sent.',
      dev_otp: null,
    });
  }

  const otp = generateOTP();
  const otpExpires = addMinutes(new Date(), 15);

  await User.findOneAndUpdate({ id: user.id }, {
    reset_otp: otp,
    reset_otp_expires: otpExpires,
  });

  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('Password reset OTP sent', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'OTP sent to registered email.',
    dev_otp: otp, // Only for development
  });
});

/**
 * Reset password
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, new_password } = req.body;

  if (new_password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.reset_otp !== otp) {
    throw new ApiError(400, 'Invalid or expired reset code');
  }

  // Check OTP expiration
  if (user.reset_otp_expires && new Date(user.reset_otp_expires) < new Date()) {
    throw new ApiError(400, 'Reset code expired. Please request a new one.');
  }

  await User.findOneAndUpdate({ id: user.id }, {
    password_hash: await hashPassword(new_password),
    reset_otp: undefined,
    reset_otp_expires: undefined,
  });

  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('Password reset successful', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Password reset successful',
  });
});

/**
 * Change password (authenticated)
 */
const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;

  if (new_password.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters');
  }

  const user = await User.findOne({ id: req.user.sub });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isPasswordValid = await verifyPassword(current_password, user.password_hash);
  if (!isPasswordValid) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  await User.findOneAndUpdate({ id: user.id }, {
    password_hash: await hashPassword(new_password),
  });

  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('Password changed successfully', { userId: user.id, email: user.email });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

/**
 * Update profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { full_name, phone, language } = req.body;

  const user = await User.findOne({ id: req.user.sub });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const updateData = {};
  if (full_name) updateData.full_name = full_name;
  if (phone) updateData.phone = phone;
  if (language) updateData.language = language;

  const updatedUser = await User.findOneAndUpdate(
    { id: user.id },
    updateData,
    { new: true }
  ).select('-password_hash -otp -reset_otp -otp_expires -reset_otp_expires');


  // Clear cache
  await redis.deleteSession(user.id);

  logger.info('Profile updated successfully', { userId: user.id });

  res.json({
    success: true,
    user: sanitizeUser(updatedUser.toObject()),
  });
});

/**
 * Logout
 */
const logout = asyncHandler(async (req, res) => {
  // Blacklist the token
  if (req.token) {
    await redis.set(`blacklist:${req.token}`, true, 60 * 60 * 24); // 24 hours
  }

  // Clear session cache
  if (req.user.sub) {
    await redis.deleteSession(req.user.sub);
  }

  logger.info('User logged out successfully', { userId: req.user.sub });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = {
  signup,
  login,
  verifyOTP,
  resendOTP,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  logout,
};

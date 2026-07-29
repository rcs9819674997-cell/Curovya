const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Verify password against hash
 */
const verifyPassword = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    return false;
  }
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate UUID
 */
const generateId = () => {
  return uuidv4();
};

/**
 * Get current UTC timestamp
 */
const now = () => {
  return new Date();
};

/**
 * Format date to YYYY-MM-DD
 */
const formatDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Format time to HH:MM
 */
const formatTime = (date = new Date()) => {
  return date.toTimeString().slice(0, 5);
};

/**
 * Add days to date
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add minutes to date
 */
const addMinutes = (date, minutes) => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

/**
 * Generate booking ID
 */
const generateBookingId = () => {
  return `HD-${Math.floor(100000 + Math.random() * 900000)}`;
};

/**
 * Generate stable UID for Agora from user ID
 */
const stableUid = (userId) => {
  const hash = crypto.createHash('sha256').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
};

/**
 * Paginate array
 */
const paginate = (array, page, limit) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return {
    data: array.slice(startIndex, endIndex),
    total: array.length,
    page,
    limit,
    totalPages: Math.ceil(array.length / limit),
  };
};

/**
 * Filter object by allowed keys
 */
const filterObject = (obj, allowedKeys) => {
  return Object.keys(obj)
    .filter(key => allowedKeys.includes(key))
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});
};

/**
 * Remove sensitive fields from user object
 */
const sanitizeUser = (user) => {
  const { password_hash, otp, reset_otp, otp_expires, reset_otp_expires, ...sanitized } = user;
  return sanitized;
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Nepal format)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^(\+977)?[9][6-8]\d{8}$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ''));
};

/**
 * Generate random string
 */
const randomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Sleep function for async delays
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
const retry = async (fn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge objects
 */
const mergeObjects = (...objects) => {
  return Object.assign({}, ...objects);
};

/**
 * Chunk array into smaller arrays
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remove duplicates from array
 */
const removeDuplicates = (array) => {
  return [...new Set(array)];
};

/**
 * Sort array by key
 */
const sortByKey = (array, key, order = 'asc') => {
  return array.sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

module.exports = {
  hashPassword,
  verifyPassword,
  generateOTP,
  generateId,
  now,
  formatDate,
  formatTime,
  addDays,
  addMinutes,
  generateBookingId,
  stableUid,
  paginate,
  filterObject,
  sanitizeUser,
  calculateAge,
  isValidEmail,
  isValidPhone,
  randomString,
  sleep,
  retry,
  deepClone,
  mergeObjects,
  chunkArray,
  removeDuplicates,
  sortByKey,
};

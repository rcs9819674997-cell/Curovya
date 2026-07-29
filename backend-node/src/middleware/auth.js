const jwt = require('jsonwebtoken');
const config = require('../config');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Generate JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: config.jwtAlgo,
    expiresIn: `${config.accessTokenMinutes}m`,
  });
};

/**
 * Generate JWT refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: config.jwtAlgo,
    expiresIn: `${config.refreshTokenDays}d`,
  });
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret, {
      algorithms: [config.jwtAlgo],
    });
  } catch (error) {
    logger.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await redis.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
      });
    }

    // Attach user info to request
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Require specific role
 */
const requireRole = (role) => authorize(role);

/**
 * Require doctor access
 */
const requireDoctor = (req, res, next) => {
  if (!req.user || req.user.role !== 'doctor' || !req.user.doctor_id) {
    return res.status(403).json({
      success: false,
      message: 'Doctor access required',
    });
  }
  next();
};

/**
 * Require clinic staff access
 */
const requireClinicStaff = (req, res, next) => {
  if (!req.user || !['clinic_admin', 'receptionist'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Clinic staff access required',
    });
  }
  if (!req.user.clinic_id) {
    return res.status(400).json({
      success: false,
      message: 'User not attached to any clinic',
    });
  }
  next();
};

/**
 * Require clinic admin access
 */
const requireClinicAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'clinic_admin') {
    return res.status(403).json({
      success: false,
      message: 'Clinic admin access required',
    });
  }
  if (!req.user.clinic_id) {
    return res.status(400).json({
      success: false,
      message: 'User not attached to any clinic',
    });
  }
  next();
};

/**
 * Require lab admin access
 */
const requireLabAdmin = (req, res, next) => {
  if (!req.user || !['lab_admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Lab admin access required',
    });
  }
  next();
};

/**
 * Require super admin access
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required',
    });
  }
  next();
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        const isBlacklisted = await redis.exists(`blacklist:${token}`);
        if (!isBlacklisted) {
          req.user = decoded;
          req.token = token;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  authorize,
  requireRole,
  requireDoctor,
  requireClinicStaff,
  requireClinicAdmin,
  requireLabAdmin,
  requireSuperAdmin,
  optionalAuth,
};

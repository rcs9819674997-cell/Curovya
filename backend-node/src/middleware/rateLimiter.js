const rateLimit = require('express-rate-limit');
const config = require('../config');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// Redis store for distributed rate limiting
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rate_limit:';
    this.windowMs = options.windowMs || 60000;
  }

  async increment(key) {
    try {
      const redisKey = this.prefix + key;
      const current = await redis.rateLimit(redisKey, 100, this.windowMs);
      return { totalHits: current, resetTime: Date.now() + this.windowMs };
    } catch (error) {
      logger.error('Redis rate limit error:', error);
      // Fallback to allow request on Redis error
      return { totalHits: 0, resetTime: Date.now() + this.windowMs };
    }
  }

  async decrement(key) {
    try {
      const redisKey = this.prefix + key;
      await redis.del(redisKey);
    } catch (error) {
      logger.error('Redis decrement error:', error);
    }
  }

  async resetKey(key) {
    try {
      const redisKey = this.prefix + key;
      await redis.del(redisKey);
    } catch (error) {
      logger.error('Redis reset error:', error);
    }
  }
}

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.nodeEnv === 'production' ? config.rateLimitMaxRequests : 10000,

  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: config.rateLimitSkipFailedRequests,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.isProduction ? 10 : 1000, // 1000 attempts in dev/test

  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
    });
  },
});

// Dedicated rate limiter for AI Health Coach endpoint
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.nodeEnv === 'production' ? 10 : 1000, // Rate limit for AI Health Coach requests
  message: {
    success: false,
    message: 'AI Health Coach rate limit reached. Please wait a minute before sending another prompt.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  handler: (req, res) => {
    logger.warn('AI Health Coach rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
    });
    res.status(429).json({
      success: false,
      message: 'AI Health Coach rate limit reached. Please wait a minute before sending another prompt.',
    });
  },
});


// Create custom rate limiter with key generator
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 100,
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    message: options.message || {
      success: false,
      message: 'Rate limit exceeded',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: options.skipFailedRequests !== false,
    handler: options.handler || ((req, res) => {
      res.status(429).json(options.message || {
        success: false,
        message: 'Rate limit exceeded',
      });
    }),
  });
};

// User-specific rate limiter
const userLimiter = (maxRequests = 100, windowMs = 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
      success: false,
      message: 'User rate limit exceeded, please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
    handler: (req, res) => {
      logger.warn('User rate limit exceeded', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
      });
      res.status(429).json({
        success: false,
        message: 'User rate limit exceeded, please slow down.',
      });
    },
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter,
  createRateLimiter,
  userLimiter,
  RedisStore,
};

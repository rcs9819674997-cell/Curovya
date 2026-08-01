const Redis = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
  }

  async connect() {
    try {
      const redisConfig = {
        url: config.redisUrl,
        password: config.redisPassword,
        database: config.redisDb,
        enableOfflineQueue: false, // Prevent queuing commands when Redis is disconnected
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 3) {
              logger.error('Redis reconnection failed after 3 retries');
              return new Error('Redis reconnection failed');
            }
            const delay = Math.min(retries * 200, 1000);
            return delay;
          },
        },
      };

      // Main client for caching
      this.client = Redis.createClient(redisConfig);
      
      // Publisher for pub/sub
      this.pubClient = Redis.createClient(redisConfig);
      
      // Subscriber for pub/sub
      this.subClient = Redis.createClient(redisConfig);

      // Error handling
      this.client.on('error', (err) => logger.error('Redis client error:', err.message));
      this.pubClient.on('error', (err) => logger.error('Redis pub client error:', err.message));
      this.subClient.on('error', (err) => logger.error('Redis sub client error:', err.message));

      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      logger.info('Redis connected successfully', {
        url: config.redisUrl,
        db: config.redisDb,
      });

      return this.client;
    } catch (error) {
      logger.warn('Redis connection unavailable. Operating backend gracefully without Redis caching.');
      return null;
    }
  }

  async disconnect() {
    try {
      await Promise.all([
        this.client?.quit().catch(() => {}),
        this.pubClient?.quit().catch(() => {}),
        this.subClient?.quit().catch(() => {}),
      ]);
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }

  isConnected() {
    return Boolean(this.client && this.client.isOpen);
  }

  // Cache operations
  async get(key) {
    if (!this.isConnected()) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = config.redisCacheTtl) {
    if (!this.isConnected()) return false;
    try {
      const serialized = JSON.stringify(value);
      await this.client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected()) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.isConnected()) return 0;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error(`Redis DEL pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key) {
    if (!this.isConnected()) return false;
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    if (!this.isConnected() || !this.pubClient?.isOpen) return;
    try {
      await this.pubClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
    }
  }

  async subscribe(channel, callback) {
    if (!this.isConnected() || !this.subClient?.isOpen) return;
    try {
      await this.subClient.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          logger.error('Error parsing pub/sub message:', error);
        }
      });
      logger.info(`Subscribed to channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  async unsubscribe(channel) {
    if (!this.isConnected() || !this.subClient?.isOpen) return;
    try {
      await this.subClient.unsubscribe(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis UNSUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  // Rate limiting
  async rateLimit(key, limit, windowMs) {
    if (!this.isConnected()) return true; // Allow request if Redis is offline
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.pExpire(key, windowMs);
      }
      return current <= limit;
    } catch (error) {
      logger.error(`Redis rate limit error for key ${key}:`, error);
      return true; // Allow request on error
    }
  }

  // Session management
  async setSession(sessionId, data, ttl = config.accessTokenMinutes * 60) {
    return this.set(`session:${sessionId}`, data, ttl);
  }

  async getSession(sessionId) {
    return this.get(`session:${sessionId}`);
  }

  async deleteSession(sessionId) {
    return this.del(`session:${sessionId}`);
  }

  getClient() {
    return this.client;
  }
}

module.exports = new RedisClient();

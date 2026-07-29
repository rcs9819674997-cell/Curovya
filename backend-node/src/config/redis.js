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
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 retries');
              return new Error('Redis reconnection failed');
            }
            const delay = Math.min(retries * 100, 3000);
            logger.info(`Redis reconnecting... attempt ${retries}, delay ${delay}ms`);
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

      await Promise.all([
        this.client.connect(),
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      logger.info('Redis connected successfully', {
        url: config.redisUrl,
        db: config.redisDb,
      });

      // Error handling
      this.client.on('error', (err) => logger.error('Redis client error:', err));
      this.pubClient.on('error', (err) => logger.error('Redis pub client error:', err));
      this.subClient.on('error', (err) => logger.error('Redis sub client error:', err));

      return this.client;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await Promise.all([
        this.client?.quit(),
        this.pubClient?.quit(),
        this.subClient?.quit(),
      ]);
      logger.info('Redis connections closed');
    } catch (error) {
      logger.error('Error closing Redis connections:', error);
    }
  }

  // Cache operations
  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key, value, ttl = config.redisCacheTtl) {
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
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async delPattern(pattern) {
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
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  // Pub/Sub operations
  async publish(channel, message) {
    try {
      await this.pubClient.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
    }
  }

  async subscribe(channel, callback) {
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
    try {
      await this.subClient.unsubscribe(channel);
      logger.info(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
      logger.error(`Redis UNSUBSCRIBE error for channel ${channel}:`, error);
    }
  }

  // Rate limiting
  async rateLimit(key, limit, windowMs) {
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

  isConnected() {
    return this.client?.isOpen || false;
  }
}

module.exports = new RedisClient();

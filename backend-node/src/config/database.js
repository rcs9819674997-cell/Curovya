const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const options = {
        maxPoolSize: config.mongoPoolSize,
        minPoolSize: config.mongoMinPoolSize,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        bufferCommands: true,
      };


      const connectOptions = {
        ...options,
        dbName: config.dbName || 'test_database',
      };

      this.connection = await mongoose.connect(config.mongoUrl, connectOptions);



      logger.info('MongoDB connected successfully', {
        url: config.mongoUrl,
        dbName: config.dbName,
        poolSize: config.mongoPoolSize,
      });

      // Connection event listeners
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error?.message || error);
      setTimeout(() => {
        logger.info('Retrying MongoDB connection...');
        this.connect().catch(() => {});
      }, 5000);
      throw error;
    }

  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();

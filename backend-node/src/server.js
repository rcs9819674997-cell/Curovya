const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const database = require('./config/database');
const redis = require('./config/redis');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');

const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const labRoutes = require('./routes/labRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const healthRecordRoutes = require('./routes/healthRecordRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const familyRoutes = require('./routes/familyRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const doctorPortalRoutes = require('./routes/doctorPortalRoutes');
const videoRoutes = require('./routes/videoRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const supportRoutes = require('./routes/supportRoutes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: config.corsCredentials,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

const getHealthStatus = (req, res) => {
  const dbStatus = database.isConnected() ? 'connected' : 'disconnected';
  const redisStatus = redis.isConnected() ? 'connected' : 'disconnected';
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: dbStatus,
    redis: redisStatus,
    env: config.nodeEnv,
  };
  const statusCode = dbStatus === 'connected' ? 200 : 503;
  res.status(statusCode).json(health);
};

app.get('/health', getHealthStatus);
app.get('/api/health', getHealthStatus);


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/records', healthRecordRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/doctor', doctorPortalRoutes);
app.use('/api/queue', doctorPortalRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);



// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'HamroDoctor API',
    version: '1.0.0',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Start HTTP server immediately so Render detects port binding
  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    logger.info(`Health check available at http://localhost:${config.port}/health`);
  });

  // Connect to database in background
  try {
    await database.connect();
    logger.info('Database connected successfully');
  } catch (dbError) {
    logger.error(`Database connection failed (${dbError.message}). Ensure MONGODB_URI is set in Render Environment.`);
  }

  // Connect to Redis in background
  try {
    await redis.connect();
    logger.info('Redis connected successfully');
  } catch (redisError) {
    logger.warn(`Redis connection failed (${redisError.message}). Operating backend without Redis caching.`);
  }

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        await database.disconnect();
        await redis.disconnect();
        logger.info('Database and Redis connections closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};


// Start server if not in test mode
if (config.nodeEnv !== 'test') {
  startServer();
}

module.exports = app;

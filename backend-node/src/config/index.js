require('dotenv').config();

module.exports = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT) || 8000,
  clusterMode: process.env.CLUSTER_MODE === 'true',
  workers: process.env.WORKERS === 'auto' ? require('os').cpus().length : parseInt(process.env.WORKERS) || 1,
  
  // MongoDB
  mongoUrl: process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://0.0.0.0:27017',
  dbName: process.env.DB_NAME || 'test_database',

  mongoPoolSize: parseInt(process.env.MONGO_POOL_SIZE) || 100,
  mongoMinPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE) || 10,
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisDb: parseInt(process.env.REDIS_DB) || 0,
  redisCacheTtl: parseInt(process.env.REDIS_CACHE_TTL) || 3600,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'curovya-super-secret-key-change-in-production-2026',
  jwtAlgo: process.env.JWT_ALGO || 'HS256',
  accessTokenMinutes: parseInt(process.env.ACCESS_TOKEN_MINUTES) || 1440,
  refreshTokenDays: parseInt(process.env.REFRESH_TOKEN_DAYS) || 30,
  
  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  
  // eSewa
  esewaEnv: process.env.ESEWA_ENV || 'UAT',
  esewaMerchantCode: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
  esewaSecretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8000',
  
  // Agora
  agoraAppId: process.env.AGORA_APP_ID || '',
  agoraAppCertificate: process.env.AGORA_APP_CERTIFICATE || '',
  agoraTokenTtlSeconds: parseInt(process.env.AGORA_TOKEN_TTL_SECONDS) || 3600,
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  rateLimitSkipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED_REQUESTS !== 'false',
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFilePath: process.env.LOG_FILE_PATH || './logs',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN
    ? (process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(',').map(s => s.trim()))
    : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:19000', 'http://localhost:8002', 'http://localhost:3000'],
  corsCredentials: process.env.CORS_CREDENTIALS !== 'false',
};


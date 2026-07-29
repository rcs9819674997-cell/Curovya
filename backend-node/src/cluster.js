const cluster = require('cluster');
const os = require('os');
const config = require('./config');
const logger = require('./utils/logger');

if (cluster.isMaster) {
  const numCPUs = config.workers || os.cpus().length;
  
  logger.info(`Master ${process.pid} is running`);
  logger.info(`Starting ${numCPUs} workers`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker exits
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
    logger.info('Starting a new worker');
    cluster.fork();
  });

  // Handle worker online
  cluster.on('online', (worker) => {
    logger.info(`Worker ${worker.process.pid} is online`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down master...`);
    
    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
    }

    setTimeout(() => {
      logger.info('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

} else {
  // Worker process
  require('./server');

  // Handle shutdown message from master
  process.on('message', (msg) => {
    if (msg === 'shutdown') {
      logger.info(`Worker ${process.pid} shutting down`);
      process.exit(0);
    }
  });
}

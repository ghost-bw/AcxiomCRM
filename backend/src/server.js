import app from './app.js';
import { connectDB } from './config/db.js';
import { ENV } from './config/env.js';

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(ENV.PORT, () => {
      console.log(`[AcxiomCRM Server] Running on http://localhost:${ENV.PORT} in ${ENV.NODE_ENV} mode`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\n[AcxiomCRM Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[AcxiomCRM Server] Closed all HTTP connections.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[AcxiomCRM Server] Startup failed:', error);
    process.exit(1);
  }
};

startServer();

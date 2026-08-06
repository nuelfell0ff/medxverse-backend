import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const server = http.createServer(app);

const startServer = async (): Promise<void> => {
  // Connect to MongoDB
  await connectDB();

  server.listen(env.PORT, () => {
    console.log(`
  ======================================================
     🚀 MedxVerse Backend Running on Port ${env.PORT}
     🌍 Environment: ${env.NODE_ENV}
     🏥 Active Portals: HIS System & HMO Portal
  ======================================================
    `);
  });
};

// Global Unhandled Promise Rejection Handler
process.on('unhandledRejection', (reason: Error) => {
  console.error('[Process Unhandled Rejection]:', reason);
  server.close(() => {
    process.exit(1);
  });
});

// Global Uncaught Exception Handler
process.on('uncaughtException', (error: Error) => {
  console.error('[Process Uncaught Exception]:', error);
  process.exit(1);
});

startServer();
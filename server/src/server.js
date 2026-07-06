// server/src/server.js
'use strict';

const app          = require('./app');
const env          = require('./config/env');
const { closePool } = require('./config/db');
const createTables = require('./config/schema');
const logger       = require('./utils/logger');

// ── Unhandled exception safety nets ───────────────────────────────────────────
// These catch bugs that escape all try/catch blocks.
// We log the error and exit cleanly so the process manager (PM2, Docker) can restart.

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION — shutting down', {
    message: err.message,
    stack:   err.stack,
  });
  // Give logger time to flush before exiting
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED PROMISE REJECTION — shutting down', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack:  reason instanceof Error ? reason.stack   : undefined,
  });
  process.exit(1);
});

// ── Graceful shutdown handler ──────────────────────────────────────────────────
// Called on SIGTERM (Kubernetes/Docker stop) or SIGINT (Ctrl+C in development).
// Stops accepting new connections, waits for in-flight requests to finish,
// then closes the DB pool before exiting.
let server;

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal} — starting graceful shutdown…`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed — no new requests accepted.');
      await closePool();
      logger.info('Shutdown complete. Goodbye.');
      process.exit(0);
    });

    // Force-exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Graceful shutdown timed out after 10s — forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  } else {
    await closePool();
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ── Startup sequence ──────────────────────────────────────────────────────────
async function start() {
  try {
    logger.info('Starting RuralSwift API…', { env: env.nodeEnv });

    // 1. Run database migrations (idempotent — safe to run every startup)
    await createTables();

    // 2. Start HTTP server
    server = app.listen(env.port, () => {
      logger.info(`RuralSwift API ready`, {
        port: env.port,
        env:  env.nodeEnv,
        routes: [
          'POST  /api/auth/register',
          'POST  /api/auth/verify-otp',
          'POST  /api/auth/login',
          'GET   /api/profile',
          'PUT   /api/profile',
          'GET   /api/health',
        ],
      });
      console.log(`\n🚀  RuralSwift API running at http://localhost:${env.port}`);
      console.log(`📋  Endpoints:`);
      console.log(`    POST  /api/auth/register`);
      console.log(`    POST  /api/auth/verify-otp`);
      console.log(`    POST  /api/auth/login`);
      console.log(`    GET   /api/profile`);
      console.log(`    PUT   /api/profile`);
      console.log(`    GET   /api/health\n`);
    });

    // Handle OS-level server errors (e.g., EADDRINUSE — port already in use)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${env.port} is already in use. Stop the other process or change PORT in .env.`);
      } else {
        logger.error('HTTP server error', { message: err.message, code: err.code });
      }
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server', {
      message: err.message,
      stack:   err.stack,
    });
    process.exit(1);
  }
}

start();

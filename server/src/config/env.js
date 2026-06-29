// server/src/config/env.js
'use strict';

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../..', '.env') });

/**
 * Validate that a required environment variable exists.
 * Throws a descriptive error at startup (fail-fast) if missing.
 */
function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `[ENV] Missing required environment variable: "${name}". ` +
      `Check your .env file at the project root.`
    );
  }
  return value.trim();
}

// Validate all required variables before the server starts.
// This prevents silent failures at the first DB/JWT call.
let config;
try {
  config = {
    port:       parseInt(process.env.PORT || '3000', 10),
    dbUrl:      requireEnv('DATABASE_URL'),
    jwtSecret:  requireEnv('JWT_SECRET'),
    nodeEnv:    process.env.NODE_ENV || 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',
  };
} catch (err) {
  // Fatal — log and exit immediately so the developer sees the problem
  console.error('\n❌  STARTUP FAILURE — Environment configuration error:');
  console.error('   ', err.message);
  console.error('\n   Ensure DATABASE_URL and JWT_SECRET are set in your .env file.\n');
  process.exit(1);
}

module.exports = config;

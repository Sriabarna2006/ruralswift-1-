// server/src/config/db.js
'use strict';

const { Pool } = require('pg');
const env = require('./env');

/**
 * PostgreSQL connection pool configured for NeonDB (serverless PostgreSQL).
 *
 * NeonDB is a serverless database — it "sleeps" after ~5 minutes of inactivity
 * and requires the first connection to "wake" it. The pool settings below are
 * tuned to handle this gracefully:
 *
 *   max:                    5   — NeonDB free plan supports limited connections
 *   idleTimeoutMillis:  60_000  — Hold idle connections for 60s before releasing
 *   connectionTimeoutMillis: 10_000 — Give NeonDB up to 10s to wake from sleep
 *   allowExitOnIdle:      true  — Pool won't keep the process alive if nothing is running
 */
const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max:                      5,
  idleTimeoutMillis:        60_000,   // 60s idle before releasing connection
  connectionTimeoutMillis:  10_000,   // 10s to wait for NeonDB wake-up
  allowExitOnIdle:          true,
});

// ── Pool-level error listener ─────────────────────────────────────────────────
// Catches errors on idle/background clients.
// Without this handler, these become uncaught exceptions and crash Node.
pool.on('error', (err) => {
  const msg = err.message || '';
  console.error('❌  [DB Pool] Idle client error:', msg);

  // Only exit for truly unrecoverable configuration errors
  const isFatal =
    msg.includes('password authentication failed') ||
    msg.includes('role') ||
    (msg.includes('database') && msg.includes('does not exist'));

  if (isFatal) {
    console.error('❌  [DB Pool] Fatal DB error — shutting down.');
    process.exit(1);
  }
  // Otherwise: log and continue — pg pool will replace the broken client automatically
});

// ── Startup connectivity probe ────────────────────────────────────────────────
// Attempt a real connection at boot so config errors are surfaced immediately.
// NeonDB may take a few seconds to wake — we retry up to 3 times before giving up.
(async function probeConnection(attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const client = await pool.connect();
      console.log('✅  [DB] Connected to NeonDB (PostgreSQL)');
      client.release();
      return; // success
    } catch (err) {
      if (attempt < attempts) {
        console.warn(`⚠️   [DB] Connection attempt ${attempt}/${attempts} failed — retrying in 2s... (${err.message})`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error('❌  [DB] Failed to connect to NeonDB after', attempts, 'attempts:', err.message);
        console.error('   → Check DATABASE_URL in your .env file and verify NeonDB is accessible.');
        // Don't exit — the app can still start; queries will fail gracefully
      }
    }
  }
})();

/**
 * Thin query wrapper that enriches DB errors with context for the error handler.
 * Captures the PostgreSQL error code, detail, and original query text.
 *
 * @param {string} text   - Parameterised SQL query string
 * @param {Array}  params - Query parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    // Build a richer error object so the global error handler can act on PG codes
    const enriched    = new Error(`[DB] ${err.message}`);
    enriched.code     = err.code;    // e.g., '23505' unique_violation
    enriched.detail   = err.detail;  // e.g., 'Key (email)=(x) already exists.'
    enriched.pgQuery  = text;
    throw enriched;
  }
}

/**
 * Gracefully drain and close the connection pool.
 * Call this during SIGTERM / SIGINT shutdown to prevent connection leaks.
 */
async function closePool() {
  try {
    await pool.end();
    console.log('✅  [DB] Connection pool closed gracefully.');
  } catch (err) {
    console.error('⚠️   [DB] Error closing pool:', err.message);
  }
}

module.exports = { pool, query, closePool };

// server/src/config/db.js
'use strict';

const { Pool } = require('pg');
const env = require('./env');

/**
 * PostgreSQL connection pool configured for NeonDB (serverless PostgreSQL).
 * Added statement_timeout (5s) to prevent slow queries from exhausting the pool.
 */
const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  max:                      5,
  idleTimeoutMillis:        60_000,   // 60s idle before releasing connection
  connectionTimeoutMillis:  10_000,   // 10s to wait for NeonDB wake-up
  statement_timeout:        5000,     // 5s max per query
  allowExitOnIdle:          true,
});

// ── Pool-level error listener ─────────────────────────────────────────────────
pool.on('error', (err) => {
  const msg = err.message || '';
  console.error('❌  [DB Pool] Idle client error:', msg);
  const isFatal =
    msg.includes('password authentication failed') ||
    msg.includes('role') ||
    (msg.includes('database') && msg.includes('does not exist'));

  if (isFatal) {
    console.error('❌  [DB Pool] Fatal DB error — shutting down.');
    process.exit(1);
  }
});

// ── Startup connectivity probe ────────────────────────────────────────────────
(async function probeConnection(attempts = 3) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const client = await pool.connect();
      const { rows } = await client.query('SELECT current_database() AS dbname');
      console.log(`✅  [DB] Connected to NeonDB (Database: ${rows[0].dbname})`);
      client.release();
      return; 
    } catch (err) {
      if (attempt < attempts) {
        console.warn(`⚠️   [DB] Connection attempt ${attempt}/${attempts} failed — retrying in 2s... (${err.message})`);
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.error('❌  [DB] Failed to connect to NeonDB after', attempts, 'attempts:', err.message);
        console.error('   → Check DATABASE_URL in your .env file and verify NeonDB is accessible.');
      }
    }
  }
})();

// ── Exponential Backoff Retry Logic ──────────────────────────────────────────
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      // 40P01 = Deadlock, 40001 = Serialization failure, 57P01 = Admin shutdown, 57P03 = Cannot connect now
      const isTransient = ['40P01', '40001', '57P01', '57P03'].includes(err.code) || err.message.includes('timeout');
      
      if (!isTransient || attempt === maxRetries) {
        const enriched = new Error(`[DB] ${err.message}`);
        enriched.code = err.code;
        enriched.detail = err.detail;
        throw enriched;
      }
      
      const delay = Math.pow(2, attempt) * 100; // 200ms, 400ms...
      console.warn(`⚠️   [DB] Transient error (${err.code}), retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Thin query wrapper that includes retry logic for transient errors.
 */
async function query(text, params) {
  return withRetry(async () => {
    return await pool.query(text, params);
  });
}

/**
 * Executes a callback within a managed database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and releases the client.
 */
async function withTransaction(callback) {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });
}

/**
 * Gracefully drain and close the connection pool.
 */
async function closePool() {
  try {
    await pool.end();
    console.log('✅  [DB] Connection pool closed gracefully.');
  } catch (err) {
    console.error('⚠️   [DB] Error closing pool:', err.message);
  }
}

module.exports = { pool, query, withTransaction, closePool };

// server/src/config/db.js
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.dbUrl,
  ssl: true
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  Database connection error:', err.message);
  } else {
    console.log('✅  Connected to NeonDB (PostgreSQL)');
    release();
  }
});

module.exports = pool;

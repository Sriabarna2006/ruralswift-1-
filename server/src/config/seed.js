// server/src/config/seed.js
'use strict';

const { pool } = require('./db');
const createTables = require('./schema');

/**
 * Seed Structure (Without Demo Data)
 * 
 * As per Phase 5 requirements, this script initializes the database
 * with the correct table structures, indexes, and constraints, but
 * DOES NOT insert any demo products, users, or fake data.
 * 
 * If fundamental system data (like system roles or static config tables) 
 * are needed in the future, they would be inserted here.
 */
async function seedStructure() {
  console.log('🌱 Starting Database Seeding (Structure Only)...');
  
  try {
    // 1. Run migrations to ensure schema exists
    await createTables();
    
    // 2. Clear out any existing demo/dummy data if present 
    // (TRUNCATE is dangerous in prod, so we only use this script for fresh setups)
    const client = await pool.connect();
    try {
      console.log('🧹 Ensuring database is clean of demo data...');
      // Cascade truncate the core tables to reset the environment
      await client.query(`
        TRUNCATE TABLE 
          users, 
          products, 
          orders, 
          coupons
        RESTART IDENTITY CASCADE;
      `);
      console.log('✅ Database is clean. No demo data exists.');
    } finally {
      client.release();
    }

    console.log('🚀 Seed Structure Complete. Database is ready for production use.');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    // Gracefully shut down the connection pool so the script exits
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  seedStructure();
}

module.exports = seedStructure;

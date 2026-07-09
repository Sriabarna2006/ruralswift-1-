require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fixTable() {
  try {
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS total NUMERIC(10,2) DEFAULT 0`);
    console.log("✅ Added missing 'total' column to orders table.");
    // Let's also check if 'items' or any other columns are missing just in case
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(30) DEFAULT 'pending'`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'cod'`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) DEFAULT ''`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}
fixTable();

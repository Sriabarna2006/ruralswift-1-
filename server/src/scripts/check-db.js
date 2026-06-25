// server/src/scripts/check-db.js
const { Pool } = require('pg');
const env = require('../config/env');
const pool = new Pool({ connectionString: env.dbUrl, ssl: true });

async function check() {
  try {
    const tables = ['users', 'orders', 'order_items', 'products', 'categories', 'cart', 'feedback', 'admin', 'delivery_partner', 'delivery_tracking'];
    for (const table of tables) {
      const r = await pool.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position`,
        [table]
      );
      if (r.rows.length > 0) {
        console.log(`\n── ${table} ──`);
        r.rows.forEach(c => console.log(`   ${c.column_name}  (${c.data_type})`));
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
}
check();

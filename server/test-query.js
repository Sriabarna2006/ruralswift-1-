require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
  try {
    const { rows } = await pool.query(
      `SELECT o.order_id, o.status, o.total, o.payment_status, o.payment_method,
              o.delivery_address, o.tracking_number, o.delivered_at, o.created_at,
              json_agg(json_build_object(
                'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'name', p.name, 'image_url', p.image_url
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE o.user_id = $1
       GROUP BY o.order_id
       ORDER BY o.created_at DESC
       LIMIT $2 OFFSET $3`,
      [7, 10, 0]
    );
    console.log(rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    pool.end();
  }
}
test();

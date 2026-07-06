// server/src/services/seller.service.js
'use strict';

const { pool } = require('../config/db');

class SellerService {
  async registerSeller(userId, data) {
    const { business_name, gst_number, pan_number, business_address } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO seller_profiles (user_id, business_name, gst_number, pan_number, business_address)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE
           SET business_name    = EXCLUDED.business_name,
               gst_number       = EXCLUDED.gst_number,
               pan_number       = EXCLUDED.pan_number,
               business_address = EXCLUDED.business_address,
               updated_at       = NOW()
         RETURNING *`,
        [userId, business_name, gst_number || '', pan_number || '', business_address || '']
      );

      await client.query(
        `UPDATE users SET role = 'seller', updated_at = NOW() WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getProfile(userId) {
    const { rows } = await pool.query(
      `SELECT sp.*, u.name, u.email, u.phone
       FROM seller_profiles sp
       JOIN users u ON u.user_id = sp.user_id
       WHERE sp.user_id = $1`,
      [userId]
    );
    return rows[0];
  }

  async getDashboard(sellerId) {
    const [productsRes, ordersRes, revenueRes, lowStockRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND is_active = TRUE`, [sellerId]),
      pool.query(
        `SELECT COUNT(*) as count FROM orders o
         JOIN order_items oi ON oi.order_id = o.order_id
         JOIN products p ON p.product_id = oi.product_id
         WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled')`, [sellerId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total
         FROM order_items oi
         JOIN products p ON p.product_id = oi.product_id
         JOIN orders o ON o.order_id = oi.order_id
         WHERE p.seller_id = $1 AND o.status = 'delivered'`, [sellerId]
      ),
      pool.query(`SELECT COUNT(*) as count FROM products WHERE seller_id = $1 AND is_active = TRUE AND stock < 10`, [sellerId])
    ]);

    return {
      totalProducts: parseInt(productsRes.rows[0].count),
      totalOrders:   parseInt(ordersRes.rows[0].count),
      totalRevenue:  parseFloat(revenueRes.rows[0].total),
      lowStockCount: parseInt(lowStockRes.rows[0].count)
    };
  }

  async getProducts(sellerId, search, page, limit) {
    const values = [sellerId];
    let where = `WHERE p.seller_id = $1 AND p.is_active = TRUE`;
    let idx = 2;

    if (search) {
      where += ` AND (p.name ILIKE $${idx} OR p.category ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    values.push(parseInt(limit), offset);

    const { rows } = await pool.query(
      `SELECT * FROM products p ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );
    return rows;
  }

  async addProduct(sellerId, data) {
    const { name, description, price, mrp, stock, unit, category, brand, weight_grams, image_url, images } = data;
    const { rows } = await pool.query(
      `INSERT INTO products
         (seller_id, name, description, price, mrp, stock, unit, category, brand, weight_grams, image_url, images, is_active, is_approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, TRUE, TRUE)
       RETURNING *`,
      [
        sellerId, name, description || '', parseFloat(price),
        parseFloat(mrp || price), parseInt(stock || 0),
        unit || 'piece', category || '', brand || '',
        parseInt(weight_grams || 0), image_url || '',
        Array.isArray(images) ? images : (image_url ? [image_url] : [])
      ]
    );
    return rows[0];
  }

  async updateProduct(sellerId, productId, data) {
    const { name, description, price, mrp, stock, unit, category, brand, weight_grams, image_url } = data;
    const { rows: existing } = await pool.query(
      `SELECT * FROM products WHERE product_id = $1 AND seller_id = $2`,
      [productId, sellerId]
    );
    
    if (!existing[0]) return null;

    const { rows } = await pool.query(
      `UPDATE products SET
         name=$1, description=$2, price=$3, mrp=$4, stock=$5, unit=$6,
         category=$7, brand=$8, weight_grams=$9, image_url=$10, updated_at=NOW()
       WHERE product_id=$11 AND seller_id=$12
       RETURNING *`,
      [
        name || existing[0].name,
        description !== undefined ? description : existing[0].description,
        price !== undefined ? parseFloat(price) : existing[0].price,
        mrp !== undefined ? parseFloat(mrp) : existing[0].mrp,
        stock !== undefined ? parseInt(stock) : existing[0].stock,
        unit || existing[0].unit,
        category || existing[0].category,
        brand || existing[0].brand,
        weight_grams !== undefined ? parseInt(weight_grams) : existing[0].weight_grams,
        image_url !== undefined ? image_url : existing[0].image_url,
        productId, sellerId
      ]
    );
    return rows[0];
  }

  async deleteProduct(sellerId, productId) {
    const { rows } = await pool.query(
      `UPDATE products SET is_active = FALSE, updated_at = NOW()
       WHERE product_id = $1 AND seller_id = $2
       RETURNING product_id`,
      [productId, sellerId]
    );
    return rows[0] ? true : false;
  }

  async getOrders(sellerId, status, page, limit) {
    const values = [sellerId];
    const conditions = [`p.seller_id = $1`];
    let idx = 2;

    if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    values.push(parseInt(limit), offset);

    const { rows } = await pool.query(
      `SELECT DISTINCT o.order_id, o.status, o.total, o.delivery_address, o.created_at,
              u.name AS customer_name, u.phone AS customer_phone
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.order_id
       JOIN products p ON p.product_id = oi.product_id
       JOIN users u ON u.user_id = o.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );
    return rows;
  }

  async updateOrderStatus(orderId, status, trackingNumber) {
    const sets = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let idx = 2;

    if (trackingNumber) { sets.push(`tracking_number = $${idx++}`); values.push(trackingNumber); }
    if (status === 'delivered') sets.push(`delivered_at = NOW()`);

    values.push(orderId);
    const { rows } = await pool.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE order_id = $${idx} RETURNING *`,
      values
    );
    return rows[0];
  }
}

module.exports = new SellerService();

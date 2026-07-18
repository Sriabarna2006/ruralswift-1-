// server/src/repositories/seller.repository.js
'use strict';

const { pool } = require('../config/db');
const logger   = require('../utils/logger');

class SellerRepository {

  /** Upsert a seller profile and upgrade the user role to 'seller' (transactional) */
  async upsertProfile(userId, { business_name, gst_number, pan_number, business_address }) {
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
    } catch (err) {
      await client.query('ROLLBACK');
      logger.dbError('SellerRepository.upsertProfile', err, { userId });
      throw err;
    } finally {
      client.release();
    }
  }

  /** Get a seller's profile joined with user info */
  async findProfileByUserId(userId) {
    try {
      const { rows } = await pool.query(
        `SELECT sp.*, u.name, u.email, u.phone
         FROM seller_profiles sp
         JOIN users u ON u.user_id = sp.user_id
         WHERE sp.user_id = $1
         LIMIT 1`,
        [userId]
      );
      return rows[0] || null;
    } catch (err) {
      logger.dbError('SellerRepository.findProfileByUserId', err, { userId });
      throw err;
    }
  }

  /** Aggregate dashboard stats for a seller */
  async getDashboardStats(sellerId) {
    try {
      const [productsRes, ordersRes, revenueRes, lowStockRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*) AS count FROM products WHERE seller_id = $1 AND is_active = TRUE`,
          [sellerId]
        ),
        pool.query(
          `SELECT COUNT(DISTINCT o.order_id) AS count
           FROM orders o
           JOIN order_items oi ON oi.order_id = o.order_id
           JOIN products p ON p.product_id = oi.product_id
           WHERE p.seller_id = $1 AND o.status NOT IN ('cancelled')`,
          [sellerId]
        ),
        pool.query(
          `SELECT COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total
           FROM order_items oi
           JOIN products p ON p.product_id = oi.product_id
           JOIN orders o   ON o.order_id   = oi.order_id
           WHERE p.seller_id = $1 AND o.status = 'delivered'`,
          [sellerId]
        ),
        pool.query(
          `SELECT COUNT(*) AS count
           FROM products
           WHERE seller_id = $1 AND is_active = TRUE AND stock < 10`,
          [sellerId]
        ),
      ]);
      return {
        totalProducts: parseInt(productsRes.rows[0].count),
        totalOrders:   parseInt(ordersRes.rows[0].count),
        totalRevenue:  parseFloat(revenueRes.rows[0].total),
        lowStockCount: parseInt(lowStockRes.rows[0].count),
      };
    } catch (err) {
      logger.dbError('SellerRepository.getDashboardStats', err, { sellerId });
      throw err;
    }
  }

  /** List products belonging to a seller (with optional search + pagination) */
  async findProductsBySeller(sellerId, { search, page = 1, limit = 20 } = {}) {
    try {
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
    } catch (err) {
      logger.dbError('SellerRepository.findProductsBySeller', err, { sellerId });
      throw err;
    }
  }

  /** Insert a new product for a seller */
  async createProduct(sellerId, data) {
    const {
      name, description, price, mrp, stock, unit,
      category, brand, weight_grams, image_url, images,
    } = data;
    try {
      const { rows } = await pool.query(
        `INSERT INTO products
           (seller_id, name, description, price, mrp, stock, unit,
            category, brand, weight_grams, image_url, images, is_active, is_approved)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, TRUE, TRUE)
         RETURNING *`,
        [
          sellerId, name, description || '',
          parseFloat(price), parseFloat(mrp || price),
          parseInt(stock || 0), unit || 'piece',
          category || '', brand || '',
          parseInt(weight_grams || 0), image_url || '',
          Array.isArray(images) ? images : (image_url ? [image_url] : []),
        ]
      );
      return rows[0];
    } catch (err) {
      logger.dbError('SellerRepository.createProduct', err, { sellerId });
      throw err;
    }
  }

  /** Update a seller's own product */
  async updateProduct(sellerId, productId, data) {
    try {
      const { rows: existing } = await pool.query(
        `SELECT * FROM products WHERE product_id = $1 AND seller_id = $2`,
        [productId, sellerId]
      );
      if (!existing[0]) return null;

      const e = existing[0];
      const { rows } = await pool.query(
        `UPDATE products SET
           name=$1, description=$2, price=$3, mrp=$4, stock=$5, unit=$6,
           category=$7, brand=$8, weight_grams=$9, image_url=$10, updated_at=NOW()
         WHERE product_id=$11 AND seller_id=$12
         RETURNING *`,
        [
          data.name        ?? e.name,
          data.description ?? e.description,
          data.price       !== undefined ? parseFloat(data.price)        : e.price,
          data.mrp         !== undefined ? parseFloat(data.mrp)          : e.mrp,
          data.stock       !== undefined ? parseInt(data.stock)          : e.stock,
          data.unit        ?? e.unit,
          data.category    ?? e.category,
          data.brand       ?? e.brand,
          data.weight_grams !== undefined ? parseInt(data.weight_grams)  : e.weight_grams,
          data.image_url   ?? e.image_url,
          productId, sellerId,
        ]
      );
      return rows[0];
    } catch (err) {
      logger.dbError('SellerRepository.updateProduct', err, { sellerId, productId });
      throw err;
    }
  }

  /** Soft-delete a seller's product */
  async softDeleteProduct(sellerId, productId) {
    try {
      const { rows } = await pool.query(
        `UPDATE products SET is_active = FALSE, updated_at = NOW()
         WHERE product_id = $1 AND seller_id = $2
         RETURNING product_id`,
        [productId, sellerId]
      );
      return !!rows[0];
    } catch (err) {
      logger.dbError('SellerRepository.softDeleteProduct', err, { sellerId, productId });
      throw err;
    }
  }

  /** List orders that contain the seller's products */
  async findOrdersBySeller(sellerId, { status, page = 1, limit = 20 } = {}) {
    try {
      const values = [sellerId];
      const conditions = [`p.seller_id = $1`];
      let idx = 2;

      if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }
      const offset = (parseInt(page) - 1) * parseInt(limit);
      values.push(parseInt(limit), offset);

      const { rows } = await pool.query(
        `SELECT o.order_id, o.status, o.total, o.delivery_address,
                o.tracking_number, o.created_at,
                u.name AS customer_name, u.phone AS customer_phone,
                bool_or(p.category = 'Medicine & Health') AS has_medicine
         FROM orders o
         JOIN order_items oi ON oi.order_id   = o.order_id
         JOIN products p     ON p.product_id  = oi.product_id
         JOIN users u        ON u.user_id     = o.user_id
         WHERE ${conditions.join(' AND ')}
         GROUP BY o.order_id, u.name, u.phone
         ORDER BY o.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        values
      );
      return rows;
    } catch (err) {
      logger.dbError('SellerRepository.findOrdersBySeller', err, { sellerId });
      throw err;
    }
  }

  /** Update status + optional tracking number on an order */
  async updateOrderStatus(orderId, status, trackingNumber) {
    const validStatuses = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) throw new Error(`Invalid order status: ${status}`);

    const sets   = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let idx = 2;

    if (trackingNumber) { sets.push(`tracking_number = $${idx++}`); values.push(trackingNumber); }
    if (status === 'delivered') {
      sets.push(`delivered_at = NOW()`);
      sets.push(`payment_status = 'paid'`);
    }
    if (status === 'cancelled') sets.push(`cancelled_at = NOW()`);

    values.push(orderId);
    try {
      const { rows } = await pool.query(
        `UPDATE orders SET ${sets.join(', ')} WHERE order_id = $${idx} RETURNING *`,
        values
      );
      return rows[0] || null;
    } catch (err) {
      logger.dbError('SellerRepository.updateOrderStatus', err, { orderId });
      throw err;
    }
  }
}

module.exports = new SellerRepository();

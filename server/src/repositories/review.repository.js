// server/src/repositories/review.repository.js
'use strict';

const { query } = require('../config/db');
const logger    = require('../utils/logger');

class ReviewRepository {

  /** Get paginated reviews for a product, newest first */
  async findByProduct(productId, { page = 1, limit = 10 } = {}) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    try {
      const result = await query(
        `SELECT r.id, r.rating, r.title, r.body, r.is_verified,
                r.created_at, r.updated_at,
                u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
         FROM reviews r
         JOIN users u ON u.user_id = r.user_id
         WHERE r.product_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [productId, parseInt(limit), offset]
      );
      return result.rows;
    } catch (err) {
      logger.dbError('ReviewRepository.findByProduct', err, { productId });
      throw err;
    }
  }

  /** Get aggregate stats (avg rating, count) for a product */
  async getStats(productId) {
    try {
      const result = await query(
        `SELECT
           COUNT(*)::int                    AS review_count,
           ROUND(AVG(rating)::numeric, 2)   AS avg_rating,
           COUNT(*) FILTER (WHERE rating = 5)::int AS five_star,
           COUNT(*) FILTER (WHERE rating = 4)::int AS four_star,
           COUNT(*) FILTER (WHERE rating = 3)::int AS three_star,
           COUNT(*) FILTER (WHERE rating = 2)::int AS two_star,
           COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
         FROM reviews
         WHERE product_id = $1`,
        [productId]
      );
      return result.rows[0];
    } catch (err) {
      logger.dbError('ReviewRepository.getStats', err, { productId });
      throw err;
    }
  }

  /** Check if a user already reviewed this product */
  async findByUserAndProduct(userId, productId) {
    try {
      const result = await query(
        `SELECT id FROM reviews WHERE user_id = $1 AND product_id = $2 LIMIT 1`,
        [userId, productId]
      );
      return result.rows[0] || null;
    } catch (err) {
      logger.dbError('ReviewRepository.findByUserAndProduct', err, { userId, productId });
      throw err;
    }
  }

  /** Check if a user has a delivered order containing the product (for is_verified flag) */
  async hasDeliveredOrder(userId, productId) {
    try {
      const result = await query(
        `SELECT 1
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.order_id
         WHERE o.user_id = $1
           AND oi.product_id = $2
           AND o.status = 'delivered'
         LIMIT 1`,
        [userId, productId]
      );
      return !!result.rows[0];
    } catch (err) {
      logger.dbError('ReviewRepository.hasDeliveredOrder', err, { userId, productId });
      throw err;
    }
  }

  /** Insert a new review and update the product's aggregate rating */
  async create(userId, productId, { rating, title, body, order_id, is_verified }) {
    const client = require('../config/db').pool
      ? require('../config/db').pool
      : null;

    // Use a transaction to keep product rating in sync
    const { pool } = require('../config/db');
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      const { rows } = await conn.query(
        `INSERT INTO reviews (user_id, product_id, order_id, rating, title, body, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [userId, productId, order_id || null, rating, title || '', body || '', !!is_verified]
      );

      // Keep products.rating and products.review_count in sync
      await conn.query(
        `UPDATE products
         SET rating       = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1),
             review_count = (SELECT COUNT(*)                        FROM reviews WHERE product_id = $1),
             updated_at   = NOW()
         WHERE product_id = $1`,
        [productId]
      );

      await conn.query('COMMIT');
      return rows[0];
    } catch (err) {
      await conn.query('ROLLBACK');
      logger.dbError('ReviewRepository.create', err, { userId, productId });
      throw err;
    } finally {
      conn.release();
    }
  }

  /** Soft-delete a review (only owner can delete their own review) */
  async deleteByIdAndUser(reviewId, userId) {
    try {
      const { pool } = require('../config/db');
      const conn = await pool.connect();
      try {
        await conn.query('BEGIN');

        const { rows } = await conn.query(
          `DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING product_id`,
          [reviewId, userId]
        );
        if (!rows[0]) { await conn.query('ROLLBACK'); return false; }

        // Re-sync product aggregate after delete
        await conn.query(
          `UPDATE products
           SET rating       = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1), 0),
               review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1),
               updated_at   = NOW()
           WHERE product_id = $1`,
          [rows[0].product_id]
        );

        await conn.query('COMMIT');
        return true;
      } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
      } finally {
        conn.release();
      }
    } catch (err) {
      logger.dbError('ReviewRepository.deleteByIdAndUser', err, { reviewId, userId });
      throw err;
    }
  }
}

module.exports = new ReviewRepository();

// server/src/repositories/cart.repository.js
'use strict';

const { pool } = require('../config/db');

class CartRepository {

  async getCart(userId) {
    const { rows } = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.added_at,
              p.name, p.price, p.mrp, p.image_url, p.stock, p.unit, p.is_active
       FROM cart_items ci
       JOIN products p ON p.product_id = ci.product_id
       WHERE ci.user_id = $1
       ORDER BY ci.added_at DESC`,
      [userId]
    );
    return rows;
  }

  async addItem(userId, productId, quantity = 1) {
    const { rows } = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, added_at = NOW()
       RETURNING *`,
      [userId, productId, quantity]
    );
    return rows[0];
  }

  async updateQuantity(userId, productId, quantity) {
    if (quantity <= 0) return this.removeItem(userId, productId);
    const { rows } = await pool.query(
      `UPDATE cart_items SET quantity = $1
       WHERE user_id = $2 AND product_id = $3
       RETURNING *`,
      [quantity, userId, productId]
    );
    return rows[0] || null;
  }

  async removeItem(userId, productId) {
    const { rows } = await pool.query(
      `DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2 RETURNING id`,
      [userId, productId]
    );
    return rows[0] || null;
  }

  async clearCart(userId) {
    await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
  }

  async getItemCount(userId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE user_id = $1`,
      [userId]
    );
    return parseInt(rows[0].count, 10);
  }
}

module.exports = new CartRepository();

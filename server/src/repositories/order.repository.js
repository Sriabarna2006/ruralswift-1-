// server/src/repositories/order.repository.js
'use strict';

const { pool } = require('../config/db');

class OrderRepository {

  async findByUser(userId, { status, page = 1, limit = 10 } = {}) {
    const values = [userId];
    let conditions = [`o.user_id = $1`];
    let idx = 2;

    if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT o.order_id, o.status, o.total, o.payment_status, o.payment_method,
              o.delivery_address, o.tracking_number, o.delivery_otp, o.delivered_at, o.created_at,
              json_agg(json_build_object(
                'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'name', p.name, 'image_url', p.image_url
              )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY o.order_id
       ORDER BY o.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );
    return rows;
  }

  async findById(orderId, userId = null) {
    const cond = userId ? `o.order_id = $1 AND o.user_id = $2` : `o.order_id = $1`;
    const values = userId ? [orderId, userId] : [orderId];

    const { rows } = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
              json_agg(json_build_object(
                'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'name', p.name, 'image_url', p.image_url
              )) AS items
       FROM orders o
       LEFT JOIN users u ON u.user_id = o.user_id
       LEFT JOIN order_items oi ON oi.order_id = o.order_id
       LEFT JOIN products p ON p.product_id = oi.product_id
       WHERE ${cond}
       GROUP BY o.order_id, u.name, u.email, u.phone`,
      values
    );
    return rows[0] || null;
  }

  /**
   * Create an order inside a transaction.
   * Decrements product stock and clears the cart atomically.
   */
  async createOrder(userId, { deliveryAddress, paymentMethod = 'cod', notes = '', items }) {
    const { withTransaction } = require('../config/db');
    return withTransaction(async (client) => {
      // Compute total & verify stock
      let total = 0;
      for (const item of items) {
        const { rows } = await client.query(
          `SELECT price, stock FROM products WHERE product_id = $1 AND is_active = TRUE FOR UPDATE`,
          [item.product_id]
        );
        if (!rows[0]) throw new Error(`Product ${item.product_id} not found.`);
        if (rows[0].stock < item.quantity) throw new Error(`Insufficient stock for product ${item.product_id}.`);
        item._price = parseFloat(rows[0].price);
        total += item._price * item.quantity;
      }

      // Insert order
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const { rows: [order] } = await client.query(
        `INSERT INTO orders (user_id, total, delivery_address, payment_method, notes, status, payment_status, delivery_otp)
         VALUES ($1, $2, $3, $4, $5, 'pending', 'pending', $6)
         RETURNING *`,
        [userId, total.toFixed(2), deliveryAddress, paymentMethod, notes, otp]
      );

      // Insert order items + decrement stock
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
          [order.order_id, item.product_id, item.quantity, item._price]
        );
        await client.query(
          `UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Clear the user's cart automatically inside the same transaction
      await client.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);

      return order;
    });
  }

  async updateStatus(orderId, status, extra = {}) {
    const validStatuses = ['pending','confirmed','packed','shipped','out_for_delivery','delivered','cancelled'];
    if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

    const sets = ['status = $1', 'updated_at = NOW()'];
    const values = [status];
    let idx = 2;

    if (extra.trackingNumber) { sets.push(`tracking_number = $${idx++}`); values.push(extra.trackingNumber); }
    if (extra.deliveryOtp) { sets.push(`delivery_otp = $${idx++}`); values.push(extra.deliveryOtp); }
    if (status === 'delivered') { sets.push(`delivered_at = NOW()`); }

    values.push(orderId);
    const { rows } = await pool.query(
      `UPDATE orders SET ${sets.join(', ')} WHERE order_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  }
  /**
   * Cancel an order — only allowed when status is 'pending' or 'confirmed'.
   * Restores product stock atomically inside a transaction.
   */
  async cancelOrder(orderId, userId) {
    const { withTransaction } = require('../config/db');
    return withTransaction(async (client) => {
      // Lock the order row and verify ownership + cancellable status
      const { rows: [order] } = await client.query(
        `SELECT order_id, status, user_id FROM orders
         WHERE order_id = $1 AND user_id = $2
         FOR UPDATE`,
        [orderId, userId]
      );
      if (!order) throw new Error('Order not found.');
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error(`Cannot cancel order with status '${order.status}'.`);
      }

      // Restore stock for each item
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM order_items WHERE order_id = $1`,
        [orderId]
      );
      for (const item of items) {
        await client.query(
          `UPDATE products SET stock = stock + $1, updated_at = NOW() WHERE product_id = $2`,
          [item.quantity, item.product_id]
        );
      }

      // Mark order cancelled
      const { rows: [updated] } = await client.query(
        `UPDATE orders
         SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
         WHERE order_id = $1
         RETURNING *`,
        [orderId]
      );

      return updated;
    });
  }

  /** Find an order by tracking number (public guest tracking — no userId check) */
  async findByTrackingNumber(trackingNumber) {
    const { rows } = await pool.query(
      `SELECT o.order_id, o.status, o.total, o.delivery_address,
              o.tracking_number, o.payment_method, o.created_at, o.delivered_at,
              o.cancelled_at, o.updated_at, o.delivery_otp,
              json_agg(json_build_object(
                'product_id', oi.product_id, 'quantity', oi.quantity,
                'unit_price', oi.unit_price, 'name', p.name, 'image_url', p.image_url
               )) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id   = o.order_id
       LEFT JOIN products p     ON p.product_id  = oi.product_id
       WHERE o.tracking_number = $1 OR o.order_id::text = $1
       GROUP BY o.order_id
       LIMIT 1`,
      [trackingNumber]
    );
    return rows[0] || null;
  }
}

module.exports = new OrderRepository();

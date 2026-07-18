// server/src/services/order.service.js
'use strict';

const orderRepo = require('../repositories/order.repository');
const cartRepo  = require('../repositories/cart.repository');

class OrderService {

  async getUserOrders(userId, { status, page, limit } = {}) {
    return orderRepo.findByUser(userId, { status, page, limit });
  }

  async getOrder(orderId, userId) {
    const order = await orderRepo.findById(orderId, userId);
    if (!order) throw new Error('Order not found.');
    return order;
  }

  async placeOrder(userId, { deliveryAddress, paymentMethod, notes, items }) {
    if (!deliveryAddress || !deliveryAddress.trim()) throw new Error('Delivery address is required.');
    if (!items || !items.length) throw new Error('Order must contain at least one item.');

    const order = await orderRepo.createOrder(userId, { deliveryAddress, paymentMethod, notes, items });
    return order;
  }

  async updateOrderStatus(orderId, status, extra = {}) {
    if (status === 'delivered') {
      const order = await orderRepo.findById(orderId);
      if (!order) throw new Error('Order not found.');
      if (order.delivery_otp && extra.deliveryOtp !== order.delivery_otp) {
        throw new Error('Invalid Delivery OTP.');
      }
    }
    const order = await orderRepo.updateStatus(orderId, status, extra);
    if (!order) throw new Error('Order not found.');

    // ── Auto-complete the run when ALL its orders are delivered ──────────
    if (status === 'delivered' && order.delivery_run_id) {
      const { pool } = require('../config/db');
      const { rows } = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status != 'delivered') AS remaining
         FROM orders WHERE delivery_run_id = $1`,
        [order.delivery_run_id]
      );
      const remaining = parseInt(rows[0]?.remaining || '1');
      if (remaining === 0) {
        await pool.query(
          `UPDATE delivery_runs SET status = 'completed', end_time = NOW() WHERE id = $1`,
          [order.delivery_run_id]
        );
      }
    }

    return order;
  }

  async cancelOrder(orderId, userId) {
    return orderRepo.cancelOrder(orderId, userId);
  }

  async getOrderByTracking(trackingNumber) {
    if (!trackingNumber || !trackingNumber.trim()) {
      throw new Error('Tracking number is required.');
    }
    const order = await orderRepo.findByTrackingNumber(trackingNumber.trim().toUpperCase());
    if (!order) throw new Error('No order found with this tracking number.');
    // Strip internal user details for public response
    const { user_id, ...publicOrder } = order;
    return publicOrder;
  }
}

module.exports = new OrderService();

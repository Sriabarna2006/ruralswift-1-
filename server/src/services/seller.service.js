// server/src/services/seller.service.js
'use strict';

const sellerRepository = require('../repositories/seller.repository');
const logger           = require('../utils/logger');

class SellerService {

  async registerSeller(userId, data) {
    const { business_name, gst_number, pan_number, business_address } = data;
    if (!business_name || String(business_name).trim() === '') {
      throw new Error('Business name is required.');
    }
    const profile = await sellerRepository.upsertProfile(userId, {
      business_name: String(business_name).trim(),
      gst_number:    gst_number    || '',
      pan_number:    pan_number    || '',
      business_address: business_address || '',
    });
    logger.info('Seller registered', { userId });
    return profile;
  }

  async getProfile(userId) {
    const profile = await sellerRepository.findProfileByUserId(userId);
    if (!profile) throw new Error('Seller profile not found.');
    return profile;
  }

  async getDashboard(sellerId) {
    return sellerRepository.getDashboardStats(sellerId);
  }

  async getProducts(sellerId, search, page = 1, limit = 20) {
    return sellerRepository.findProductsBySeller(sellerId, { search, page, limit });
  }

  async addProduct(sellerId, data) {
    if (!data.name  || String(data.name).trim()  === '') throw new Error('Product name is required.');
    if (!data.price || isNaN(parseFloat(data.price)))   throw new Error('Valid price is required.');
    return sellerRepository.createProduct(sellerId, data);
  }

  async updateProduct(sellerId, productId, data) {
    const updated = await sellerRepository.updateProduct(sellerId, productId, data);
    if (!updated) throw new Error('Product not found or access denied.');
    return updated;
  }

  async deleteProduct(sellerId, productId) {
    const deleted = await sellerRepository.softDeleteProduct(sellerId, productId);
    if (!deleted) throw new Error('Product not found or access denied.');
    return true;
  }

  async getOrders(sellerId, status, page = 1, limit = 20) {
    return sellerRepository.findOrdersBySeller(sellerId, { status, page, limit });
  }

  /**
   * Update the status of an order.
   * @param {number} orderId
   * @param {string} status
   * @param {{ trackingNumber?: string, deliveryOtp?: string }} [options]
   */
  async updateOrderStatus(orderId, status, options = {}) {
    const { trackingNumber, deliveryOtp } = typeof options === 'object' ? options : { trackingNumber: options };

    // If marking as delivered, validate OTP if one is set on the order
    if (status === 'delivered') {
      const { pool } = require('../config/db');
      const { rows } = await pool.query(
        `SELECT delivery_otp FROM orders WHERE order_id = $1`,
        [orderId]
      );
      const order = rows[0];
      if (!order) throw new Error('Order not found.');
      if (order.delivery_otp && deliveryOtp !== order.delivery_otp) {
        throw new Error('Invalid Delivery OTP.');
      }
    }

    const updated = await sellerRepository.updateOrderStatus(orderId, status, trackingNumber);
    if (!updated) throw new Error('Order not found.');
    return updated;
  }

  /** Fetch all active delivery drivers, formatted for the frontend dropdown */
  async getDrivers() {
    const { pool } = require('../config/db');
    const { rows } = await pool.query(
      `SELECT user_id, name, email, phone
       FROM users
       WHERE role = 'delivery'
       ORDER BY name ASC`
    );
    return rows.map(u => {
      const parts = (u.name || '').trim().split(/\s+/);
      return {
        user_id:    u.user_id,
        name:       u.name || '',
        first_name: parts[0] || '',
        last_name:  parts.length > 1 ? parts.slice(1).join(' ') : '',
        email:      u.email || '',
        phone:      u.phone || '',
      };
    });
  }
}

module.exports = new SellerService();

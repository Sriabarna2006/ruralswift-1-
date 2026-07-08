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

  async updateOrderStatus(orderId, status, trackingNumber) {
    const updated = await sellerRepository.updateOrderStatus(orderId, status, trackingNumber);
    if (!updated) throw new Error('Order not found.');
    return updated;
  }
}

module.exports = new SellerService();

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
    // Clear the cart after successful order
    await cartRepo.clearCart(userId);
    return order;
  }

  async updateOrderStatus(orderId, status, extra = {}) {
    const order = await orderRepo.updateStatus(orderId, status, extra);
    if (!order) throw new Error('Order not found.');
    return order;
  }
}

module.exports = new OrderService();

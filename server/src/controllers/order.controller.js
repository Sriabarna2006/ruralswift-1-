// server/src/controllers/order.controller.js
'use strict';

const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../utils/response');

class OrderController {

  async getUserOrders(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const orders = await orderService.getUserOrders(req.user.id, { status, page: parseInt(page), limit: parseInt(limit) });
      return sendSuccess(res, 200, 'Orders fetched.', { orders });
    } catch (err) { next(err); }
  }

  async getOrder(req, res, next) {
    try {
      const order = await orderService.getOrder(parseInt(req.params.id), req.user.id);
      return sendSuccess(res, 200, 'Order fetched.', { order });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      next(err);
    }
  }

  async placeOrder(req, res, next) {
    try {
      const { deliveryAddress, paymentMethod, notes, items } = req.body;
      const order = await orderService.placeOrder(req.user.id, { deliveryAddress, paymentMethod, notes, items });
      return sendSuccess(res, 201, 'Order placed successfully.', { order });
    } catch (err) {
      if (err.message.includes('required') || err.message.includes('must contain'))
        return sendError(res, 400, err.message, 'VALIDATION_ERROR');
      if (err.message.includes('not found') || err.message.includes('Insufficient'))
        return sendError(res, 400, err.message, 'STOCK_ERROR');
      next(err);
    }
  }

  /** Admin / Seller — update order status */
  async updateStatus(req, res, next) {
    try {
      const { status, trackingNumber } = req.body;
      if (!status) return sendError(res, 400, 'status is required.', 'VALIDATION_ERROR');
      const order = await orderService.updateOrderStatus(parseInt(req.params.id), status, { trackingNumber });
      return sendSuccess(res, 200, 'Order status updated.', { order });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      if (err.message.includes('Invalid status')) return sendError(res, 400, err.message, 'VALIDATION_ERROR');
      next(err);
    }
  }
}

module.exports = new OrderController();

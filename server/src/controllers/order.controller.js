// server/src/controllers/order.controller.js
'use strict';

const orderService = require('../services/order.service');
const { sendSuccess, sendError } = require('../utils/response');

class OrderController {

  async getUserOrders(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const orders = await orderService.getUserOrders(req.user.id, { status, page: parseInt(page), limit: parseInt(limit) });
      return sendSuccess(res, 200, 'Orders fetched.', { data: { orders } });
    } catch (err) { next(err); }
  }

  async getOrder(req, res, next) {
    try {
      const order = await orderService.getOrder(parseInt(req.params.id), req.user.id);
      return sendSuccess(res, 200, 'Order fetched.', { data: { order } });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      next(err);
    }
  }

  async placeOrder(req, res, next) {
    try {
      const { deliveryAddress, paymentMethod, notes, items } = req.body;
      const order = await orderService.placeOrder(req.user.id, { deliveryAddress, paymentMethod, notes, items });
      return sendSuccess(res, 201, 'Order placed successfully.', { data: { order } });
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
      return sendSuccess(res, 200, 'Order status updated.', { data: { order } });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      if (err.message.includes('Invalid status')) return sendError(res, 400, err.message, 'VALIDATION_ERROR');
      next(err);
    }
  }

  /**
   * POST /api/orders/:id/cancel
   * Allows the order owner to cancel while status is pending/confirmed.
   */
  async cancelOrder(req, res, next) {
    try {
      const orderId = parseInt(req.params.id);
      if (!orderId || isNaN(orderId)) {
        return sendError(res, 400, 'Invalid order ID.', 'VALIDATION_INVALID_ID');
      }
      const order = await orderService.cancelOrder(orderId, req.user.id);
      return sendSuccess(res, 200, 'Order cancelled successfully.', { data: { order } });
    } catch (err) {
      if (err.message.includes('not found'))        return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      if (err.message.includes('Cannot cancel'))    return sendError(res, 400, err.message, 'ORDER_CANCEL_NOT_ALLOWED');
      next(err);
    }
  }

  /**
   * GET /api/orders/track/:trackingNumber
   * Public guest tracking — no auth required.
   */
  async trackByNumber(req, res, next) {
    try {
      const { trackingNumber } = req.params;
      if (!trackingNumber || trackingNumber.trim() === '') {
        return sendError(res, 400, 'Tracking number is required.', 'VALIDATION_REQUIRED_FIELD');
      }
      const order = await orderService.getOrderByTracking(trackingNumber);
      return sendSuccess(res, 200, 'Order tracking info fetched.', { data: { order } });
    } catch (err) {
      if (err.message.includes('No order found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      next(err);
    }
  }
}

module.exports = new OrderController();

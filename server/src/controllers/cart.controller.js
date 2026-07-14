// server/src/controllers/cart.controller.js
'use strict';

const cartService = require('../services/cart.service');
const { sendSuccess, sendError } = require('../utils/response');

class CartController {

  async getCart(req, res, next) {
    try {
      const data = await cartService.getCart(req.user.id);
      return sendSuccess(res, 200, 'Cart fetched.', { data });
    } catch (err) { next(err); }
  }

  async addItem(req, res, next) {
    try {
      const { product_id, quantity = 1 } = req.body;
      if (!product_id) return sendError(res, 400, 'product_id is required.', 'VALIDATION_ERROR');
      const item = await cartService.addItem(req.user.id, parseInt(product_id), parseInt(quantity));
      return sendSuccess(res, 201, 'Item added to cart.', { data: { item } });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('unavailable'))
        return sendError(res, 404, err.message, 'PRODUCT_NOT_FOUND');
      if (err.message.includes('stock'))
        return sendError(res, 400, err.message, 'OUT_OF_STOCK');
      next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { quantity } = req.body;
      if (quantity === undefined) return sendError(res, 400, 'quantity is required.', 'VALIDATION_ERROR');
      const item = await cartService.updateQuantity(req.user.id, parseInt(req.params.productId), parseInt(quantity));
      return sendSuccess(res, 200, 'Cart updated.', { data: { item } });
    } catch (err) {
      if (err.message.includes('stock')) return sendError(res, 400, err.message, 'OUT_OF_STOCK');
      next(err);
    }
  }

  async removeItem(req, res, next) {
    try {
      await cartService.removeItem(req.user.id, parseInt(req.params.productId));
      return sendSuccess(res, 200, 'Item removed from cart.', {});
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'CART_ITEM_NOT_FOUND');
      next(err);
    }
  }

  async clearCart(req, res, next) {
    try {
      await cartService.clearCart(req.user.id);
      return sendSuccess(res, 200, 'Cart cleared.', {});
    } catch (err) { next(err); }
  }
}

module.exports = new CartController();

// server/src/services/cart.service.js
'use strict';

const cartRepo    = require('../repositories/cart.repository');
const productRepo = require('../repositories/product.repository');

class CartService {

  async getCart(userId) {
    const items = await cartRepo.getCart(userId);
    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    return { items, total: parseFloat(total.toFixed(2)), itemCount };
  }

  async addItem(userId, productId, quantity = 1) {
    if (!productId) throw new Error('productId is required.');
    if (quantity < 1) throw new Error('Quantity must be at least 1.');

    const product = await productRepo.findById(productId);
    if (!product) throw new Error('Product not found or is unavailable.');
    if (product.stock < quantity) throw new Error(`Only ${product.stock} items available in stock.`);

    return cartRepo.addItem(userId, productId, quantity);
  }

  async updateQuantity(userId, productId, quantity) {
    if (quantity < 0) throw new Error('Quantity cannot be negative.');
    if (quantity > 0) {
      const product = await productRepo.findById(productId);
      if (product && product.stock < quantity) throw new Error(`Only ${product.stock} items in stock.`);
    }
    return cartRepo.updateQuantity(userId, productId, quantity);
  }

  async removeItem(userId, productId) {
    const removed = await cartRepo.removeItem(userId, productId);
    if (!removed) throw new Error('Item not found in cart.');
    return removed;
  }

  async clearCart(userId) {
    await cartRepo.clearCart(userId);
  }
}

module.exports = new CartService();

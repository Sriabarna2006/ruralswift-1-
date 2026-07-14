// server/src/controllers/product.controller.js
'use strict';

const productService = require('../services/product.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class ProductController {

  /** GET /api/products */
  async list(req, res, next) {
    try {
      const { category, search, minPrice, maxPrice, page, limit } = req.query;
      const result = await productService.listProducts({
        category, search,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 20, 100),
        isApproved: true
      });
      return sendSuccess(res, 200, 'Products fetched.', { data: result });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/products/categories */
  async categories(req, res, next) {
    try {
      const categories = await productService.getCategories();
      return sendSuccess(res, 200, 'Categories fetched.', { data: { categories } });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/products/:id */
  async get(req, res, next) {
    try {
      const product = await productService.getProduct(parseInt(req.params.id));
      return sendSuccess(res, 200, 'Product fetched.', { data: { product } });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'PRODUCT_NOT_FOUND');
      next(err);
    }
  }

  /** POST /api/products (seller only) */
  async create(req, res, next) {
    try {
      const product = await productService.createProduct(req.user.id, req.body);
      return sendSuccess(res, 201, 'Product listed successfully and is now live!', { data: { product } });
    } catch (err) {
      if (err.message.includes('required')) return sendError(res, 400, err.message, 'VALIDATION_ERROR');
      next(err);
    }
  }

  /** PUT /api/products/:id (seller only) */
  async update(req, res, next) {
    try {
      const product = await productService.updateProduct(parseInt(req.params.id), req.user.id, req.body);
      return sendSuccess(res, 200, 'Product updated.', { data: { product } });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('permission'))
        return sendError(res, 404, err.message, 'PRODUCT_NOT_FOUND');
      next(err);
    }
  }

  /** DELETE /api/products/:id (seller only) */
  async remove(req, res, next) {
    try {
      await productService.deleteProduct(parseInt(req.params.id), req.user.id);
      return sendSuccess(res, 200, 'Product deleted.', {});
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('permission'))
        return sendError(res, 404, err.message, 'PRODUCT_NOT_FOUND');
      next(err);
    }
  }
}

module.exports = new ProductController();

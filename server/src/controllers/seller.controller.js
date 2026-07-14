// server/src/controllers/seller.controller.js
'use strict';

const sellerService = require('../services/seller.service');
const { sendSuccess, sendError } = require('../utils/response');

exports.registerSeller = async (req, res, next) => {
  try {
    if (!req.body.business_name) return sendError(res, 400, 'business_name is required.', 'VALIDATION_ERROR');
    const profile = await sellerService.registerSeller(req.user.id, req.body);
    sendSuccess(res, 201, 'Seller account registered successfully.', { data: { profile } });
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await sellerService.getProfile(req.user.id);
    if (!profile) return sendError(res, 404, 'Seller profile not found.', 'NOT_FOUND');
    sendSuccess(res, 200, 'Seller profile fetched.', { data: { profile } });
  } catch (err) { next(err); }
};

exports.getDashboard = async (req, res, next) => {
  try {
    const data = await sellerService.getDashboard(req.user.id);
    sendSuccess(res, 200, 'Dashboard data fetched.', { data });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const products = await sellerService.getProducts(req.user.id, search, page, limit);
    sendSuccess(res, 200, 'Seller products fetched.', { data: { products } });
  } catch (err) { next(err); }
};

exports.addProduct = async (req, res, next) => {
  try {
    if (!req.body.name) return sendError(res, 400, 'name is required.', 'VALIDATION_ERROR');
    if (!req.body.price) return sendError(res, 400, 'price is required.', 'VALIDATION_ERROR');
    
    const product = await sellerService.addProduct(req.user.id, req.body);
    sendSuccess(res, 201, 'Product listed successfully.', { data: { product } });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await sellerService.updateProduct(req.user.id, parseInt(req.params.id), req.body);
    if (!product) return sendError(res, 404, 'Product not found or not yours.', 'NOT_FOUND');
    sendSuccess(res, 200, 'Product updated.', { data: { product } });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const success = await sellerService.deleteProduct(req.user.id, parseInt(req.params.id));
    if (!success) return sendError(res, 404, 'Product not found or not yours.', 'NOT_FOUND');
    sendSuccess(res, 200, 'Product removed from listing.', { data: {} });
  } catch (err) { next(err); }
};

exports.getOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const orders = await sellerService.getOrders(req.user.id, status, page, limit);
    sendSuccess(res, 200, 'Seller orders fetched.', { data: { orders } });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber } = req.body;
    if (!status) return sendError(res, 400, 'status is required.', 'VALIDATION_ERROR');

    const validStatuses = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}.`, 'VALIDATION_ERROR');
    }

    const order = await sellerService.updateOrderStatus(parseInt(req.params.id), status, trackingNumber);
    if (!order) return sendError(res, 404, 'Order not found.', 'NOT_FOUND');
    
    sendSuccess(res, 200, 'Order status updated.', { data: { order } });
  } catch (err) { next(err); }
};

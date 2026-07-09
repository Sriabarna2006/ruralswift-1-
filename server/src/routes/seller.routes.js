// server/src/routes/seller.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller.controller');
const authenticateToken = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');

// All seller routes require authentication
router.use(authenticateToken);

// ── POST /api/seller/register — any logged-in user can register as a seller ──
router.post('/seller/register', sellerController.registerSeller);

// All routes below require the 'seller' role
router.use(requireRole('seller'));

// ── GET /api/seller/profile ──
router.get('/seller/profile', sellerController.getProfile);

// ── GET /api/seller/dashboard ──
router.get('/seller/dashboard', sellerController.getDashboard);

// ── GET /api/seller/products — list seller's own products ──
router.get('/seller/products', sellerController.getProducts);

// ── POST /api/seller/products — add a product ──
router.post('/seller/products', sellerController.addProduct);

// ── PUT /api/seller/products/:id — update a product ──
router.put('/seller/products/:id', sellerController.updateProduct);

// ── DELETE /api/seller/products/:id — soft delete a product ──
router.delete('/seller/products/:id', sellerController.deleteProduct);

// ── GET /api/seller/orders ──
router.get('/seller/orders', sellerController.getOrders);

// ── PUT /api/seller/orders/:id/status ──
router.put('/seller/orders/:id/status', sellerController.updateOrderStatus);

module.exports = router;

// server/src/routes/product.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const authenticateToken = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/auth.middleware');

// Public routes
router.get('/products',            productController.list.bind(productController));
router.get('/products/categories', productController.categories.bind(productController));
router.get('/products/:id',        productController.get.bind(productController));

// Seller-only routes
router.post(  '/products',     authenticateToken, requireRole('seller'), productController.create.bind(productController));
router.put(   '/products/:id', authenticateToken, requireRole('seller'), productController.update.bind(productController));
router.delete('/products/:id', authenticateToken, requireRole('seller'), productController.remove.bind(productController));

module.exports = router;

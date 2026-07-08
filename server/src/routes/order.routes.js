// server/src/routes/order.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authenticateToken = require('../middleware/auth.middleware');

// ── Public — guest tracking by tracking number ────────────────────────────────
router.get('/orders/track/:trackingNumber', orderController.trackByNumber.bind(orderController));

// ── Protected — all other order operations require auth ───────────────────────
router.use(authenticateToken);

router.get( '/orders',              orderController.getUserOrders.bind(orderController));
router.post('/orders',              orderController.placeOrder.bind(orderController));
router.get( '/orders/:id',          orderController.getOrder.bind(orderController));
router.put( '/orders/:id/status',   orderController.updateStatus.bind(orderController));
router.post('/orders/:id/cancel',   orderController.cancelOrder.bind(orderController));

module.exports = router;

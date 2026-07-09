// server/src/routes/order.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);

router.get( '/orders',         orderController.getUserOrders.bind(orderController));
router.post('/orders',         orderController.placeOrder.bind(orderController));
router.get( '/orders/:id',     orderController.getOrder.bind(orderController));
router.put( '/orders/:id/status', orderController.updateStatus.bind(orderController));

module.exports = router;

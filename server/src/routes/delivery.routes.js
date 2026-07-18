'use strict';
const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);

// Sellers/Admins use this to bundle orders and create a route
router.post('/delivery-runs', deliveryController.createRun);

// Drivers use this to fetch their optimized routes
router.get('/delivery-runs', deliveryController.getRuns);

// Drivers push their live GPS location (called every few seconds from device)
router.put('/delivery/location', deliveryController.updateLocation);

// Customers poll this to see driver's current location + ETA for their order
router.get('/delivery/orders/:orderId/driver-location', deliveryController.getDriverLocation);

// Drivers use this to update an order (e.g., mark as delivered with OTP)
router.put('/delivery-runs/orders/:id/status', deliveryController.updateOrderStatus);

// Drivers use this to fetch their completed deliveries
router.get('/completed-deliveries', deliveryController.getCompletedDeliveries);

module.exports = router;

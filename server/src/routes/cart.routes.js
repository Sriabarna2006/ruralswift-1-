// server/src/routes/cart.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.use(authenticateToken);   // All cart routes are protected

router.get(   '/cart',               cartController.getCart.bind(cartController));
router.post(  '/cart',               cartController.addItem.bind(cartController));
router.put(   '/cart/:productId',    cartController.updateItem.bind(cartController));
router.delete('/cart/:productId',    cartController.removeItem.bind(cartController));
router.delete('/cart',               cartController.clearCart.bind(cartController));

module.exports = router;

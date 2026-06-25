// server/src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.middleware');

// Auth routes
router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);

// Profile routes
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

module.exports = router;

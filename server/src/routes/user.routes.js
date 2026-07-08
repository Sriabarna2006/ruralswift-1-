// server/src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticateToken = require('../middleware/auth.middleware');

// ── Public auth routes ────────────────────────────────────────────────────────
router.post('/auth/register',        userController.register.bind(userController));
router.post('/auth/verify-otp',      userController.verifyOtp.bind(userController));
router.post('/auth/login',           userController.login.bind(userController));
router.post('/auth/forgot-password', userController.forgotPassword.bind(userController));
router.post('/auth/reset-password',  userController.resetPassword.bind(userController));

// ── Protected profile routes ──────────────────────────────────────────────────
router.get(  '/profile',        authenticateToken, userController.getProfile.bind(userController));
router.put(  '/profile',        authenticateToken, userController.updateProfile.bind(userController));
router.patch('/profile/avatar', authenticateToken, userController.updateAvatar.bind(userController));

module.exports = router;

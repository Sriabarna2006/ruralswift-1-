// server/src/routes/profile.routes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const authenticateToken = require('../middleware/auth.middleware');

router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, profileController.updateProfile);

module.exports = router;

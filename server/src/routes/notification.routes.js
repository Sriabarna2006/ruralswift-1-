// server/src/routes/notification.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/response');

router.use(authenticateToken);

// GET /api/notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [req.user.id, limit]
    );
    const unreadCount = rows.filter(n => !n.is_read).length;
    sendSuccess(res, 200, 'Notifications fetched.', { notifications: rows, unreadCount });
  } catch (err) { next(err); }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
      [parseInt(req.params.id), req.user.id]
    );
    sendSuccess(res, 200, 'Notification marked as read.', {});
  } catch (err) { next(err); }
});

// PUT /api/notifications/read-all
router.put('/notifications/read-all', async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    sendSuccess(res, 200, 'All notifications marked as read.', {});
  } catch (err) { next(err); }
});

module.exports = router;

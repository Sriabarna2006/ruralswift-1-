// server/src/routes/wishlist.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response');

router.use(authenticateToken);

// GET /api/wishlist
router.get('/wishlist', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT w.id, w.product_id, w.added_at,
              p.name, p.price, p.mrp, p.image_url, p.rating, p.stock
       FROM wishlist w
       JOIN products p ON p.product_id = w.product_id
       WHERE w.user_id = $1
       ORDER BY w.added_at DESC`,
      [req.user.id]
    );
    sendSuccess(res, 200, 'Wishlist fetched.', { data: { items: rows } });
  } catch (err) { next(err); }
});

// POST /api/wishlist
router.post('/wishlist', async (req, res, next) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return sendError(res, 400, 'product_id is required.', 'VALIDATION_ERROR');
    const { rows } = await pool.query(
      `INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *`,
      [req.user.id, parseInt(product_id)]
    );
    sendSuccess(res, 201, 'Added to wishlist.', { data: { item: rows[0] || null } });
  } catch (err) { next(err); }
});

// DELETE /api/wishlist/:productId
router.delete('/wishlist/:productId', async (req, res, next) => {
  try {
    await pool.query(
      `DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2`,
      [req.user.id, parseInt(req.params.productId)]
    );
    sendSuccess(res, 200, 'Removed from wishlist.', {});
  } catch (err) { next(err); }
});

module.exports = router;

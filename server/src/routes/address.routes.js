// server/src/routes/address.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const authenticateToken = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response');

router.use(authenticateToken);

// GET /api/addresses
router.get('/addresses', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    sendSuccess(res, 200, 'Addresses fetched.', { addresses: rows });
  } catch (err) { next(err); }
});

// POST /api/addresses
router.post('/addresses', async (req, res, next) => {
  try {
    const { label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    if (!address_line1) return sendError(res, 400, 'address_line1 is required.', 'VALIDATION_ERROR');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (is_default) {
        await client.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
      }
      const { rows } = await client.query(
        `INSERT INTO addresses (user_id, label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.user.id, label || 'Home', full_name || '', phone || '', address_line1, address_line2 || '', city || '', state || '', pincode || '', !!is_default]
      );
      await client.query('COMMIT');
      sendSuccess(res, 201, 'Address added.', { address: rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) { next(err); }
});

// PUT /api/addresses/:id
router.put('/addresses/:id', async (req, res, next) => {
  try {
    const { label, full_name, phone, address_line1, address_line2, city, state, pincode, is_default } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (is_default) {
        await client.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
      }
      const { rows } = await client.query(
        `UPDATE addresses SET label=$1, full_name=$2, phone=$3, address_line1=$4, address_line2=$5, city=$6, state=$7, pincode=$8, is_default=$9
         WHERE id=$10 AND user_id=$11 RETURNING *`,
        [label, full_name, phone, address_line1, address_line2 || '', city, state, pincode, !!is_default, parseInt(req.params.id), req.user.id]
      );
      await client.query('COMMIT');
      if (!rows[0]) return sendError(res, 404, 'Address not found.', 'NOT_FOUND');
      sendSuccess(res, 200, 'Address updated.', { address: rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) { next(err); }
});

// DELETE /api/addresses/:id
router.delete('/addresses/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id`,
      [parseInt(req.params.id), req.user.id]
    );
    if (!rows[0]) return sendError(res, 404, 'Address not found.', 'NOT_FOUND');
    sendSuccess(res, 200, 'Address deleted.', {});
  } catch (err) { next(err); }
});

// PUT /api/addresses/:id/default — set address as default
router.put('/addresses/:id/default', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = $1`, [req.user.id]);
      const { rows } = await client.query(
        `UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *`,
        [parseInt(req.params.id), req.user.id]
      );
      await client.query('COMMIT');
      if (!rows[0]) return sendError(res, 404, 'Address not found.', 'NOT_FOUND');
      sendSuccess(res, 200, 'Default address updated.', { address: rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) { next(err); }
});

module.exports = router;

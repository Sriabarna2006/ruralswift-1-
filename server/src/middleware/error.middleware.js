// server/src/middleware/error.middleware.js
'use strict';

const { sendError, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Global error-handling middleware.
 * Must be registered LAST in Express (after all routes).
 *
 * Handles:
 *   - PostgreSQL-specific error codes (unique violation, FK, null constraint, etc.)
 *   - JWT errors (should already be caught in auth middleware, but handled here as fallback)
 *   - Generic application errors
 *   - Unhandled promise rejections that reach Express
 *
 * NEVER exposes internal error details to the client in production.
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // ── Log the full error details internally ─────────────────────────────────
  logger.error('Unhandled error reached global error handler', {
    requestId: req.id,
    method:    req.method,
    path:      req.path,
    userId:    req.user?.id ?? null,
    pgCode:    err.code,
    pgDetail:  err.detail,
    message:   err.message,
    stack:     err.stack,
  });

  // ── PostgreSQL-specific error codes ───────────────────────────────────────
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return sendError(res, 409, 'A record with that value already exists.', 'DUPLICATE_RECORD');

      case '23503': // foreign_key_violation
        return sendError(res, 409, 'Related record does not exist.', 'FOREIGN_KEY_VIOLATION');

      case '23502': // not_null_violation
        return sendError(res, 400, 'A required field is missing.', 'NULL_CONSTRAINT_VIOLATION');

      case '23514': // check_violation
        return sendError(res, 400, 'Data did not pass validation constraints.', 'CHECK_VIOLATION');

      case '40001': // serialization_failure (deadlock candidate)
      case '40P01': // deadlock_detected
        return sendError(res, 503, 'Database is temporarily busy. Please retry.', 'DB_DEADLOCK');

      case '08006': // connection_failure
      case '08001': // connection refused
      case '08004': // connection rejected
      case '57P01': // admin_shutdown
        return sendError(res, 503, 'Database connection unavailable.', 'DB_CONNECTION_ERROR');

      case '42P01': // undefined_table
        return sendError(res, 500, 'Internal server error.', ErrorCodes.DB_ERROR);

      default:
        // Unknown PG error — treat as internal server error
        return sendError(res, 500, 'Internal server error.', ErrorCodes.DB_ERROR);
    }
  }

  // ── Application-level errors with explicit status ─────────────────────────
  if (err.status && typeof err.status === 'number') {
    return sendError(res, err.status, err.message || 'An error occurred.');
  }

  // ── JWT errors (fallback if not caught by auth middleware) ─────────────────
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Session expired. Please log in again.', ErrorCodes.AUTH_TOKEN_EXPIRED);
  }
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 403, 'Invalid token.', ErrorCodes.AUTH_TOKEN_INVALID);
  }

  // ── Generic fallback ──────────────────────────────────────────────────────
  return sendError(res, 500, 'Internal server error.', ErrorCodes.INTERNAL_ERROR);
}

module.exports = errorHandler;

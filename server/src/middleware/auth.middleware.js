// server/src/middleware/auth.middleware.js
'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { sendError, ErrorCodes } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Authentication middleware — validates the Bearer JWT from the Authorization header.
 *
 * Error differentiation:
 *   - Missing token         → 401 AUTH_TOKEN_MISSING
 *   - Expired token         → 401 AUTH_TOKEN_EXPIRED   (client should refresh/re-login)
 *   - Invalid/tampered token → 403 AUTH_TOKEN_INVALID  (client is sending garbage)
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    logger.authFailure('Missing token', {
      requestId: req.id,
      path:      req.path,
      method:    req.method,
    });
    return sendError(res, 401, 'Access denied. No token provided.', ErrorCodes.AUTH_TOKEN_MISSING);
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // { id, email, iat, exp }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.authFailure('Token expired', {
        requestId: req.id,
        expiredAt: err.expiredAt,
        path:      req.path,
      });
      return sendError(
        res, 401,
        'Your session has expired. Please log in again.',
        ErrorCodes.AUTH_TOKEN_EXPIRED
      );
    }

    // JsonWebTokenError, NotBeforeError, or any other JWT error
    logger.authFailure('Invalid token', {
      requestId: req.id,
      reason:    err.message,
      path:      req.path,
    });
    return sendError(
      res, 403,
      'Invalid token. Access denied.',
      ErrorCodes.AUTH_TOKEN_INVALID
    );
  }
}

module.exports = authenticateToken;

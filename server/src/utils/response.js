// server/src/utils/response.js
'use strict';

/**
 * Send a standardized success response.
 *
 * Shape:
 * {
 *   "success": true,
 *   "message": "...",
 *   "timestamp": "ISO-8601",
 *   "requestId": "...",
 *   ...data
 * }
 *
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code (200, 201, etc.)
 * @param {string} message     - Human-readable success message
 * @param {object} data        - Additional payload fields (spread into response)
 */
const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success:   true,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.req?.id ?? null,
    ...data,
  });
};

/**
 * Send a standardized error response.
 *
 * Shape:
 * {
 *   "success": false,
 *   "code": "AUTH_INVALID_CREDENTIALS",
 *   "message": "...",
 *   "timestamp": "ISO-8601",
 *   "requestId": "..."
 * }
 *
 * @param {import('express').Response} res
 * @param {number} statusCode  - HTTP status code (400, 401, 404, 409, 500, etc.)
 * @param {string} message     - Human-readable error message (never expose internals)
 * @param {string} [code]      - Machine-readable error code (e.g., AUTH_INVALID_CREDENTIALS)
 */
const sendError = (res, statusCode, message, code = null) => {
  return res.status(statusCode).json({
    success:   false,
    code:      code || httpCodeToErrorCode(statusCode),
    message,
    timestamp: new Date().toISOString(),
    requestId: res.req?.id ?? null,
  });
};

/**
 * Map HTTP status codes to default machine-readable error codes.
 * Controllers may override with a more specific code.
 */
function httpCodeToErrorCode(statusCode) {
  const map = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
  };
  return map[statusCode] || 'UNKNOWN_ERROR';
}

// ── Named error codes ─────────────────────────────────────────────────────────
// Use these constants in controllers to ensure consistency.
const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS:  'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_NOT_FOUND:    'AUTH_ACCOUNT_NOT_FOUND',
  AUTH_EMAIL_EXISTS:         'AUTH_EMAIL_EXISTS',
  AUTH_TOKEN_EXPIRED:        'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID:        'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING:        'AUTH_TOKEN_MISSING',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_EMAIL:  'VALIDATION_INVALID_EMAIL',
  VALIDATION_WEAK_PASSWORD:  'VALIDATION_WEAK_PASSWORD',
  VALIDATION_NO_FIELDS:      'VALIDATION_NO_FIELDS',

  // Resources
  USER_NOT_FOUND:    'USER_NOT_FOUND',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',

  // Server
  INTERNAL_ERROR: 'INTERNAL_SERVER_ERROR',
  DB_ERROR:       'DATABASE_ERROR',
};

module.exports = { sendSuccess, sendError, ErrorCodes };

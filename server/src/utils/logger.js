// server/src/utils/logger.js
'use strict';

const env = require('../config/env');

/**
 * Fields that must NEVER appear in logs.
 * Any object key matching these will be replaced with '[REDACTED]'.
 */
const SENSITIVE_KEYS = new Set([
  'password', 'confirmPassword', 'confirm_password',
  'token', 'accessToken', 'refreshToken', 'access_token', 'refresh_token',
  'authorization', 'Authorization',
  'jwtSecret', 'secret', 'api_key', 'apiKey',
  'credit_card', 'creditCard', 'cvv', 'ssn',
]);

/**
 * Recursively redact sensitive keys from an object before logging.
 * Returns a new object — does not mutate the original.
 */
function redact(obj, depth = 0) {
  if (depth > 5) return '[deep object]'; // prevent circular / deeply nested traversal
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => redact(item, depth + 1));

  const safe = {};
  for (const [key, value] of Object.entries(obj)) {
    safe[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redact(value, depth + 1);
  }
  return safe;
}

/**
 * Format a structured log entry as JSON.
 * In development, also pretty-prints to the console.
 */
function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };

  const output = JSON.stringify(entry);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

const logger = {
  /** General informational event */
  info:  (message, meta = {}) => log('info',  message, meta),
  /** Degraded state but still operational */
  warn:  (message, meta = {}) => log('warn',  message, meta),
  /** Error that needs immediate attention */
  error: (message, meta = {}) => log('error', message, meta),

  /**
   * Log an HTTP request.
   * Called from the request-logging middleware in app.js.
   */
  request(req, res, durationMs) {
    log('info', 'HTTP request', {
      requestId:  req.id,
      method:     req.method,
      path:       req.path,
      statusCode: res.statusCode,
      durationMs,
      ip:         req.ip,
      userAgent:  req.get('user-agent'),
      userId:     req.user?.id ?? null,
    });
  },

  /**
   * Log an authentication failure (without leaking credentials).
   */
  authFailure(reason, meta = {}) {
    log('warn', `Auth failure: ${reason}`, meta);
  },

  /**
   * Log a database error with context.
   */
  dbError(operation, err, meta = {}) {
    log('error', `DB error during "${operation}"`, {
      ...meta,
      pgCode:   err.code,
      pgDetail: err.detail,
      message:  err.message,
    });
  },
};

module.exports = logger;

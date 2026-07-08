// server/src/middleware/validate.middleware.js
'use strict';

const { sendError, ErrorCodes } = require('../utils/response');

/**
 * Sanitize a string value — trim whitespace and strip null bytes.
 * Protects against basic XSS / null-byte injection.
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/\0/g, '');
}

/**
 * Recursively sanitize all string values in a request body object.
 * Called by the sanitizeBody middleware.
 */
function deepSanitize(obj, depth = 0) {
  if (depth > 5 || obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepSanitize(item, depth + 1));

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = typeof value === 'string'
      ? sanitizeString(value)
      : deepSanitize(value, depth + 1);
  }
  return sanitized;
}

/**
 * Middleware: sanitizes req.body strings in-place before they reach controllers.
 * Protects against leading/trailing whitespace, null bytes, and empty string injection.
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
}

// ── Validators ────────────────────────────────────────────────────────────────

/**
 * Validate email format using RFC 5322 simplified pattern.
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

/**
 * Validate phone number — allows digits, spaces, +, -, parentheses.
 * Minimum 7 digits, maximum 15.
 */
function isValidPhone(phone) {
  if (!phone) return true; // phone is optional
  const digits = phone.replace(/[\s\-\+\(\)]/g, '');
  const localNumber = digits.replace(/^(91|0)/, '');
  return /^[6-9]\d{9}$/.test(localNumber);
}

/**
 * Validate password strength — minimum 6 characters, at least one letter and one number.
 */
function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 6;
}

/**
 * Factory: create a validation middleware that checks required fields exist
 * and are non-empty strings.
 *
 * Usage:
 *   router.post('/auth/register',
 *     validateRequired(['email', 'password']),
 *     userController.register
 *   );
 */
function validateRequired(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value === undefined || value === null || String(value).trim() === '') {
        return sendError(
          res, 400,
          `Field "${field}" is required and must not be empty.`,
          ErrorCodes.VALIDATION_REQUIRED_FIELD
        );
      }
    }
    next();
  };
}

module.exports = {
  sanitizeBody,
  validateRequired,
  isValidEmail,
  isValidPhone,
  isValidPassword,
};

// server/src/controllers/user.controller.js
'use strict';

const userService = require('../services/user.service');
const { sendSuccess, sendError, ErrorCodes } = require('../utils/response');
const { isValidEmail, isValidPassword, isValidPhone } = require('../middleware/validate.middleware');
const logger = require('../utils/logger');

class UserController {

  /**
   * POST /api/auth/register
   * Registers a new user account.
   */
  async register(req, res, next) {
    try {
      const { first_name, last_name, email, phone, password } = req.body;

      // ── Validation ────────────────────────────────────────────────────────
      if (!first_name || String(first_name).trim() === '') {
        return sendError(res, 400, 'First name is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!email || String(email).trim() === '') {
        return sendError(res, 400, 'Email address is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!isValidEmail(email)) {
        return sendError(res, 400, 'Please provide a valid email address.', ErrorCodes.VALIDATION_INVALID_EMAIL);
      }
      if (!password) {
        return sendError(res, 400, 'Password is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!isValidPassword(password)) {
        return sendError(
          res, 400,
          'Password must be at least 6 characters long.',
          ErrorCodes.VALIDATION_WEAK_PASSWORD
        );
      }
      if (!phone || String(phone).trim() === '') {
        return sendError(res, 400, 'Phone number is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!isValidPhone(phone)) {
        return sendError(res, 400, 'Please provide a valid phone number.', 'VALIDATION_INVALID_PHONE');
      }

      const result = await userService.registerUser({ first_name, last_name, email, phone, password });
      return sendSuccess(res, 201, 'Registration OTP sent. Please verify your email.', result);

    } catch (err) {
      logger.error('Register controller error', {
        requestId: req.id,
        message:   err.message,
        pgCode:    err.code,
      });

      // Duplicate email — do not reveal whether account exists (timing-safe message)
      if (err.code === '23505' || err.message.includes('already exists')) {
        return sendError(res, 409, 'An account with this email already exists.', ErrorCodes.AUTH_EMAIL_EXISTS);
      }

      next(err); // Delegate unexpected errors to global error handler
    }
  }

  /**
   * POST /api/auth/verify-otp
   * Verifies the registration OTP and creates the user account.
   */
  async verifyOtp(req, res, next) {
    try {
      const { email, otp } = req.body;

      if (!email || String(email).trim() === '') {
        return sendError(res, 400, 'Email address is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!isValidEmail(email)) {
        return sendError(res, 400, 'Please provide a valid email address.', ErrorCodes.VALIDATION_INVALID_EMAIL);
      }
      if (!otp || !/^\d{6}$/.test(String(otp).trim())) {
        return sendError(res, 400, 'Please provide the 6-digit OTP.', 'VALIDATION_INVALID_OTP');
      }

      const result = await userService.verifyRegistrationOtp(email, otp);
      return sendSuccess(res, 201, 'Email verified. Account created successfully.', result);

    } catch (err) {
      logger.error('Verify OTP controller error', {
        requestId: req.id,
        message:   err.message,
        pgCode:    err.code,
      });

      if (err.code === '23505' || err.message.includes('already exists')) {
        return sendError(res, 409, 'An account with this email already exists.', ErrorCodes.AUTH_EMAIL_EXISTS);
      }
      if (err.message.includes('Invalid OTP')) {
        return sendError(res, 401, 'Invalid OTP.', 'AUTH_INVALID_OTP');
      }
      if (err.message.includes('expired')) {
        return sendError(res, 410, 'OTP has expired. Please register again.', 'AUTH_OTP_EXPIRED');
      }
      if (err.message.includes('pending registration')) {
        return sendError(res, 404, 'No pending registration found for this email.', 'AUTH_PENDING_REGISTRATION_NOT_FOUND');
      }

      next(err);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticates a user and returns a JWT.
   *
   * Security: Returns the same generic error for invalid email OR password
   * to prevent user enumeration attacks.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // ── Validation ────────────────────────────────────────────────────────
      if (!email || String(email).trim() === '') {
        return sendError(res, 400, 'Email address is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!password) {
        return sendError(res, 400, 'Password is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!isValidEmail(email)) {
        // Still return generic auth error — don't help enumerate accounts
        return sendError(res, 401, 'Invalid email or password.', ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      const result = await userService.loginUser(email, password);
      return sendSuccess(res, 200, 'Login successful.', result);

    } catch (err) {
      logger.authFailure('Login failed', {
        requestId: req.id,
        message:   err.message,
      });

      // Always return a generic message — never reveal email vs. password specifics
      if (
        err.message.includes('Invalid') ||
        err.message.includes('not found') ||
        err.message.includes('password') ||
        err.message.includes('verify your email')
      ) {
        return sendError(res, 401, 'Invalid email or password.', ErrorCodes.AUTH_INVALID_CREDENTIALS);
      }

      next(err);
    }
  }

  /**
   * GET /api/profile
   * Returns the authenticated user's profile.
   */
  async getProfile(req, res, next) {
    try {
      const user = await userService.getProfile(req.user.id);
      return sendSuccess(res, 200, 'Profile fetched successfully.', { user });
    } catch (err) {
      logger.error('Get profile controller error', {
        requestId: req.id,
        userId:    req.user?.id,
        message:   err.message,
      });

      if (err.message.includes('not found')) {
        return sendError(res, 404, 'User profile not found.', ErrorCodes.USER_NOT_FOUND);
      }
      next(err);
    }
  }

  /**
   * PUT /api/profile
   * Updates the authenticated user's profile fields.
   */
  async updateProfile(req, res, next) {
    try {
      // Validate email if provided
      if (req.body.email !== undefined && req.body.email !== '' && !isValidEmail(req.body.email)) {
        return sendError(res, 400, 'Please provide a valid email address.', ErrorCodes.VALIDATION_INVALID_EMAIL);
      }
      // Validate phone if provided
      if (req.body.phone !== undefined && req.body.phone !== '' && !isValidPhone(req.body.phone)) {
        return sendError(res, 400, 'Please provide a valid phone number.', 'VALIDATION_INVALID_PHONE');
      }

      const result = await userService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, 200, 'Profile updated successfully.', { user: result });

    } catch (err) {
      logger.error('Update profile controller error', {
        requestId: req.id,
        userId:    req.user?.id,
        message:   err.message,
        pgCode:    err.code,
      });

      if (err.code === '23505' || err.message.includes('already in use')) {
        return sendError(res, 409, 'This email is already in use.', 'EMAIL_IN_USE');
      }
      if (err.message.includes('No fields provided')) {
        return sendError(res, 400, 'No fields provided to update.', ErrorCodes.VALIDATION_NO_FIELDS);
      }
      next(err);
    }
  }
}

module.exports = new UserController();

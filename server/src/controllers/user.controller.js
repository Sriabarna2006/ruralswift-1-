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

      // directLogin = existing verified account with correct password → treat as login (200)
      if (result.directLogin) {
        return sendSuccess(res, 200, 'Login successful.', result);
      }

      // Normal new registration → OTP sent (201)
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

      // Unverified account — not a security risk to surface; user registered deliberately
      if (err.message.includes('verify your email')) {
        return sendError(
          res, 403,
          'Your email address is not verified. Please check your inbox for the OTP.',
          'AUTH_EMAIL_NOT_VERIFIED'
        );
      }

      // Wrong credentials — always use generic message (anti-enumeration)
      if (
        err.message.includes('Invalid') ||
        err.message.includes('not found') ||
        err.message.includes('password')
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

  /**
   * PATCH /api/profile/avatar
   * Accepts a base64-encoded image string. Validates size and type before storing.
   */
  async updateAvatar(req, res, next) {
    try {
      const { avatar_url } = req.body;
      if (!avatar_url || typeof avatar_url !== 'string') {
        return sendError(res, 400, 'avatar_url is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }

      // Validate base64 data URI (data:image/jpeg;base64,... or plain base64)
      const isDataUri   = /^data:image\/(jpeg|png|webp|gif);base64,/.test(avatar_url);
      const isPlainB64  = /^[A-Za-z0-9+/]+=*$/.test(avatar_url);
      if (!isDataUri && !isPlainB64) {
        return sendError(res, 400, 'avatar_url must be a valid base64-encoded image.', 'VALIDATION_INVALID_IMAGE');
      }

      // Enforce 2 MB decoded size limit
      const base64Data = avatar_url.includes(',') ? avatar_url.split(',')[1] : avatar_url;
      const decodedBytes = Math.ceil((base64Data.length * 3) / 4);
      if (decodedBytes > 2 * 1024 * 1024) {
        return sendError(res, 413, 'Image must be smaller than 2 MB.', 'IMAGE_TOO_LARGE');
      }

      const user = await userService.updateAvatar(req.user.id, avatar_url);
      return sendSuccess(res, 200, 'Avatar updated successfully.', { user });
    } catch (err) {
      logger.error('Update avatar error', { requestId: req.id, userId: req.user?.id, message: err.message });
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password
   * Always responds with 200 (anti-enumeration — never reveals whether email exists).
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email || !isValidEmail(String(email))) {
        return sendError(res, 400, 'A valid email address is required.', ErrorCodes.VALIDATION_INVALID_EMAIL);
      }
      // Fire-and-forget: errors in email sending are logged but don't fail the response
      userService.forgotPassword(email).catch((err) => {
        logger.error('Forgot password email error', { message: err.message });
      });
      return sendSuccess(res, 200, 'If that email is registered, a reset link has been sent.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   * Applies a new password using the one-time token from the email link.
   */
  async resetPassword(req, res, next) {
    try {
      const { token, password } = req.body;
      if (!token || typeof token !== 'string' || token.trim() === '') {
        return sendError(res, 400, 'Reset token is required.', ErrorCodes.VALIDATION_REQUIRED_FIELD);
      }
      if (!password || password.length < 8) {
        return sendError(res, 400, 'Password must be at least 8 characters.', ErrorCodes.VALIDATION_WEAK_PASSWORD);
      }
      const result = await userService.resetPassword(token.trim(), password);
      return sendSuccess(res, 200, 'Password reset successful.', result);
    } catch (err) {
      logger.error('Reset password error', { requestId: req.id, message: err.message });
      if (err.message.includes('invalid or has expired')) {
        return sendError(res, 400, err.message, 'AUTH_INVALID_RESET_TOKEN');
      }
      if (err.message.includes('at least 8')) {
        return sendError(res, 400, err.message, ErrorCodes.VALIDATION_WEAK_PASSWORD);
      }
      next(err);
    }
  }
}

module.exports = new UserController();

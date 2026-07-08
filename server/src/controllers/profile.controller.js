// server/src/controllers/profile.controller.js
'use strict';

const profileService = require('../services/profile.service');
const { sendSuccess, sendError, ErrorCodes } = require('../utils/response');
const { isValidEmail, isValidPhone } = require('../middleware/validate.middleware');
const logger = require('../utils/logger');

class ProfileController {

  /**
   * GET /api/profile/
   * Returns the authenticated user's full profile.
   */
  async getProfile(req, res, next) {
    try {
      const userProfile = await profileService.getProfile(req.user.id);
      return sendSuccess(res, 200, 'Profile fetched successfully.', { user: userProfile });
    } catch (err) {
      logger.error('Profile controller — getProfile error', {
        requestId: req.id,
        userId:    req.user?.id,
        message:   err.message,
      });

      if (err.status === 404 || err.message.includes('not found')) {
        return sendError(res, 404, 'User profile not found.', ErrorCodes.PROFILE_NOT_FOUND);
      }
      next(err);
    }
  }

  /**
   * PUT /api/profile/
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

      const updatedProfile = await profileService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, 200, 'Profile updated successfully.', { user: updatedProfile });

    } catch (err) {
      logger.error('Profile controller — updateProfile error', {
        requestId: req.id,
        userId:    req.user?.id,
        message:   err.message,
        pgCode:    err.code,
      });

      if (err.status === 400 || err.message.includes('No fields provided')) {
        return sendError(res, 400, 'No fields provided to update.', ErrorCodes.VALIDATION_NO_FIELDS);
      }
      if (err.code === '23505' || err.message.includes('already in use')) {
        return sendError(res, 409, 'This email is already in use.', 'EMAIL_IN_USE');
      }
      next(err);
    }
  }
}

module.exports = new ProfileController();

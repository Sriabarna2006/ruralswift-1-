// server/src/controllers/user.controller.js
const userService = require('../services/user.service');
const { sendSuccess, sendError } = require('../utils/response');

class UserController {
  async register(req, res) {
    try {
      const { first_name, last_name, email, phone, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required.');
      }
      const result = await userService.registerUser({ first_name, last_name, email, phone, password });
      return sendSuccess(res, 201, 'Account created successfully.', result);
    } catch (err) {
      console.error('Register error:', err);
      const statusCode = err.message.includes('already exists') ? 409 : 500;
      const message = statusCode === 500 ? 'Server error during registration.' : err.message;
      return sendError(res, statusCode, message);
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required.');
      }
      const result = await userService.loginUser(email, password);
      return sendSuccess(res, 200, 'Login successful.', result);
    } catch (err) {
      console.error('Login error:', err);
      const statusCode = err.message.includes('Invalid') ? 401 : 500;
      const message = statusCode === 500 ? 'Server error during login.' : err.message;
      return sendError(res, statusCode, message);
    }
  }

  async getProfile(req, res) {
    try {
      const user = await userService.getProfile(req.user.id);
      return sendSuccess(res, 200, 'Profile fetched successfully.', { user });
    } catch (err) {
      console.error('Get profile error:', err);
      const statusCode = err.message.includes('not found') ? 404 : 500;
      const message = statusCode === 500 ? 'Server error fetching profile.' : err.message;
      return sendError(res, statusCode, message);
    }
  }

  async updateProfile(req, res) {
    try {
      const result = await userService.updateProfile(req.user.id, req.body);
      return sendSuccess(res, 200, 'Profile updated successfully.', { user: result });
    } catch (err) {
      console.error('Update profile error:', err);
      let statusCode = 500;
      let message = 'Server error updating profile.';
      if (err.code === '23505' || err.message.includes('already in use')) {
        statusCode = 409;
        message = 'This email is already in use.';
      } else if (err.message.includes('No fields provided')) {
        statusCode = 400;
        message = err.message;
      }
      return sendError(res, statusCode, message);
    }
  }
}

module.exports = new UserController();

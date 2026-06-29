// server/src/services/user.service.js
'use strict';

const bcrypt         = require('bcrypt');
const jwt            = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const env            = require('../config/env');
const logger         = require('../utils/logger');

const BCRYPT_ROUNDS = 12; // Industry standard; bcrypt auto-manages salt

class UserService {

  /**
   * Format a database user row into the public API response shape.
   * Splits the stored `name` column into first_name / last_name.
   * Never includes the password field.
   */
  _formatUserResponse(user) {
    const nameParts   = (user.name || '').trim().split(/\s+/);
    const first_name  = nameParts[0] || '';
    const last_name   = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    return {
      id:         user.user_id,
      first_name,
      last_name,
      name:       user.name || '',
      email:      user.email,
      phone:      user.phone  || '',
      address:    user.address || '',
      gender:     user.gender  || '',
      avatar_url: user.avatar_url || '',
      created_at: user.created_at,
    };
  }

  /**
   * Sign a JWT for the given user.
   * Validates that jwtSecret exists (env.js already guarantees this at startup).
   */
  _generateToken(user) {
    if (!env.jwtSecret) {
      throw new Error('JWT_SECRET is not configured.');
    }
    return jwt.sign(
      { id: user.user_id, email: user.email },
      env.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Register a new user.
   * Throws if the email already exists (caught by controller).
   */
  async registerUser(userData) {
    const { first_name, last_name, email, phone, password } = userData;

    // Normalise name — handles missing last name gracefully
    const name = [
      (first_name || '').trim(),
      (last_name  || '').trim(),
    ].filter(Boolean).join(' ');

    // Check for existing account
    const existingUser = await userRepository.findByEmail(email.toLowerCase().trim());
    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepository.create(
      name,
      email.toLowerCase().trim(),
      (phone || '').trim(),
      hashedPassword
    );

    logger.info('New user registered', { userId: user.user_id, email: user.email });

    return {
      token: this._generateToken(user),
      user:  this._formatUserResponse(user),
    };
  }

  /**
   * Authenticate a user by email and password.
   * Always throws the same generic error for invalid credentials (user enumeration protection).
   */
  async loginUser(email, password) {
    const user = await userRepository.findByEmail(email.toLowerCase().trim());

    // Always compare (even if user not found) to prevent timing attacks
    const dummyHash = '$2b$12$invalidhashfortimingsafety000000000000000000000000000000';
    const hashToCompare = user ? user.password : dummyHash;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !isMatch) {
      // Log the failure without revealing which condition triggered it
      logger.authFailure('Invalid credentials', { email });
      throw new Error('Invalid email or password.');
    }

    logger.info('User logged in', { userId: user.user_id });

    return {
      token: this._generateToken(user),
      user:  this._formatUserResponse(user),
    };
  }

  /**
   * Fetch a user's profile by ID.
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }
    return this._formatUserResponse(user);
  }

  /**
   * Update specific fields on a user profile.
   *
   * Optimisation: only fetches current user record when name fields are being
   * updated (to merge first/last names), avoiding an unnecessary DB call otherwise.
   */
  async updateProfile(userId, updateData) {
    const { first_name, last_name, email, phone, address, gender } = updateData;

    const fields = [];
    const values = [];
    let   index  = 1;

    // ── Name handling ─────────────────────────────────────────────────────────
    if (first_name !== undefined || last_name !== undefined) {
      // Fetch current name only when needed
      const currentUser   = await userRepository.findById(userId);
      const currentName   = (currentUser?.name || '').trim();
      const currentParts  = currentName.split(/\s+/);
      const currentFirst  = currentParts[0] || '';
      const currentLast   = currentParts.slice(1).join(' ') || '';

      const newFirst = first_name !== undefined ? String(first_name).trim() : currentFirst;
      const newLast  = last_name  !== undefined ? String(last_name).trim()  : currentLast;
      const newName  = [newFirst, newLast].filter(Boolean).join(' ');

      fields.push(`name = $${index++}`);
      values.push(newName);
    }

    // ── Other fields ──────────────────────────────────────────────────────────
    if (email   !== undefined) { fields.push(`email   = $${index++}`); values.push(email.toLowerCase().trim()); }
    if (phone   !== undefined) { fields.push(`phone   = $${index++}`); values.push(String(phone).trim()); }
    if (address !== undefined) { fields.push(`address = $${index++}`); values.push(String(address).trim()); }
    if (gender  !== undefined) { fields.push(`gender  = $${index++}`); values.push(String(gender).trim()); }

    if (fields.length === 0) {
      throw new Error('No fields provided to update.');
    }

    // updated_at is a SQL literal — intentionally not parameterised
    fields.push('updated_at = NOW()');

    // userId is always the LAST value; WHERE clause uses values.length
    values.push(userId);

    const updatedUser = await userRepository.update(userId, fields, values);

    if (!updatedUser) {
      throw new Error('User not found.');
    }

    logger.info('User profile updated', { userId });

    return this._formatUserResponse(updatedUser);
  }
}

module.exports = new UserService();

// server/src/services/user.service.js
'use strict';

const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const crypto         = require('crypto');
const userRepository = require('../repositories/user.repository');
const env            = require('../config/env');
const logger         = require('../utils/logger');
const { pool }       = require('../config/db');
const { sendRegistrationOtp, sendPasswordResetEmail } = require('../utils/mailer');
const BCRYPT_ROUNDS  = 10;
const OTP_TTL_MINUTES = 10;

class UserService {

  /**
   * Format a database user row into the public API response shape.
   * Splits the stored `name` column into first_name / last_name.
   * Never includes the password field.
   */
  _formatUserResponse(user, roleOverride = null) {
    const nameParts   = (user.name || '').trim().split(/\s+/);
    const first_name  = nameParts[0] || '';
    const last_name   = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const resolvedRole = roleOverride ?? user?.role ?? 'customer';

    return {
      id:         user.user_id,
      first_name,
      last_name,
      name:       user.name || '',
      email:      user.email,
      phone:      user.phone  || '',
      address:    user.address || '',
      gender:     user.gender  || '',
      date_of_birth: user.date_of_birth ? new Date(user.date_of_birth).toISOString().split('T')[0] : '',
      avatar_url: user.avatar_url || '',
      role:       resolvedRole,
      is_email_verified: !!user.is_email_verified,
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
      { id: user.user_id, email: user.email, role: user.role || 'customer' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async _resolveRole(user) {
    if (user.role === 'seller') return 'seller';
    const isSeller = await userRepository.hasSellerProfile(user.user_id);
    return isSeller ? 'seller' : (user.role || 'customer');
  }

  /**
   * Register a new user.
   * Throws if the email already exists (caught by controller).
   */
  async registerUser(userData) {
    const { first_name, last_name, email, phone, password } = userData;
    const normalisedEmail = email.toLowerCase().trim();

    // Check if a fully verified account already exists
    const existingUser = await userRepository.findByEmail(normalisedEmail);
    if (existingUser) {
      // If the password matches, allow direct login
      const isMatch = await bcrypt.compare(password, existingUser.password);
      if (isMatch) {
        const effectiveRole = await this._resolveRole(existingUser);
        return {
          directLogin: true,
          token: this._generateToken({ ...existingUser, role: effectiveRole }),
          user:  this._formatUserResponse(existingUser, effectiveRole),
        };
      }
      throw new Error('An account with this email already exists.');
    }

    // If there is already a pending registration, just resend a fresh OTP
    // (user may have lost their first OTP or it expired — no need to 409)
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // upsertPendingRegistration will INSERT or UPDATE if row already exists
    await userRepository.upsertPendingRegistration({
      firstName: (first_name || '').trim(),
      lastName: (last_name || '').trim(),
      email: normalisedEmail,
      phone: (phone || '').trim(),
      passwordHash: hashedPassword,
      otpHash,
      otpExpiresAt,
    });

    const hasSmtpConfig = !!(env.smtp && env.smtp.user && env.smtp.pass && env.smtp.from);

    if (hasSmtpConfig) {
      const dns = require('dns').promises;
      const domain = normalisedEmail.split('@')[1];
      try {
        const mxRecords = await dns.resolveMx(domain);
        if (!mxRecords || mxRecords.length === 0) {
          const err = new Error('The email domain does not have valid mail server records (MX). Please use an active email.');
          err.status = 400;
          throw err;
        }
      } catch (dnsErr) {
        if (dnsErr.status === 400) {
          throw dnsErr;
        }
        logger.warn('MX record lookup failed', { domain, error: dnsErr.message });
        const err = new Error('The email domain is invalid or inactive. Please provide an active email.');
        err.status = 400;
        throw err;
      }
    }

    try {
      await sendRegistrationOtp(normalisedEmail, otp);
      logger.info('Registration OTP sent', { email: normalisedEmail });
    } catch (err) {
      if (hasSmtpConfig) {
        logger.error('Failed to send registration OTP email', { email: normalisedEmail, error: err.message });
        const mailErr = new Error('Failed to send verification email. Please check if your email address is correct and active.');
        mailErr.status = 400;
        throw mailErr;
      } else {
        logger.warn('Failed to send registration OTP email. Falling back to mock mode.', { email: normalisedEmail, message: err.message });
        console.log(`\n\n[MAILER FALLBACK] Registration OTP for ${normalisedEmail} is: ${otp}\n\n`);
      }
    }

    return {
      verificationRequired: true,
      email: normalisedEmail,
      expiresInMinutes: OTP_TTL_MINUTES,
    };
  }

  async verifyRegistrationOtp(email, otp) {
    const normalisedEmail = email.toLowerCase().trim();
    const pending = await userRepository.findPendingRegistration(normalisedEmail);

    if (!pending) {
      throw new Error('No pending registration found.');
    }

    if (new Date(pending.otp_expires_at).getTime() < Date.now()) {
      await userRepository.deletePendingRegistration(normalisedEmail);
      throw new Error('OTP has expired.');
    }

    const isMatch = await bcrypt.compare(String(otp || '').trim(), pending.otp_hash);
    if (!isMatch) {
      throw new Error('Invalid OTP.');
    }

    const existingUser = await userRepository.findByEmail(normalisedEmail);
    if (existingUser) {
      await userRepository.deletePendingRegistration(normalisedEmail);
      throw new Error('An account with this email already exists.');
    }

    const user = await userRepository.verifyAndCreateUser(normalisedEmail, pending);

    logger.info('New user verified and registered', { userId: user.user_id, email: user.email });

    const effectiveRole = await this._resolveRole(user);

    return {
      token: this._generateToken({ ...user, role: effectiveRole }),
      user:  this._formatUserResponse(user, effectiveRole),
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

    if (!user.is_email_verified) {
      logger.authFailure('Unverified email login attempt', { email });
      throw new Error('Please verify your email before logging in.');
    }

    logger.info('User logged in', { userId: user.user_id });

    const effectiveRole = await this._resolveRole(user);

    return {
      token: this._generateToken({ ...user, role: effectiveRole }),
      user:  this._formatUserResponse(user, effectiveRole),
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
    const { first_name, last_name, email, phone, address, gender, date_of_birth } = updateData;

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
    if (date_of_birth !== undefined) {
      fields.push(`date_of_birth = $${index++}`);
      values.push(date_of_birth ? String(date_of_birth).trim() : null);
    }

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

  /** Update a user's avatar URL */
  async updateAvatar(userId, avatarUrl) {
    const updated = await userRepository.updateAvatar(userId, avatarUrl);
    if (!updated) throw new Error('User not found.');
    logger.info('Avatar updated', { userId });
    return this._formatUserResponse(updated);
  }

  // ── Password Reset ─────────────────────────────────────────────────────────────

  /**
   * Initiate a password reset.
   * Always returns success (timing-safe: doesn't reveal whether email exists).
   */
  async forgotPassword(email) {
    const normalisedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalisedEmail);

    // If no user exists we silently succeed (anti-enumeration)
    if (!user) {
      logger.info('Forgot password: unknown email (suppressed)', { email: normalisedEmail });
      return;
    }

    // Generate a cryptographically secure random token
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttl       = env.passwordReset.ttlMinutes;
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await userRepository.createResetToken(user.user_id, tokenHash, expiresAt);

    const resetLink = `${env.passwordReset.baseUrl}/reset-password?token=${rawToken}`;
    console.log('\n*** [DEBUG] Reset Link:', resetLink, '\n');
    try {
      await sendPasswordResetEmail(normalisedEmail, resetLink);
      logger.info('Password reset email sent', { userId: user.user_id });
    } catch (err) {
      logger.warn('Failed to send password reset email. Falling back to mock mode.', { email: normalisedEmail, message: err.message });
      console.log(`\n\n[MAILER FALLBACK] Password reset link for ${normalisedEmail} is: ${resetLink}\n\n`);
    }
  }

  /**
   * Apply a new password using a valid reset token.
   * Token is single-use and expires.
   */
  async resetPassword(rawToken, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenRow  = await userRepository.findValidResetToken(tokenHash);

    if (!tokenRow) {
      throw new Error('This password reset link is invalid or has expired.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await userRepository.updatePassword(tokenRow.user_id, hashedPassword);
    await userRepository.markResetTokenUsed(tokenRow.id);

    logger.info('Password reset successful', { userId: tokenRow.user_id });

    const user = await userRepository.findById(tokenRow.user_id);
    const effectiveRole = await this._resolveRole(user);
    return {
      autoLogin: true,
      token: this._generateToken({ ...user, role: effectiveRole }),
      user:  this._formatUserResponse(user, effectiveRole),
    };
  }

  /** Upgrade a user to a delivery partner */
  async becomeDriver(userId) {
    const { rows } = await pool.query(
      `UPDATE users SET role = 'delivery', updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      [userId]
    );
    if (rows.length === 0) throw new Error('User not found.');
    const user = { ...rows[0] };
    delete user.password;
    return user;
  }
}

module.exports = new UserService();

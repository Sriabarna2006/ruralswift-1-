// server/src/services/profile.service.js
'use strict';

const profileRepository = require('../repositories/profile.repository');
const logger            = require('../utils/logger');

class ProfileService {

  /**
   * Format a database user row into the public API profile shape.
   * Splits the stored `name` column into first_name / last_name.
   */
  _formatUser(u) {
    const nameParts  = (u.name || '').trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    return {
      id:         u.user_id,
      first_name,
      last_name,
      name:       u.name    || '',
      email:      u.email,
      phone:      u.phone   || '',
      address:    u.address || '',
      gender:     u.gender  || '',
      avatar_url: u.avatar_url || '',
      created_at: u.created_at,
    };
  }

  /**
   * Fetch a user's profile from the database.
   * Throws a 404-status error if user does not exist.
   */
  async getProfile(userId) {
    const user = await profileRepository.getProfileById(userId);
    if (!user) {
      const error  = new Error('User not found.');
      error.status = 404;
      throw error;
    }
    return this._formatUser(user);
  }

  /**
   * Update specific fields on a user profile.
   * Only fetches the current record when name fields need to be merged.
   */
  async updateProfile(userId, updateData) {
    const { first_name, last_name, email, phone, address, gender } = updateData;

    const fields = [];
    const values = [];
    let   index  = 1;

    // ── Name merge (only fetch current record if name is changing) ─────────
    if (first_name !== undefined || last_name !== undefined) {
      const current      = await profileRepository.getProfileById(userId);
      const currentName  = (current?.name || '').trim();
      const currentParts = currentName.split(/\s+/);
      const currentFirst = currentParts[0] || '';
      const currentLast  = currentParts.slice(1).join(' ') || '';

      const newFirst = first_name !== undefined ? String(first_name).trim() : currentFirst;
      const newLast  = last_name  !== undefined ? String(last_name).trim()  : currentLast;
      const newName  = [newFirst, newLast].filter(Boolean).join(' ');

      fields.push(`name = $${index++}`);
      values.push(newName);
    }

    if (email   !== undefined) { fields.push(`email   = $${index++}`); values.push(email.toLowerCase().trim()); }
    if (phone   !== undefined) { fields.push(`phone   = $${index++}`); values.push(String(phone).trim()); }
    if (address !== undefined) { fields.push(`address = $${index++}`); values.push(String(address).trim()); }
    if (gender  !== undefined) { fields.push(`gender  = $${index++}`); values.push(String(gender).trim()); }

    if (fields.length === 0) {
      const error  = new Error('No fields provided to update.');
      error.status = 400;
      throw error;
    }

    // SQL literal — intentionally not parameterised
    fields.push('updated_at = NOW()');

    // userId is always the LAST element; WHERE clause uses values.length
    values.push(userId);

    const updatedUser = await profileRepository.updateProfile(userId, fields, values);

    if (!updatedUser) {
      const error  = new Error('User not found.');
      error.status = 404;
      throw error;
    }

    logger.info('Profile updated via profile service', { userId });
    return this._formatUser(updatedUser);
  }
}

module.exports = new ProfileService();

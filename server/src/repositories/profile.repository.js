// server/src/repositories/profile.repository.js
'use strict';

const { query } = require('../config/db');
const logger    = require('../utils/logger');

class ProfileRepository {

  /**
   * Fetch a user's profile by their primary key.
   * Does NOT include the password field.
   *
   * @param {number} userId
   * @returns {Promise<object|undefined>}
   */
  async getProfileById(userId) {
    try {
      const result = await query(
        `SELECT user_id, name, email, phone, address, gender, avatar_url, created_at
         FROM users
         WHERE user_id = $1
         LIMIT 1`,
        [userId]
      );
      return result.rows[0];
    } catch (err) {
      logger.dbError('ProfileRepository.getProfileById', err, { userId });
      throw err;
    }
  }

  /**
   * Update a user's profile fields.
   *
   * @param {number}   userId  - User to update
   * @param {string[]} fields  - Array of SET clauses e.g. ["name = $1", "updated_at = NOW()"]
   * @param {Array}    values  - Parameter values; userId MUST be the last element
   * @returns {Promise<object|undefined>} - Updated user row, or undefined if not found
   */
  async updateProfile(userId, fields, values) {
    try {
      const setClause = fields.join(', ');
      const sql = `
        UPDATE users
        SET    ${setClause}
        WHERE  user_id = $${values.length}
        RETURNING user_id, name, email, phone, address, gender, avatar_url, created_at
      `;
      const result = await query(sql, values);
      return result.rows[0];
    } catch (err) {
      logger.dbError('ProfileRepository.updateProfile', err, { userId });
      throw err;
    }
  }
}

module.exports = new ProfileRepository();

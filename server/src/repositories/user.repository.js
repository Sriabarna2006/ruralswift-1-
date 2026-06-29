// server/src/repositories/user.repository.js
'use strict';

const { query } = require('../config/db');
const logger    = require('../utils/logger');

class UserRepository {

  /**
   * Find a user by email address.
   * Includes the password hash for authentication comparison.
   *
   * @param {string} email - Normalised (lowercase, trimmed) email address
   * @returns {Promise<object|undefined>}
   */
  async findByEmail(email) {
    try {
      const result = await query(
        `SELECT user_id, name, email, phone, password, address, gender, avatar_url, created_at
         FROM users
         WHERE email = $1
         LIMIT 1`,
        [email]
      );
      return result.rows[0];
    } catch (err) {
      logger.dbError('UserRepository.findByEmail', err, { email });
      throw err;
    }
  }

  /**
   * Find a user by their primary key.
   * Does NOT include the password field.
   *
   * @param {number} userId
   * @returns {Promise<object|undefined>}
   */
  async findById(userId) {
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
      logger.dbError('UserRepository.findById', err, { userId });
      throw err;
    }
  }

  /**
   * Insert a new user record.
   *
   * @param {string} name           - Full name (first + last)
   * @param {string} email          - Normalised email
   * @param {string} phone          - Phone number (may be empty string)
   * @param {string} hashedPassword - bcrypt hash
   * @returns {Promise<object>}     - Created user row (no password)
   */
  async create(name, email, phone, hashedPassword) {
    try {
      const result = await query(
        `INSERT INTO users (name, email, phone, password)
         VALUES ($1, $2, $3, $4)
         RETURNING user_id, name, email, phone, address, gender, avatar_url, created_at`,
        [name, email, phone || '', hashedPassword]
      );
      return result.rows[0];
    } catch (err) {
      logger.dbError('UserRepository.create', err, { email });
      throw err;
    }
  }

  /**
   * Update a user's profile fields.
   *
   * @param {number}   userId  - User to update
   * @param {string[]} fields  - Array of SET clauses e.g. ["name = $1", "email = $2", "updated_at = NOW()"]
   * @param {Array}    values  - Parameter values; userId MUST be the last element
   * @returns {Promise<object|undefined>} - Updated user row
   *
   * Note: `updated_at = NOW()` in fields is a SQL literal and does NOT have a
   * corresponding $N placeholder. The WHERE clause uses `$${values.length}` which
   * correctly targets the userId appended as the last element of values.
   */
  async update(userId, fields, values) {
    try {
      const setClause = fields.join(', ');
      const sql = `
        UPDATE users
        SET    ${setClause}
        WHERE  user_id = $${values.length}
        RETURNING user_id, name, email, phone, address, gender, avatar_url, created_at
      `;
      const result = await query(sql, values);
      return result.rows[0]; // undefined if no row was updated
    } catch (err) {
      logger.dbError('UserRepository.update', err, { userId });
      throw err;
    }
  }
}

module.exports = new UserRepository();

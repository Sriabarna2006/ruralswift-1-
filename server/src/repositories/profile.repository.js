// server/src/repositories/profile.repository.js
const pool = require('../config/db');

class ProfileRepository {
  async getProfileById(userId) {
    const result = await pool.query(
      `SELECT user_id, name, email, phone, address, gender, avatar_url, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async updateProfile(userId, fields, values) {
    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${values.length}
      RETURNING user_id, name, email, phone, address, gender, avatar_url
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }
}

module.exports = new ProfileRepository();

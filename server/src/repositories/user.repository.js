// server/src/repositories/user.repository.js
const pool = require('../config/db');

class UserRepository {
  async findByEmail(email) {
    const result = await pool.query(
      'SELECT user_id, name, email, phone, password FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async findById(userId) {
    const result = await pool.query(
      `SELECT user_id, name, email, phone, address, gender, avatar_url, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  async create(name, email, phone, hashedPassword) {
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, phone`,
      [name, email, phone || '', hashedPassword]
    );
    return result.rows[0];
  }

  async update(userId, fields, values) {
    // fields is an array of strings like "name = $1", "email = $2"
    // values is an array of corresponding values, where the last value is the userId
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

module.exports = new UserRepository();

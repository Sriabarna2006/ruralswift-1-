// server/src/services/user.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const env = require('../config/env');

class UserService {
  _formatUserResponse(user) {
    const nameParts = (user.name || '').split(' ');
    return {
      id: user.user_id,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      gender: user.gender,
      avatar_url: user.avatar_url,
      created_at: user.created_at
    };
  }

  _generateToken(user) {
    return jwt.sign(
      { id: user.user_id, email: user.email },
      env.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  async registerUser(userData) {
    const { first_name, last_name, email, phone, password } = userData;
    const name = `${(first_name || '').trim()} ${(last_name || '').trim()}`.trim();

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create(name, email, phone, hashedPassword);

    return {
      token: this._generateToken(user),
      user: this._formatUserResponse(user)
    };
  }

  async loginUser(email, password) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    return {
      token: this._generateToken(user),
      user: this._formatUserResponse(user)
    };
  }

  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found.');
    }
    return this._formatUserResponse(user);
  }

  async updateProfile(userId, updateData) {
    const { first_name, last_name, email, phone, address, gender } = updateData;

    const fields = [];
    const values = [];
    let index = 1;

    if (first_name !== undefined || last_name !== undefined) {
      const currentUser = await userRepository.findById(userId);
      const currentName = currentUser?.name || '';
      const currentParts = currentName.split(' ');
      const newFirst = first_name !== undefined ? first_name.trim() : (currentParts[0] || '');
      const newLast = last_name !== undefined ? last_name.trim() : (currentParts.slice(1).join(' ') || '');
      const newName = `${newFirst} ${newLast}`.trim();
      fields.push(`name = $${index++}`);
      values.push(newName);
    }

    if (email !== undefined) { fields.push(`email = $${index++}`); values.push(email); }
    if (phone !== undefined) { fields.push(`phone = $${index++}`); values.push(phone); }
    if (address !== undefined) { fields.push(`address = $${index++}`); values.push(address); }
    if (gender !== undefined) { fields.push(`gender = $${index++}`); values.push(gender); }

    if (fields.length === 0) {
      throw new Error('No fields provided to update.');
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId); // Add userId to values array at the end

    const updatedUser = await userRepository.update(userId, fields, values);
    return this._formatUserResponse(updatedUser);
  }
}

module.exports = new UserService();

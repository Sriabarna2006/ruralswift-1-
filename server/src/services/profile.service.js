// server/src/services/profile.service.js
const profileRepository = require('../repositories/profile.repository');

class ProfileService {
  _formatUser(u) {
    const nameParts = (u.name || '').split(' ');
    return {
      id:         u.user_id,
      first_name: nameParts[0] || '',
      last_name:  nameParts.slice(1).join(' ') || '',
      name:       u.name,
      email:      u.email,
      phone:      u.phone,
      address:    u.address,
      gender:     u.gender,
      avatar_url: u.avatar_url,
      created_at: u.created_at
    };
  }

  async getProfile(userId) {
    const user = await profileRepository.getProfileById(userId);
    if (!user) {
      const error = new Error('User not found.');
      error.status = 404;
      throw error;
    }
    return this._formatUser(user);
  }

  async updateProfile(userId, updateData) {
    const { first_name, last_name, email, phone, address, gender } = updateData;

    const fields = [];
    const values = [];
    let index = 1;

    // Combine first+last into 'name' column
    if (first_name !== undefined || last_name !== undefined) {
      const current = await profileRepository.getProfileById(userId);
      const currentName = current?.name || '';
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
      const error = new Error('No fields provided to update.');
      error.status = 400;
      throw error;
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const updatedUser = await profileRepository.updateProfile(userId, fields, values);
    return this._formatUser(updatedUser);
  }
}

module.exports = new ProfileService();

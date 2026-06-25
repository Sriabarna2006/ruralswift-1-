// server/src/controllers/profile.controller.js
const profileService = require('../services/profile.service');

class ProfileController {
  async getProfile(req, res) {
    try {
      const userProfile = await profileService.getProfile(req.user.id);
      res.json({ user: userProfile });
    } catch (err) {
      console.error('Get profile error:', err);
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error fetching profile.' });
    }
  }

  async updateProfile(req, res) {
    try {
      const updatedProfile = await profileService.updateProfile(req.user.id, req.body);
      res.json({
        message: 'Profile updated successfully.',
        user: updatedProfile
      });
    } catch (err) {
      console.error('Update profile error:', err);
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      if (err.code === '23505') {
        return res.status(409).json({ message: 'This email is already in use.' });
      }
      res.status(500).json({ message: 'Server error updating profile.' });
    }
  }
}

module.exports = new ProfileController();

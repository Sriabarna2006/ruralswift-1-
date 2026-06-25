// server/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authenticateToken;

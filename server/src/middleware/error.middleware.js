// server/src/middleware/error.middleware.js
const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);
  return sendError(res, 500, 'Internal server error.');
}

module.exports = errorHandler;

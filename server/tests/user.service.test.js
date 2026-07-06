const test = require('node:test');
const assert = require('node:assert/strict');

const userService = require('../src/services/user.service');

test('formats a user response with a safe default role', () => {
  const response = userService._formatUserResponse({
    user_id: 1,
    name: 'Seller User',
    email: 'seller@example.com',
    role: 'customer',
  });

  assert.equal(response.role, 'customer');
  assert.equal(response.name, 'Seller User');
});

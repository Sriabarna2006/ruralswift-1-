const { query } = require('../src/config/db');
const bcrypt = require('bcrypt');

(async () => {
  const email = 'seller-login-check@example.com';
  const password = 'TestPass123!';
  const hash = await bcrypt.hash(password, 12);

  const userRes = await query(
    `INSERT INTO users (name, email, phone, password, role, is_email_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password
     RETURNING user_id`,
    ['Seller Login', email, '9999999999', hash, 'customer']
  );

  const userId = userRes.rows[0].user_id;
  await query(
    `INSERT INTO seller_profiles (user_id, business_name)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET business_name = EXCLUDED.business_name`,
    [userId, 'Test Seller']
  );

  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const body = await response.text();
  console.log('status=' + response.status);
  console.log(body);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

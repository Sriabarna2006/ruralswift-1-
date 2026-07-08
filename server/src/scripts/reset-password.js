// server/src/scripts/reset-password.js
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const EMAIL    = 'venkatw053@gmail.com';
const NEW_PASS = 'RuralSwift@123';

(async () => {
  try {
    const hash = await bcrypt.hash(NEW_PASS, 10);
    const res  = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING name, email',
      [hash, EMAIL]
    );
    if (res.rows.length === 0) {
      console.log('❌ No user found with that email.');
    } else {
      console.log('✅ Password reset successfully for:', res.rows[0]);
      console.log('📧 Email:    ', EMAIL);
      console.log('🔑 Password: ', NEW_PASS);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await pool.end();
  }
})();

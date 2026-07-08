const { pool } = require('./server/src/config/db');
const jwt = require('jsonwebtoken');
const env = require('./server/src/config/env');
const http = require('http');

async function test() {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE role = 'seller' LIMIT 1");
    if (rows.length === 0) {
      console.log('No seller found in DB to test with.');
      process.exit(1);
    }
    const seller = rows[0];
    
    const token = jwt.sign(
      { id: seller.user_id, email: seller.email, role: 'seller' },
      env.jwtSecret,
      { expiresIn: '7d' }
    );
    
    const productData = JSON.stringify({
      name: 'Test Product',
      price: 199.99,
      description: 'A test product',
      stock: 50,
      category: 'Electronics'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/seller/products',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(productData),
        'Authorization': 'Bearer ' + token
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Add Product Res Status:', res.statusCode);
        console.log('Add Product Res Body:', body);
        process.exit(0);
      });
    });
    req.on('error', (e) => {
      console.error(e);
      process.exit(1);
    });
    req.write(productData);
    req.end();

  } catch(err) {
    console.error(err);
    process.exit(1);
  }
}
test();

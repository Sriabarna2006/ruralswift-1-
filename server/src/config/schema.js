// server/src/config/schema.js
const pool = require('./db');

async function createTables() {
  try {
    // ── Base tables (safe to run every startup) ──────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id    SERIAL PRIMARY KEY,
        name       VARCHAR(150) NOT NULL DEFAULT '',
        email      VARCHAR(255) NOT NULL UNIQUE,
        phone      VARCHAR(20)  NOT NULL DEFAULT '',
        password   TEXT         NOT NULL,
        address    TEXT         DEFAULT '',
        gender     VARCHAR(20)  DEFAULT '',
        avatar_url TEXT         DEFAULT '',
        created_at TIMESTAMP    DEFAULT NOW(),
        updated_at TIMESTAMP    DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id  SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT         DEFAULT '',
        price       NUMERIC(10,2) DEFAULT 0,
        stock       INT           DEFAULT 0,
        category    VARCHAR(100)  DEFAULT '',
        image_url   TEXT          DEFAULT '',
        created_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id   SERIAL PRIMARY KEY,
        user_id    INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        status     VARCHAR(50)  DEFAULT 'pending',
        total      NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP    DEFAULT NOW()
      )
    `);

    // ── Add missing columns to existing users table ──────────
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender        VARCHAR(20) DEFAULT ''`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP DEFAULT NOW()`);

    // ── Add missing columns to existing orders table ─────────
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes            TEXT DEFAULT ''`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at     TIMESTAMP`);

    // ── Add missing columns to existing products table ───────
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp      NUMERIC(10,2) DEFAULT 0`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit     VARCHAR(50) DEFAULT 'piece'`);
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`);

    // ── NEW: addresses table ──────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id            SERIAL PRIMARY KEY,
        user_id       INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        label         VARCHAR(50)  DEFAULT 'Home',
        full_name     VARCHAR(150) DEFAULT '',
        phone         VARCHAR(20)  DEFAULT '',
        address_line1 TEXT         NOT NULL DEFAULT '',
        address_line2 TEXT         DEFAULT '',
        city          VARCHAR(100) DEFAULT '',
        state         VARCHAR(100) DEFAULT '',
        pincode       VARCHAR(10)  DEFAULT '',
        is_default    BOOLEAN      DEFAULT FALSE,
        created_at    TIMESTAMP    DEFAULT NOW()
      )
    `);

    // ── NEW: wishlist table ───────────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id         SERIAL PRIMARY KEY,
        user_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        added_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    // ── NEW: notifications table ──────────────────────────────
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        user_id    INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title      VARCHAR(255) NOT NULL,
        message    TEXT         DEFAULT '',
        type       VARCHAR(50)  DEFAULT 'info',
        is_read    BOOLEAN      DEFAULT FALSE,
        created_at TIMESTAMP    DEFAULT NOW()
      )
    `);

    console.log('✅  Schema migration complete');
    console.log('    → Existing tables updated (users, orders, products)');
    console.log('    → New tables: addresses, wishlist, notifications');

  } catch (err) {
    console.error('❌  Schema error:', err.message);
    throw err;
  }
}

module.exports = createTables;

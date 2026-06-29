// server/src/config/schema.js
'use strict';

const { pool } = require('./db');

/**
 * Idempotent schema migration.
 * Safe to run on every startup — uses IF NOT EXISTS and conditional column checks.
 *
 * Execution order respects foreign key dependencies:
 *   users → products → orders → order_items → addresses, wishlist, notifications
 *
 * NOTE: DDL statements (CREATE TABLE, ALTER TABLE, CREATE INDEX) are executed
 * outside a single transaction because PostgreSQL does not support transactional
 * DDL for some operations (e.g., CREATE INDEX CONCURRENTLY). Each statement is
 * individually idempotent, so partial failures are safe to retry.
 */
async function createTables() {
  const client = await pool.connect();

  try {
    // ── 1. users ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id    SERIAL       PRIMARY KEY,
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

    // Add columns that may be missing from older schema versions
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT        DEFAULT ''`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender        VARCHAR(20) DEFAULT ''`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP   DEFAULT NOW()`);

    // ── 2. products ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id  SERIAL        PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        description TEXT          DEFAULT '',
        price       NUMERIC(10,2) DEFAULT 0,
        mrp         NUMERIC(10,2) DEFAULT 0,
        stock       INT           DEFAULT 0,
        unit        VARCHAR(50)   DEFAULT 'piece',
        category    VARCHAR(100)  DEFAULT '',
        image_url   TEXT          DEFAULT '',
        is_active   BOOLEAN       DEFAULT TRUE,
        created_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp       NUMERIC(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit      VARCHAR(50)   DEFAULT 'piece'`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN       DEFAULT TRUE`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category  VARCHAR(100)  DEFAULT ''`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT          DEFAULT ''`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock     INT           DEFAULT 0`);

    // ── 3. orders ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id         SERIAL        PRIMARY KEY,
        user_id          INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        status           VARCHAR(50)   DEFAULT 'pending',
        total            NUMERIC(10,2) DEFAULT 0,
        delivery_address TEXT          DEFAULT '',
        notes            TEXT          DEFAULT '',
        delivered_at     TIMESTAMP,
        created_at       TIMESTAMP     DEFAULT NOW()
      )
    `);

    // Safely add columns that may be missing from older orders table
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status           VARCHAR(50)   DEFAULT 'pending'`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT          DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes            TEXT          DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at     TIMESTAMP`);

    // ── 4. order_items ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id          SERIAL        PRIMARY KEY,
        order_id    INT           NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        product_id  INT           NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
        quantity    INT           NOT NULL DEFAULT 1,
        unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    // ── 5. addresses ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id            SERIAL       PRIMARY KEY,
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

    // ── 6. wishlist ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id         SERIAL    PRIMARY KEY,
        user_id    INT       NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
        product_id INT       NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        added_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    // ── 7. notifications ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL       PRIMARY KEY,
        user_id    INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        title      VARCHAR(255) NOT NULL,
        message    TEXT         DEFAULT '',
        type       VARCHAR(50)  DEFAULT 'info',
        is_read    BOOLEAN      DEFAULT FALSE,
        created_at TIMESTAMP    DEFAULT NOW()
      )
    `);

    // ── 8. Indexes (performance) ──────────────────────────────────────────────
    // CREATE INDEX IF NOT EXISTS is idempotent — safe to run every startup.
    // Each index is created separately; if one fails (e.g., column missing),
    // it won't block the others.
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_wishlist_user       ON wishlist(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_read  ON notifications(user_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_addresses_user      ON addresses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_active     ON products(is_active)`,
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
      } catch (indexErr) {
        // Non-fatal: log and continue — a missing index is better than failing startup
        console.warn(`⚠️  [Schema] Could not create index (skipping): ${indexErr.message}`);
      }
    }

    console.log('✅  [Schema] Migration complete');
    console.log('    → Tables: users, products, orders, order_items, addresses, wishlist, notifications');
    console.log('    → Indexes applied for performance');

  } catch (err) {
    console.error('❌  [Schema] Migration failed:', err.message);
    throw err;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

module.exports = createTables;

// server/src/config/schema.js
'use strict';

const { pool } = require('./db');

/**
 * Idempotent schema migration.
 * Safe to run on every startup — uses IF NOT EXISTS and conditional column checks.
 *
 * Execution order respects foreign key dependencies:
 *   users → seller_profiles → products → cart_items → orders → order_items
 *   → addresses, wishlist, notifications
 */
async function createTables() {
  const client = await pool.connect();

  try {
    // ── 1. users ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id       SERIAL       PRIMARY KEY,
        name          VARCHAR(150) NOT NULL DEFAULT '',
        email         VARCHAR(255) NOT NULL UNIQUE,
        phone         VARCHAR(20)  NOT NULL DEFAULT '',
        password      TEXT         NOT NULL,
        address       TEXT         DEFAULT '',
        gender        VARCHAR(20)  DEFAULT '',
        avatar_url    TEXT         DEFAULT '',
        role          VARCHAR(20)  DEFAULT 'customer',
        is_email_verified BOOLEAN  DEFAULT TRUE,
        date_of_birth DATE,
        created_at    TIMESTAMP    DEFAULT NOW(),
        updated_at    TIMESTAMP    DEFAULT NOW()
      )
    `);

    // Add columns that may be missing from older schema versions
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url    TEXT        DEFAULT ''`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender        VARCHAR(20) DEFAULT ''`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP   DEFAULT NOW()`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role         VARCHAR(20) DEFAULT 'customer'`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT TRUE`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_user_registrations (
        email          VARCHAR(255) PRIMARY KEY,
        first_name     VARCHAR(100) NOT NULL DEFAULT '',
        last_name      VARCHAR(100) NOT NULL DEFAULT '',
        phone          VARCHAR(20)  NOT NULL DEFAULT '',
        password_hash  TEXT         NOT NULL,
        otp_hash       TEXT         NOT NULL,
        otp_expires_at TIMESTAMP    NOT NULL,
        created_at     TIMESTAMP    DEFAULT NOW(),
        updated_at     TIMESTAMP    DEFAULT NOW()
      )
    `);

    // ── 2. seller_profiles ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_profiles (
        id               SERIAL        PRIMARY KEY,
        user_id          INT           NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
        business_name    VARCHAR(255)  NOT NULL DEFAULT '',
        gst_number       VARCHAR(20)   DEFAULT '',
        pan_number       VARCHAR(15)   DEFAULT '',
        business_address TEXT          DEFAULT '',
        is_verified      BOOLEAN       DEFAULT FALSE,
        created_at       TIMESTAMP     DEFAULT NOW(),
        updated_at       TIMESTAMP     DEFAULT NOW()
      )
    `);

    // ── 3. products ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        product_id    SERIAL        PRIMARY KEY,
        seller_id     INT           REFERENCES users(user_id) ON DELETE SET NULL,
        name          VARCHAR(255)  NOT NULL,
        description   TEXT          DEFAULT '',
        price         NUMERIC(10,2) DEFAULT 0,
        mrp           NUMERIC(10,2) DEFAULT 0,
        stock         INT           DEFAULT 0,
        unit          VARCHAR(50)   DEFAULT 'piece',
        category      VARCHAR(100)  DEFAULT '',
        brand         VARCHAR(100)  DEFAULT '',
        weight_grams  INT           DEFAULT 0,
        image_url     TEXT          DEFAULT '',
        images        TEXT[]        DEFAULT '{}',
        rating        NUMERIC(3,2)  DEFAULT 0,
        review_count  INT           DEFAULT 0,
        is_active     BOOLEAN       DEFAULT TRUE,
        is_approved   BOOLEAN       DEFAULT FALSE,
        created_at    TIMESTAMP     DEFAULT NOW(),
        updated_at    TIMESTAMP     DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp          NUMERIC(10,2) DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS unit         VARCHAR(50)   DEFAULT 'piece'`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active    BOOLEAN       DEFAULT TRUE`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_approved  BOOLEAN       DEFAULT FALSE`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category     VARCHAR(100)  DEFAULT ''`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url    TEXT          DEFAULT ''`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stock        INT           DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id    INT           REFERENCES users(user_id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS brand        VARCHAR(100)  DEFAULT ''`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_grams INT           DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS images       TEXT[]        DEFAULT '{}'`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS rating       NUMERIC(3,2)  DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INT           DEFAULT 0`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP     DEFAULT NOW()`);

    // ── 4. cart_items ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id          SERIAL        PRIMARY KEY,
        user_id     INT           NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
        product_id  INT           NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        quantity    INT           NOT NULL DEFAULT 1,
        added_at    TIMESTAMP     DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    // ── 5. orders ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id         SERIAL        PRIMARY KEY,
        user_id          INT           NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        status           VARCHAR(50)   DEFAULT 'pending',
        total            NUMERIC(10,2) DEFAULT 0,
        delivery_address TEXT          DEFAULT '',
        notes            TEXT          DEFAULT '',
        payment_status   VARCHAR(30)   DEFAULT 'pending',
        payment_method   VARCHAR(30)   DEFAULT 'cod',
        tracking_number  VARCHAR(100)  DEFAULT '',
        delivered_at     TIMESTAMP,
        created_at       TIMESTAMP     DEFAULT NOW(),
        updated_at       TIMESTAMP     DEFAULT NOW()
      )
    `);

    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS status          VARCHAR(50)  DEFAULT 'pending'`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT         DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes            TEXT         DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at     TIMESTAMP`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status   VARCHAR(30)  DEFAULT 'pending'`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method   VARCHAR(30)  DEFAULT 'cod'`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number  VARCHAR(100) DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMP    DEFAULT NOW()`);

    // ── 6. order_items ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id          SERIAL        PRIMARY KEY,
        order_id    INT           NOT NULL REFERENCES orders(order_id)     ON DELETE CASCADE,
        product_id  INT           NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
        quantity    INT           NOT NULL DEFAULT 1,
        unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    // ── 7. addresses ─────────────────────────────────────────────────────────
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

    // ── 8. wishlist ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id         SERIAL    PRIMARY KEY,
        user_id    INT       NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
        product_id INT       NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        added_at   TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    // ── 9. notifications ──────────────────────────────────────────────────────
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

    // ── 10. Indexes (performance) ──────────────────────────────────────────────
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_users_email             ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_users_role              ON users(role)`,
      `CREATE INDEX IF NOT EXISTS idx_pending_users_expires   ON pending_user_registrations(otp_expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category       ON products(category)`,
      `CREATE INDEX IF NOT EXISTS idx_products_active         ON products(is_active)`,
      `CREATE INDEX IF NOT EXISTS idx_products_seller         ON products(seller_id)`,
      `CREATE INDEX IF NOT EXISTS idx_products_approved       ON products(is_approved)`,
      `CREATE INDEX IF NOT EXISTS idx_cart_items_user         ON cart_items(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id          ON orders(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status           ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_order       ON order_items(order_id)`,
      `CREATE INDEX IF NOT EXISTS idx_order_items_product     ON order_items(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_wishlist_user           ON wishlist(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user      ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_read      ON notifications(user_id, is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_addresses_user          ON addresses(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_seller_profiles_user    ON seller_profiles(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reset_tokens_user       ON password_reset_tokens(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires    ON password_reset_tokens(expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_product         ON reviews(product_id)`,
      `CREATE INDEX IF NOT EXISTS idx_reviews_user            ON reviews(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_coupons_code            ON coupons(code)`,
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
      } catch (indexErr) {
        console.warn(`⚠️  [Schema] Could not create index (skipping): ${indexErr.message}`);
      }
    }

    // ── 10. password_reset_tokens ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id          SERIAL       PRIMARY KEY,
        user_id     INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash  TEXT         NOT NULL,
        expires_at  TIMESTAMP    NOT NULL,
        used_at     TIMESTAMP,
        created_at  TIMESTAMP    DEFAULT NOW()
      )
    `);

    // ── 11. reviews ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id          SERIAL       PRIMARY KEY,
        product_id  INT          NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
        user_id     INT          NOT NULL REFERENCES users(user_id)       ON DELETE CASCADE,
        order_id    INT          REFERENCES orders(order_id)              ON DELETE SET NULL,
        rating      SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title       VARCHAR(200) DEFAULT '',
        body        TEXT         DEFAULT '',
        is_verified BOOLEAN      DEFAULT FALSE,
        created_at  TIMESTAMP    DEFAULT NOW(),
        updated_at  TIMESTAMP    DEFAULT NOW(),
        UNIQUE(product_id, user_id)
      )
    `);

    // ── 12. coupons ────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id              SERIAL        PRIMARY KEY,
        code            VARCHAR(50)   NOT NULL UNIQUE,
        discount_type   VARCHAR(20)   NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
        discount_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
        min_order_value NUMERIC(10,2) DEFAULT 0,
        max_uses        INT           DEFAULT NULL,
        uses_count      INT           DEFAULT 0,
        is_active       BOOLEAN       DEFAULT TRUE,
        expires_at      TIMESTAMP,
        created_at      TIMESTAMP     DEFAULT NOW()
      )
    `);

    // ── 13. Schema additions for existing tables ────────────────────────────────
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code  VARCHAR(50) DEFAULT ''`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC(10,2) DEFAULT 0`);

    console.log('✅  [Schema] Migration complete');
    console.log('    → Tables: users, seller_profiles, products, cart_items, orders, order_items, addresses, wishlist, notifications, password_reset_tokens, reviews, coupons');
    console.log('    → Indexes applied for performance');


  } catch (err) {
    console.error('❌  [Schema] Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = createTables;

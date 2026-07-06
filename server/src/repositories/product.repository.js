// server/src/repositories/product.repository.js
'use strict';

const { pool } = require('../config/db');

class ProductRepository {

  /**
   * List products with optional filters, search, pagination.
   */
  async findAll({ category, search, minPrice, maxPrice, limit = 20, offset = 0, sellerId, isApproved = true } = {}) {
    const values = [];
    const conditions = [];
    let idx = 1;

    conditions.push(`p.is_active = TRUE`);
    if (isApproved !== null) {
      conditions.push(`p.is_approved = $${idx++}`);
      values.push(isApproved);
    }
    if (category) {
      conditions.push(`LOWER(p.category) = LOWER($${idx++})`);
      values.push(category);
    }
    if (search) {
      conditions.push(`(LOWER(p.name) LIKE LOWER($${idx++}) OR LOWER(p.description) LIKE LOWER($${idx++}))`);
      values.push(`%${search}%`, `%${search}%`);
      idx++; // account for duplicate binding
    }
    if (minPrice !== undefined) {
      conditions.push(`p.price >= $${idx++}`);
      values.push(minPrice);
    }
    if (maxPrice !== undefined) {
      conditions.push(`p.price <= $${idx++}`);
      values.push(maxPrice);
    }
    if (sellerId) {
      conditions.push(`p.seller_id = $${idx++}`);
      values.push(sellerId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT p.product_id, p.name, p.description, p.price, p.mrp, p.stock, p.unit,
              p.category, p.brand, p.image_url, p.images, p.rating, p.review_count,
              p.is_active, p.is_approved, p.seller_id, p.created_at,
              COALESCE(sp.business_name, u.name) AS seller_name
       FROM products p
       LEFT JOIN users u ON u.user_id = p.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );
    return rows;
  }

  /** Count total products matching filters (for pagination) */
  async count({ category, search, minPrice, maxPrice, sellerId, isApproved = true } = {}) {
    const values = [];
    const conditions = [`is_active = TRUE`];
    let idx = 1;

    if (isApproved !== null) { conditions.push(`is_approved = $${idx++}`); values.push(isApproved); }
    if (category) { conditions.push(`LOWER(category) = LOWER($${idx++})`); values.push(category); }
    if (search) { conditions.push(`(LOWER(name) LIKE LOWER($${idx++}))`); values.push(`%${search}%`); }
    if (minPrice !== undefined) { conditions.push(`price >= $${idx++}`); values.push(minPrice); }
    if (maxPrice !== undefined) { conditions.push(`price <= $${idx++}`); values.push(maxPrice); }
    if (sellerId) { conditions.push(`seller_id = $${idx++}`); values.push(sellerId); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(`SELECT COUNT(*) as total FROM products ${where}`, values);
    return parseInt(rows[0].total, 10);
  }

  async findById(productId) {
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(sp.business_name, u.name) AS seller_name
       FROM products p
       LEFT JOIN users u ON u.user_id = p.seller_id
       LEFT JOIN seller_profiles sp ON sp.user_id = p.seller_id
       WHERE p.product_id = $1 AND p.is_active = TRUE`,
      [productId]
    );
    return rows[0] || null;
  }

  async create({ sellerId, name, description, price, mrp, stock, unit, category, brand, weight_grams, image_url, images }) {
    const { rows } = await pool.query(
      `INSERT INTO products (seller_id, name, description, price, mrp, stock, unit, category, brand, weight_grams, image_url, images, is_approved, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, TRUE, TRUE)
       RETURNING *`,
      [sellerId, name, description ?? '', price ?? 0, mrp ?? price ?? 0,
       stock ?? 0, unit ?? 'piece', category ?? '', brand ?? '',
       weight_grams ?? 0, image_url ?? '', images ?? []]
    );
    return rows[0];
  }

  async update(productId, sellerId, fields) {
    const allowed = ['name','description','price','mrp','stock','unit','category','brand','weight_grams','image_url','images','is_active'];
    const sets = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      if (allowed.includes(key)) {
        sets.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
    if (sets.length === 0) throw new Error('No valid fields to update.');
    sets.push(`updated_at = NOW()`);

    values.push(productId, sellerId);
    const { rows } = await pool.query(
      `UPDATE products SET ${sets.join(', ')} WHERE product_id = $${idx++} AND seller_id = $${idx++} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async softDelete(productId, sellerId) {
    const { rows } = await pool.query(
      `UPDATE products SET is_active = FALSE, updated_at = NOW()
       WHERE product_id = $1 AND seller_id = $2 RETURNING product_id`,
      [productId, sellerId]
    );
    return rows[0] || null;
  }

  /** Get distinct categories */
  async getCategories() {
    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM products WHERE is_active = TRUE AND category != '' ORDER BY category`
    );
    return rows.map(r => r.category);
  }
}

module.exports = new ProductRepository();

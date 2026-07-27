/**
 * fix_product_images.js
 * Updates every product's image_url in the DB to a working Unsplash photo
 * matched by category. Run once: node server/scripts/fix_product_images.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../src/config/db');

// One representative Unsplash photo per category
const CATEGORY_IMAGES = {
  'Farming Equipment': [
    'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop&q=80',
  ],
  'Seeds & Fertilizers': [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&h=600&fit=crop&q=80',
  ],
  'Groceries': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506617564039-2f3b650b7010?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=600&h=600&fit=crop&q=80',
  ],
  'Medicine & Health': [
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550572017-edd951aa8ca6?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=600&fit=crop&q=80',
  ],
  'Electronics': [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&q=80',
  ],
  'Home & Kitchen': [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&h=600&fit=crop&q=80',
  ],
  'Livestock Care': [
    'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&h=600&fit=crop&q=80',
  ],
  'Clothing': [
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop&q=80',
  ],
  'Tools & Hardware': [
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=600&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=600&h=600&fit=crop&q=80',
  ],
};

async function fixImages() {
  const client = await pool.connect();
  try {
    // Fetch all products with their category
    const { rows: products } = await client.query(
      `SELECT product_id, category FROM products ORDER BY product_id`
    );

    // Track index per category for variety
    const categoryCounters = {};
    let updated = 0;

    for (const product of products) {
      const imgs = CATEGORY_IMAGES[product.category];
      if (!imgs) {
        console.warn(`  ⚠ No image map for category: "${product.category}" (product ${product.product_id})`);
        continue;
      }

      const idx = (categoryCounters[product.category] ?? 0) % imgs.length;
      categoryCounters[product.category] = idx + 1;

      await client.query(
        `UPDATE products SET image_url = $1, updated_at = NOW() WHERE product_id = $2`,
        [imgs[idx], product.product_id]
      );
      updated++;
    }

    console.log(`\n✅ Done! Updated ${updated} product images.`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixImages();

require('dotenv').config({ path: '../.env' });
const { pool } = require('../src/config/db');

const products = [
  // Farming Equipment
  { name: 'Garden Water Spray Pump', category: 'Farming Equipment', price: 1799, mrp: 2199, stock: 20, unit: 'piece' },
  { name: 'Agricultural Hand Sprayer', category: 'Farming Equipment', price: 999, mrp: 1299, stock: 30, unit: 'piece' },
  { name: 'Heavy Duty Shovel', category: 'Farming Equipment', price: 499, mrp: 650, stock: 50, unit: 'piece' },
  { name: 'Steel Rake', category: 'Farming Equipment', price: 399, mrp: 550, stock: 40, unit: 'piece' },
  { name: 'Wheelbarrow 80L', category: 'Farming Equipment', price: 3499, mrp: 4500, stock: 15, unit: 'piece' },
  { name: 'Water Hose 50m', category: 'Farming Equipment', price: 899, mrp: 1200, stock: 100, unit: 'piece' },
  { name: 'Pruning Shears', category: 'Farming Equipment', price: 299, mrp: 450, stock: 60, unit: 'piece' },
  { name: 'Tractor Trolley Jack', category: 'Farming Equipment', price: 1299, mrp: 1800, stock: 25, unit: 'piece' },
  { name: 'Solar Crop Protector', category: 'Farming Equipment', price: 2599, mrp: 3500, stock: 10, unit: 'piece' },
  { name: 'Seed Drill Machine', category: 'Farming Equipment', price: 5499, mrp: 7000, stock: 5, unit: 'piece' },

  // Seeds & Fertilizers
  { name: 'Paddy Seeds 10kg', category: 'Seeds & Fertilizers', price: 899, mrp: 999, stock: 100, unit: 'bag' },
  { name: 'Urea Fertilizer 50kg', category: 'Seeds & Fertilizers', price: 1250, mrp: 1450, stock: 50, unit: 'bag' },
  { name: 'DAP Fertilizer 50kg', category: 'Seeds & Fertilizers', price: 1450, mrp: 1600, stock: 40, unit: 'bag' },
  { name: 'Organic Compost 10kg', category: 'Seeds & Fertilizers', price: 299, mrp: 399, stock: 150, unit: 'bag' },
  { name: 'Hybrid Wheat Seeds 5kg', category: 'Seeds & Fertilizers', price: 450, mrp: 550, stock: 80, unit: 'bag' },
  { name: 'Tomato Seeds Packet', category: 'Seeds & Fertilizers', price: 49, mrp: 99, stock: 500, unit: 'packet' },
  { name: 'Chili Seeds Packet', category: 'Seeds & Fertilizers', price: 39, mrp: 79, stock: 400, unit: 'packet' },
  { name: 'Neem Cake Fertilizer 5kg', category: 'Seeds & Fertilizers', price: 350, mrp: 450, stock: 100, unit: 'bag' },
  { name: 'Zinc Sulphate 1kg', category: 'Seeds & Fertilizers', price: 120, mrp: 180, stock: 200, unit: 'packet' },
  { name: 'NPK 19:19:19 Fertilizer 1kg', category: 'Seeds & Fertilizers', price: 180, mrp: 250, stock: 120, unit: 'packet' },

  // Groceries
  { name: 'Organic Basmati Rice 5kg', category: 'Groceries', price: 549, mrp: 699, stock: 200, unit: 'bag' },
  { name: 'Premium Wheat Flour 10kg', category: 'Groceries', price: 499, mrp: 599, stock: 80, unit: 'bag' },
  { name: 'Fresh Tomatoes', category: 'Groceries', price: 45, mrp: 60, stock: 150, unit: 'kg' },
  { name: 'Cow Milk 1L', category: 'Groceries', price: 68, mrp: 75, stock: 40, unit: 'liter' },
  { name: 'Toor Dal 1kg', category: 'Groceries', price: 160, mrp: 190, stock: 100, unit: 'kg' },
  { name: 'Mustard Oil 1L', category: 'Groceries', price: 145, mrp: 180, stock: 150, unit: 'bottle' },
  { name: 'Sugar 1kg', category: 'Groceries', price: 42, mrp: 50, stock: 300, unit: 'kg' },
  { name: 'Salt 1kg', category: 'Groceries', price: 20, mrp: 25, stock: 400, unit: 'kg' },
  { name: 'Red Chili Powder 500g', category: 'Groceries', price: 150, mrp: 200, stock: 120, unit: 'packet' },
  { name: 'Turmeric Powder 500g', category: 'Groceries', price: 130, mrp: 170, stock: 140, unit: 'packet' },

  // Medicine & Health
  { name: 'Dettol Liquid Disinfectant 1L', category: 'Medicine & Health', price: 330, mrp: 390, stock: 120, unit: 'bottle' },
  { name: 'Paracetamol 500mg (10 tabs)', category: 'Medicine & Health', price: 15, mrp: 20, stock: 500, unit: 'strip' },
  { name: 'First Aid Kit Basic', category: 'Medicine & Health', price: 499, mrp: 750, stock: 50, unit: 'kit' },
  { name: 'Vitamin C Tablets (60 tabs)', category: 'Medicine & Health', price: 250, mrp: 350, stock: 200, unit: 'bottle' },
  { name: 'Cough Syrup 100ml', category: 'Medicine & Health', price: 85, mrp: 110, stock: 150, unit: 'bottle' },
  { name: 'Antiseptic Cream 25g', category: 'Medicine & Health', price: 55, mrp: 75, stock: 250, unit: 'tube' },
  { name: 'Band-Aid (Pack of 100)', category: 'Medicine & Health', price: 120, mrp: 150, stock: 300, unit: 'box' },
  { name: 'Hand Sanitizer 500ml', category: 'Medicine & Health', price: 150, mrp: 250, stock: 180, unit: 'bottle' },
  { name: 'Ayurvedic Pain Relief Oil 100ml', category: 'Medicine & Health', price: 199, mrp: 299, stock: 100, unit: 'bottle' },
  { name: 'ORSL Rehydration Drink 200ml', category: 'Medicine & Health', price: 35, mrp: 45, stock: 400, unit: 'pack' },

  // Electronics
  { name: 'Amazon Echo Dot (4th Gen)', category: 'Electronics', price: 3499, mrp: 4499, stock: 50, unit: 'piece' },
  { name: 'Samsung Galaxy M14 5G', category: 'Electronics', price: 13490, mrp: 17990, stock: 15, unit: 'piece' },
  { name: 'boAt Rockerz 450 Bluetooth Headphones', category: 'Electronics', price: 1499, mrp: 3990, stock: 100, unit: 'piece' },
  { name: 'Mi Power Bank 10000mAh', category: 'Electronics', price: 1199, mrp: 1999, stock: 80, unit: 'piece' },
  { name: 'Sandisk 64GB Pen Drive', category: 'Electronics', price: 450, mrp: 800, stock: 150, unit: 'piece' },
  { name: 'Philips Trimmer BT1232/15', category: 'Electronics', price: 899, mrp: 1195, stock: 60, unit: 'piece' },
  { name: 'Zebronics Wired Keyboard & Mouse', category: 'Electronics', price: 499, mrp: 799, stock: 120, unit: 'set' },
  { name: 'Crompton 9W LED Bulb (Pack of 2)', category: 'Electronics', price: 149, mrp: 250, stock: 200, unit: 'pack' },
  { name: 'Fastrack Reflex Smartwatch', category: 'Electronics', price: 1995, mrp: 2995, stock: 40, unit: 'piece' },
  { name: 'Syska Extension Board', category: 'Electronics', price: 399, mrp: 650, stock: 90, unit: 'piece' },

  // Home & Kitchen
  { name: 'Milton Thermosteel Flask 1L', category: 'Home & Kitchen', price: 899, mrp: 1150, stock: 60, unit: 'piece' },
  { name: 'Pigeon Polypropylene Mini Chopper', category: 'Home & Kitchen', price: 199, mrp: 395, stock: 200, unit: 'piece' },
  { name: 'Prestige 3L Pressure Cooker', category: 'Home & Kitchen', price: 1299, mrp: 1750, stock: 45, unit: 'piece' },
  { name: 'Bajaj Iron 1000W', category: 'Home & Kitchen', price: 650, mrp: 899, stock: 70, unit: 'piece' },
  { name: 'Butterfly Mixer Grinder 750W', category: 'Home & Kitchen', price: 2999, mrp: 4500, stock: 30, unit: 'piece' },
  { name: 'Cello Plastic Container Set (18 Pcs)', category: 'Home & Kitchen', price: 599, mrp: 999, stock: 85, unit: 'set' },
  { name: 'Non-Stick Dosa Tawa 28cm', category: 'Home & Kitchen', price: 799, mrp: 1250, stock: 50, unit: 'piece' },
  { name: 'Cotton Bed Sheet with 2 Pillow Covers', category: 'Home & Kitchen', price: 499, mrp: 999, stock: 110, unit: 'set' },
  { name: 'Stainless Steel Water Bottle 1L', category: 'Home & Kitchen', price: 299, mrp: 450, stock: 140, unit: 'piece' },
  { name: 'Broom & Dustpan Set', category: 'Home & Kitchen', price: 250, mrp: 350, stock: 160, unit: 'set' },

  // Livestock Care
  { name: 'Cattle Feed Pellets 50kg', category: 'Livestock Care', price: 1200, mrp: 1400, stock: 50, unit: 'bag' },
  { name: 'Poultry Feed 50kg', category: 'Livestock Care', price: 1350, mrp: 1550, stock: 40, unit: 'bag' },
  { name: 'Calcium Tonic for Cattle 1L', category: 'Livestock Care', price: 250, mrp: 350, stock: 100, unit: 'bottle' },
  { name: 'Deworming Liquid 100ml', category: 'Livestock Care', price: 180, mrp: 250, stock: 80, unit: 'bottle' },
  { name: 'Livestock Wound Spray', category: 'Livestock Care', price: 150, mrp: 200, stock: 120, unit: 'bottle' },
  { name: 'Salt Lick Mineral Block', category: 'Livestock Care', price: 120, mrp: 180, stock: 90, unit: 'block' },
  { name: 'Milking Machine Tube', category: 'Livestock Care', price: 450, mrp: 600, stock: 30, unit: 'piece' },
  { name: 'Animal Grooming Brush', category: 'Livestock Care', price: 150, mrp: 250, stock: 70, unit: 'piece' },
  { name: 'Goat Feed Supplement 5kg', category: 'Livestock Care', price: 300, mrp: 400, stock: 60, unit: 'bag' },
  { name: 'Fish Pond Feed 20kg', category: 'Livestock Care', price: 850, mrp: 1100, stock: 25, unit: 'bag' },

  // Clothing
  { name: 'Men\'s Cotton T-Shirt', category: 'Clothing', price: 299, mrp: 599, stock: 200, unit: 'piece' },
  { name: 'Women\'s Floral Kurti', category: 'Clothing', price: 499, mrp: 999, stock: 150, unit: 'piece' },
  { name: 'Kids Casual Shorts', category: 'Clothing', price: 199, mrp: 399, stock: 250, unit: 'piece' },
  { name: 'Men\'s Denim Jeans', category: 'Clothing', price: 799, mrp: 1499, stock: 100, unit: 'piece' },
  { name: 'Winter Woolen Cap', category: 'Clothing', price: 150, mrp: 299, stock: 300, unit: 'piece' },
  { name: 'Women\'s Cotton Saree', category: 'Clothing', price: 899, mrp: 1599, stock: 80, unit: 'piece' },
  { name: 'Unisex Sports Jacket', category: 'Clothing', price: 1299, mrp: 2499, stock: 60, unit: 'piece' },
  { name: 'Men\'s Formal Shirt', category: 'Clothing', price: 599, mrp: 1199, stock: 120, unit: 'piece' },
  { name: 'Leather Belt', category: 'Clothing', price: 250, mrp: 499, stock: 180, unit: 'piece' },
  { name: 'Cotton Socks (Pack of 3)', category: 'Clothing', price: 199, mrp: 350, stock: 400, unit: 'pack' },

  // Tools & Hardware
  { name: 'Bosch GSB 500W Power Drill', category: 'Tools & Hardware', price: 2199, mrp: 2999, stock: 25, unit: 'piece' },
  { name: 'Taparia 8-inch Plier', category: 'Tools & Hardware', price: 250, mrp: 350, stock: 100, unit: 'piece' },
  { name: 'Screwdriver Set (10 Pcs)', category: 'Tools & Hardware', price: 350, mrp: 550, stock: 120, unit: 'set' },
  { name: 'Claw Hammer 250g', category: 'Tools & Hardware', price: 299, mrp: 450, stock: 80, unit: 'piece' },
  { name: 'Measuring Tape 5m', category: 'Tools & Hardware', price: 150, mrp: 250, stock: 200, unit: 'piece' },
  { name: 'Adjustable Wrench 10-inch', category: 'Tools & Hardware', price: 399, mrp: 599, stock: 70, unit: 'piece' },
  { name: 'Hand Saw 18-inch', category: 'Tools & Hardware', price: 299, mrp: 499, stock: 60, unit: 'piece' },
  { name: 'Drill Bit Set (13 Pcs)', category: 'Tools & Hardware', price: 450, mrp: 750, stock: 90, unit: 'set' },
  { name: 'Heavy Duty Padlock', category: 'Tools & Hardware', price: 499, mrp: 799, stock: 150, unit: 'piece' },
  { name: 'Water Pump Pliers', category: 'Tools & Hardware', price: 250, mrp: 400, stock: 85, unit: 'piece' },
];

async function seed() {
  const client = await pool.connect();
  try {
    // 1. Get or create a dummy user
    let res = await client.query(`SELECT user_id FROM users WHERE email = 'seller@rural.com'`);
    let sellerId;
    if (res.rows.length === 0) {
      console.log('Creating dummy seller user...');
      res = await client.query(`
        INSERT INTO users (name, email, phone, password, is_email_verified)
        VALUES ('Rural Seller', 'seller@rural.com', '9999999999', 'dummy', true)
        RETURNING user_id
      `);
      sellerId = res.rows[0].user_id;

      await client.query(`
        INSERT INTO seller_profiles (user_id, business_name, is_verified)
        VALUES ($1, 'Rural Super Store', true)
      `, [sellerId]);
    } else {
      sellerId = res.rows[0].user_id;
    }

    // Clear existing products for this seller to avoid duplicates
    console.log('Clearing old products for this seller...');
    await client.query('DELETE FROM products WHERE seller_id = $1', [sellerId]);

    // 2. Insert products
    console.log(`Inserting ${products.length} products for seller ${sellerId}...`);
    for (const p of products) {
      await client.query(`
        INSERT INTO products (seller_id, name, description, price, mrp, stock, unit, category, is_approved, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
      `, [sellerId, p.name, 'High quality ' + p.name, p.price, p.mrp, p.stock, p.unit, p.category]);
    }

    console.log('Successfully seeded products!');
  } catch (err) {
    console.error('Error seeding products:', err);
  } finally {
    client.release();
    pool.end();
  }
}

seed();

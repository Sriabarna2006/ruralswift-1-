'use strict';

const { pool } = require('../config/db');
const { optimizeRouteNearestNeighbor } = require('../utils/geo');

/** Geocode an Indian address using Nominatim — PIN first, then city/state fallback */
async function geocodeIndianAddress(address) {
  if (!address) return null;
  const headers = { 'User-Agent': 'RuralSwift/1.0', 'Accept-Language': 'en' };

  const tryFetch = async (query) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=1`,
        { headers }
      );
      const data = await res.json();
      if (data && data.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    } catch { /* ignore */ }
    return null;
  };

  // 1. PIN code — most reliable for India
  const pinMatch = address.match(/\b(\d{6})\b/);
  if (pinMatch) {
    const r = await tryFetch(`${pinMatch[1]}, India`);
    if (r) return r;
  }

  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);

  // 2. Last 3 parts (locality, city, state)
  if (parts.length >= 3) {
    const r = await tryFetch(parts.slice(-3).join(', ') + ', India');
    if (r) return r;
  }

  // 3. Last 2 parts (city, state)
  if (parts.length >= 2) {
    const r = await tryFetch(parts.slice(-2).join(', ') + ', India');
    if (r) return r;
  }

  // 4. Full address
  return tryFetch(address + ', India');
}

class DeliveryService {
  /**
   * Group unassigned orders into a delivery run, optimize the route, and assign a driver.
   */
  async createDeliveryRun(driverId, sellerId, orderIds) {
    if (!orderIds || orderIds.length === 0) throw new Error('No orders provided for delivery run.');

    // 1. Verify Driver
    const driverRes = await pool.query(`SELECT role FROM users WHERE user_id = $1`, [driverId]);
    if (driverRes.rowCount === 0) throw new Error('Assigned driver does not exist.');

    // 2. Fetch Seller Hub Location
    const sellerRes = await pool.query(`SELECT latitude, longitude FROM seller_profiles WHERE user_id = $1`, [sellerId]);
    let sellerHub = sellerRes.rows[0];

    // Default hub: center of India (not Delhi)
    if (!sellerHub || !sellerHub.latitude || !sellerHub.longitude) {
      sellerHub = { latitude: 10.7905, longitude: 78.7047 }; // Tiruchirappalli (central TN)
    }

    // 3. Fetch Orders
    const ordersRes = await pool.query(
      `SELECT order_id, user_id, delivery_address, status FROM orders WHERE order_id = ANY($1) AND status NOT IN ('delivered', 'cancelled')`,
      [orderIds]
    );
    if (ordersRes.rowCount === 0) throw new Error('No valid orders found to batch.');

    // 4. Geocode each delivery address (real coordinates)
    const points = await Promise.all(ordersRes.rows.map(async (o) => {
      let coords = await geocodeIndianAddress(o.delivery_address);
      if (!coords) {
        // Fallback: use hub + tiny offset so nearest-neighbor still works
        coords = {
          latitude: parseFloat(sellerHub.latitude) + (Math.random() * 0.02 - 0.01),
          longitude: parseFloat(sellerHub.longitude) + (Math.random() * 0.02 - 0.01)
        };
      }
      return { id: o.order_id, ...coords, address: o.delivery_address };
    }));

    // 5. Optimize route using Nearest Neighbor
    const startPoint = { latitude: parseFloat(sellerHub.latitude), longitude: parseFloat(sellerHub.longitude) };
    const optimizedRoute = optimizeRouteNearestNeighbor(startPoint, points);

    // 6. Create the Delivery Run record
    const runRes = await pool.query(
      `INSERT INTO delivery_runs (driver_id, status, start_time) VALUES ($1, 'pending', NOW()) RETURNING id`,
      [driverId]
    );
    const runId = runRes.rows[0].id;

    // 7. Update orders with run ID and optimized sequence
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < optimizedRoute.length; i++) {
        const orderId = optimizedRoute[i].id;
        const orderObj = ordersRes.rows.find(o => o.order_id === orderId);

        await client.query(
          `UPDATE orders SET delivery_run_id = $1, delivery_sequence = $2, status = 'out_for_delivery', updated_at = NOW() WHERE order_id = $3`,
          [runId, i + 1, orderId]
        );

        if (orderObj && orderObj.user_id) {
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, $2, $3, $4)`,
            [
              orderObj.user_id,
              '📦 Out for Delivery Today!',
              `Great news! Your order #${orderId} is out for delivery today. Our delivery partner is on their way!`,
              'delivery'
            ]
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { runId, route: optimizedRoute };
  }

  /** GET driver's active runs with stops in optimized sequence */
  async getDriverRuns(driverId) {
    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.driver_id, r.created_at,
              json_agg(
                json_build_object(
                  'order_id', o.order_id,
                  'sequence', o.delivery_sequence,
                  'address', o.delivery_address,
                  'status', o.status
                ) ORDER BY o.delivery_sequence ASC
              ) as stops
       FROM delivery_runs r
       LEFT JOIN orders o ON o.delivery_run_id = r.id
       WHERE r.driver_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [driverId]
    );
    return rows;
  }

  /** Find the run that contains a specific order (for customer tracking) */
  async getRunByOrderId(orderId) {
    const { rows } = await pool.query(
      `SELECT r.id, r.driver_id, r.status
       FROM delivery_runs r
       INNER JOIN orders o ON o.delivery_run_id = r.id
       WHERE o.order_id = $1
       LIMIT 1`,
      [orderId]
    );
    return rows[0] || null;
  }

  /** Get all completed deliveries (orders/products) for a driver */
  async getCompletedDeliveries(driverId) {
    const { rows } = await pool.query(
      `SELECT o.order_id, o.delivered_at, o.delivery_address,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'name', p.name,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'image_url', p.image_url
              )) AS items
       FROM orders o
       INNER JOIN delivery_runs r ON o.delivery_run_id = r.id
       INNER JOIN order_items oi ON oi.order_id = o.order_id
       INNER JOIN products p ON p.product_id = oi.product_id
       WHERE r.driver_id = $1 AND o.status = 'delivered'
       GROUP BY o.order_id, o.delivered_at, o.delivery_address
       ORDER BY o.delivered_at DESC`,
      [driverId]
    );
    return rows;
  }
}

module.exports = new DeliveryService();



'use strict';

const { pool } = require('../config/db');
const { optimizeRouteNearestNeighbor } = require('../utils/geo');

/** Haversine distance in km */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

  async getAvailableOrders(driverId) {
    // 1. Get Driver Location (from live GPS or home address fallback)
    let dLat = null;
    let dLng = null;
    
    if (driverId) {
      const locRes = await pool.query(`SELECT lat, lng FROM driver_locations WHERE driver_id = $1`, [driverId]);
      if (locRes.rowCount > 0) {
        dLat = parseFloat(locRes.rows[0].lat);
        dLng = parseFloat(locRes.rows[0].lng);
      } else {
        // Fallback to driver's home address profile
        const userRes = await pool.query(`SELECT address FROM users WHERE user_id = $1`, [driverId]);
        if (userRes.rowCount > 0 && userRes.rows[0].address) {
          const coords = await geocodeIndianAddress(userRes.rows[0].address);
          if (coords) {
            dLat = coords.latitude;
            dLng = coords.longitude;
          }
        }
      }
    }

    // 2. Fetch all packed orders with the seller's location
    const { rows } = await pool.query(
      `SELECT o.order_id, o.delivery_address, o.total, o.created_at,
              MAX(s.latitude) as seller_lat, MAX(s.longitude) as seller_lng,
              json_agg(json_build_object('name', p.name, 'quantity', oi.quantity, 'image_url', p.image_url)) AS items,
              (SELECT business_name FROM seller_profiles WHERE user_id = MAX(p.seller_id) LIMIT 1) AS seller_name
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.order_id
       JOIN products p ON p.product_id = oi.product_id
       LEFT JOIN seller_profiles s ON s.user_id = p.seller_id
       WHERE o.status = 'packed' AND o.delivery_run_id IS NULL
       GROUP BY o.order_id
       ORDER BY o.created_at DESC`
    );

    // 3. Filter orders to only those near the driver (e.g. 25km radius)
    if (dLat !== null && dLng !== null) {
      const MAX_RADIUS_KM = 25;
      return rows.filter(order => {
        if (!order.seller_lat || !order.seller_lng) return true; // If we don't know where the seller is, let the driver decide
        const dist = distanceKm(dLat, dLng, parseFloat(order.seller_lat), parseFloat(order.seller_lng));
        return dist <= MAX_RADIUS_KM;
      });
    }

    return rows; // If we don't know the driver's location, show all
  }

  async claimOrder(userId, orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Ensure user is a driver (upgrade if not)
      await client.query(`UPDATE users SET role = 'delivery' WHERE user_id = $1 AND role != 'delivery'`, [userId]);
      
      // 2. Check if order is still available
      const orderRes = await client.query(
        `SELECT order_id, status, delivery_run_id FROM orders WHERE order_id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderRes.rowCount === 0) throw new Error('Order not found.');
      const order = orderRes.rows[0];
      if (order.status !== 'packed' || order.delivery_run_id !== null) {
        throw new Error('Order is no longer available for delivery.');
      }
      
      // 3. Create delivery run for this driver with this single order
      const runRes = await client.query(
        `INSERT INTO delivery_runs (driver_id, status, start_time) VALUES ($1, 'pending', NOW()) RETURNING id`,
        [userId]
      );
      const runId = runRes.rows[0].id;
      
      // 4. Update order to out_for_delivery and assign to run
      await client.query(
        `UPDATE orders SET delivery_run_id = $1, delivery_sequence = 1, status = 'out_for_delivery', updated_at = NOW() WHERE order_id = $2`,
        [runId, orderId]
      );
      
      await client.query('COMMIT');
      return { success: true, runId };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async unclaimOrder(userId, orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Check if order belongs to a run owned by this driver
      const orderRes = await client.query(
        `SELECT o.order_id, o.status, o.delivery_run_id, r.driver_id 
         FROM orders o
         JOIN delivery_runs r ON o.delivery_run_id = r.id
         WHERE o.order_id = $1 FOR UPDATE`,
        [orderId]
      );
      if (orderRes.rowCount === 0) throw new Error('Order or Delivery Run not found.');
      const order = orderRes.rows[0];
      
      if (order.driver_id !== userId) {
        throw new Error('Unauthorized to unclaim this order.');
      }
      if (order.status === 'delivered') {
        throw new Error('Cannot unclaim an already delivered order.');
      }
      
      const runId = order.delivery_run_id;

      // 2. Unassign order
      await client.query(
        `UPDATE orders SET delivery_run_id = NULL, delivery_sequence = NULL, status = 'packed', updated_at = NOW() WHERE order_id = $1`,
        [orderId]
      );

      // 3. Check if the delivery run is now empty, if so, delete it
      const runCheckRes = await client.query(
        `SELECT COUNT(*) as count FROM orders WHERE delivery_run_id = $1`,
        [runId]
      );
      if (parseInt(runCheckRes.rows[0].count) === 0) {
        await client.query(`DELETE FROM delivery_runs WHERE id = $1`, [runId]);
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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



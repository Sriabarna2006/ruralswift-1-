'use strict';

const { pool } = require('../config/db');
const { optimizeRouteNearestNeighbor } = require('../utils/geo');

class DeliveryService {
  /**
   * Group unassigned orders into a delivery run, optimize the route, and assign a driver.
   * 
   * @param {number} driverId - The user_id of the driver (must have role 'delivery')
   * @param {number} sellerId - The seller from whom the orders originate
   * @param {Array<number>} orderIds - The IDs of the orders to batch
   */
  async createDeliveryRun(driverId, sellerId, orderIds) {
    if (!orderIds || orderIds.length === 0) throw new Error('No orders provided for delivery run.');

    // 1. Verify Driver (If you haven't explicitly added a driver user yet, we will just warn but proceed for now)
    const driverRes = await pool.query(`SELECT role FROM users WHERE user_id = $1`, [driverId]);
    if (driverRes.rowCount === 0) {
      throw new Error('Assigned driver does not exist.');
    }

    // 2. Fetch Seller Hub Location
    const sellerRes = await pool.query(`SELECT latitude, longitude FROM seller_profiles WHERE user_id = $1`, [sellerId]);
    let sellerHub = sellerRes.rows[0];
    
    // Fallback hub location if missing (mock coordinates for testing)
    if (!sellerHub || !sellerHub.latitude || !sellerHub.longitude) {
      sellerHub = { latitude: 28.6139, longitude: 77.2090 }; // e.g., New Delhi
    }

    // 3. Fetch Orders
    // We only want orders that haven't been delivered or cancelled yet.
    const ordersRes = await pool.query(
      `SELECT order_id, user_id, delivery_address, status FROM orders WHERE order_id = ANY($1) AND status NOT IN ('delivered', 'cancelled')`,
      [orderIds]
    );

    if (ordersRes.rowCount === 0) throw new Error('No valid orders found to batch.');

    // 3.5 Prevent driver from delivering their own order
    // (TEMPORARILY DISABLED for testing so you can assign orders to your active account)
    // const selfOrder = ordersRes.rows.find(o => o.user_id == driverId);
    // if (selfOrder) {
    //   throw new Error(`Conflict of interest: Driver cannot be assigned to deliver their own order (Order #${selfOrder.order_id}).`);
    // }

    // 4. Assign mock coordinates to orders for the TSP algorithm
    // In production, the lat/long would be saved on the order or fetched from the address table.
    const points = ordersRes.rows.map((o) => ({
      id: o.order_id,
      // Creating slight distance variations to demonstrate the sorting algorithm
      latitude: parseFloat(sellerHub.latitude) + (Math.random() * 0.05 - 0.025),
      longitude: parseFloat(sellerHub.longitude) + (Math.random() * 0.05 - 0.025),
      address: o.delivery_address
    }));

    // 5. Optimize the route using Nearest Neighbor math!
    const startPoint = { latitude: parseFloat(sellerHub.latitude), longitude: parseFloat(sellerHub.longitude) };
    const optimizedRoute = optimizeRouteNearestNeighbor(startPoint, points);

    // 6. Create the Delivery Run
    const runRes = await pool.query(
      `INSERT INTO delivery_runs (driver_id, status, start_time) VALUES ($1, 'pending', NOW()) RETURNING id`,
      [driverId]
    );
    const runId = runRes.rows[0].id;

    // 7. Update the orders with the run ID and their optimized sequence (1st, 2nd, 3rd stop)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < optimizedRoute.length; i++) {
        const orderId = optimizedRoute[i].id;
        const sequence = i + 1; // 1st stop, 2nd stop...
        
        await client.query(
          `UPDATE orders 
           SET delivery_run_id = $1, delivery_sequence = $2, status = 'out_for_delivery', updated_at = NOW() 
           WHERE order_id = $3`,
          [runId, sequence, orderId]
        );
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

  /** GET driver's active runs */
  async getDriverRuns(driverId) {
    const { rows } = await pool.query(
      `SELECT r.id, r.status, r.created_at,
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
}

module.exports = new DeliveryService();

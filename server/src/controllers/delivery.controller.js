'use strict';
const deliveryService = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response');
const { pool } = require('../config/db');

class DeliveryController {
  async createRun(req, res, next) {
    try {
      const { driverId, orderIds } = req.body;
      if (!driverId || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return sendError(res, 400, 'driverId and an array of orderIds are required.', 'VALIDATION_ERROR');
      }
      const result = await deliveryService.createDeliveryRun(driverId, req.user.id, orderIds);
      return sendSuccess(res, 201, 'Delivery run optimized and created.', { data: result });
    } catch (err) {
      next(err);
    }
  }

  async getAvailableOrders(req, res, next) {
    try {
      const orders = await deliveryService.getAvailableOrders();
      return sendSuccess(res, 200, 'Available orders fetched.', { data: { orders } });
    } catch (err) {
      next(err);
    }
  }

  async claimOrder(req, res, next) {
    try {
      const { orderId } = req.body;
      if (!orderId) return sendError(res, 400, 'orderId is required.', 'VALIDATION_ERROR');
      
      const result = await deliveryService.claimOrder(req.user.id, orderId);
      return sendSuccess(res, 200, 'Order claimed successfully.', { data: result });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('no longer available')) {
        return sendError(res, 400, err.message, 'NOT_AVAILABLE');
      }
      next(err);
    }
  }

  async unclaimOrder(req, res, next) {
    try {
      const { orderId } = req.body;
      if (!orderId) return sendError(res, 400, 'orderId is required.', 'VALIDATION_ERROR');
      
      const result = await deliveryService.unclaimOrder(req.user.id, orderId);
      return sendSuccess(res, 200, 'Order unclaimed successfully.', { data: result });
    } catch (err) {
      if (err.message.includes('not found') || err.message.includes('Unauthorized') || err.message.includes('Cannot unclaim')) {
        return sendError(res, 400, err.message, 'BAD_REQUEST');
      }
      next(err);
    }
  }

  async getRuns(req, res, next) {
    try {
      const runs = await deliveryService.getDriverRuns(req.user.id);
      return sendSuccess(res, 200, 'Delivery runs fetched.', { data: { runs } });
    } catch (err) {
      next(err);
    }
  }

  // Driver calls this every 5 seconds with their current GPS coords
  async updateLocation(req, res, next) {
    try {
      const { lat, lng } = req.body;
      if (!lat || !lng) return sendError(res, 400, 'lat and lng are required', 'VALIDATION_ERROR');
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      // Persist to DB so location survives serverless cold starts
      await pool.query(
        `INSERT INTO driver_locations (driver_id, lat, lng, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (driver_id) DO UPDATE
           SET lat = EXCLUDED.lat, lng = EXCLUDED.lng, updated_at = NOW()`,
        [req.user.id, parsedLat, parsedLng]
      );
      return sendSuccess(res, 200, 'Location updated.', {});
    } catch (err) {
      next(err);
    }
  }

  // Customer calls this to get driver's current position + ETA for their order
  async getDriverLocation(req, res, next) {
    try {
      const orderId = parseInt(req.params.orderId);
      const orderRepo = require('../repositories/order.repository');
      const order = await orderRepo.findById(orderId);

      if (!order) return sendError(res, 404, 'Order not found', 'NOT_FOUND');

      // Find which driver has this order assigned
      const run = await deliveryService.getRunByOrderId(orderId);
      if (!run || !run.driver_id) {
        return sendSuccess(res, 200, 'Driver not yet assigned.', { data: { driverAssigned: false } });
      }

      // Fetch location from DB (persisted across serverless invocations)
      const { rows } = await pool.query(
        `SELECT lat, lng, updated_at FROM driver_locations WHERE driver_id = $1`,
        [run.driver_id]
      );
      const location = rows[0];
      if (!location) {
        return sendSuccess(res, 200, 'Driver location not yet available.', { data: { driverAssigned: true, locationAvailable: false } });
      }

      const ageMs = Date.now() - new Date(location.updated_at).getTime();
      return sendSuccess(res, 200, 'Driver location fetched.', {
        data: {
          driverAssigned:    true,
          locationAvailable: true,
          lat:       parseFloat(location.lat),
          lng:       parseFloat(location.lng),
          updatedAt: location.updated_at,
          isStale:   ageMs > 30000 // older than 30 seconds
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status, deliveryOtp, deliveryExceptionReason, deliveryProofUrl } = req.body;
      const orderId = parseInt(req.params.id);
      const orderService = require('../services/order.service');
      const order = await orderService.updateOrderStatus(orderId, status, { deliveryOtp, deliveryExceptionReason, deliveryProofUrl });
      return sendSuccess(res, 200, 'Order marked as delivered.', { data: { order } });
    } catch (err) {
      if (err.message.includes('not found')) return sendError(res, 404, err.message, 'ORDER_NOT_FOUND');
      if (err.message.includes('Invalid Delivery OTP')) return sendError(res, 400, err.message, 'INVALID_OTP');
      next(err);
    }
  }

  async getCompletedDeliveries(req, res, next) {
    try {
      const deliveries = await deliveryService.getCompletedDeliveries(req.user.id);
      return sendSuccess(res, 200, 'Completed deliveries fetched.', { data: { deliveries } });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DeliveryController();


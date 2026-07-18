'use strict';
const deliveryService = require('../services/delivery.service');
const { sendSuccess, sendError } = require('../utils/response');

// In-memory store: driverId -> { lat, lng, updatedAt }
// (Simple approach — no DB change needed; resets on server restart)
const driverLocations = new Map();

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
      driverLocations.set(req.user.id, { lat: parseFloat(lat), lng: parseFloat(lng), updatedAt: new Date() });
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

      const location = driverLocations.get(run.driver_id);
      if (!location) {
        return sendSuccess(res, 200, 'Driver location not yet available.', { data: { driverAssigned: true, locationAvailable: false } });
      }

      const ageMs = Date.now() - new Date(location.updatedAt).getTime();
      return sendSuccess(res, 200, 'Driver location fetched.', {
        data: {
          driverAssigned: true,
          locationAvailable: true,
          lat: location.lat,
          lng: location.lng,
          updatedAt: location.updatedAt,
          isStale: ageMs > 30000 // older than 30 seconds
        }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateOrderStatus(req, res, next) {
    try {
      const { status, deliveryOtp } = req.body;
      const orderId = parseInt(req.params.id);
      const orderService = require('../services/order.service');
      const order = await orderService.updateOrderStatus(orderId, status, { deliveryOtp });
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


// server/src/controllers/review.controller.js
'use strict';

const reviewService = require('../services/review.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

class ReviewController {

  /**
   * GET /api/products/:id/reviews
   * Public — anyone can view reviews.
   */
  async getProductReviews(req, res, next) {
    try {
      const productId = parseInt(req.params.id);
      if (!productId || isNaN(productId)) {
        return sendError(res, 400, 'Invalid product ID.', 'VALIDATION_INVALID_ID');
      }
      const page  = parseInt(req.query.page  || '1');
      const limit = Math.min(parseInt(req.query.limit || '10'), 50);

      const data = await reviewService.getProductReviews(productId, { page, limit });
      return sendSuccess(res, 200, 'Reviews fetched.', data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/products/:id/reviews
   * Authenticated — customer submits a review.
   */
  async submitReview(req, res, next) {
    try {
      const productId = parseInt(req.params.id);
      if (!productId || isNaN(productId)) {
        return sendError(res, 400, 'Invalid product ID.', 'VALIDATION_INVALID_ID');
      }
      const { rating, title, body, order_id } = req.body;

      const review = await reviewService.submitReview(req.user.id, productId, {
        rating, title, body, order_id,
      });
      logger.info('Review created', { requestId: req.id, userId: req.user.id, productId });
      return sendSuccess(res, 201, 'Review submitted successfully.', { review });
    } catch (err) {
      logger.error('Submit review error', { requestId: req.id, message: err.message });
      if (err.message.includes('already reviewed')) {
        return sendError(res, 409, err.message, 'REVIEW_DUPLICATE');
      }
      if (err.message.includes('Rating') || err.message.includes('body must')) {
        return sendError(res, 400, err.message, 'VALIDATION_FAILED');
      }
      next(err);
    }
  }

  /**
   * DELETE /api/reviews/:id
   * Authenticated — user deletes their own review.
   */
  async deleteReview(req, res, next) {
    try {
      const reviewId = parseInt(req.params.id);
      if (!reviewId || isNaN(reviewId)) {
        return sendError(res, 400, 'Invalid review ID.', 'VALIDATION_INVALID_ID');
      }
      await reviewService.deleteReview(reviewId, req.user.id);
      return sendSuccess(res, 200, 'Review deleted.');
    } catch (err) {
      logger.error('Delete review error', { requestId: req.id, message: err.message });
      if (err.message.includes('not found') || err.message.includes('denied')) {
        return sendError(res, 404, 'Review not found or access denied.', 'NOT_FOUND');
      }
      next(err);
    }
  }
}

module.exports = new ReviewController();

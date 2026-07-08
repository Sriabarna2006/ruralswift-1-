// server/src/services/review.service.js
'use strict';

const reviewRepository = require('../repositories/review.repository');
const logger           = require('../utils/logger');

class ReviewService {

  async getProductReviews(productId, { page = 1, limit = 10 } = {}) {
    const [reviews, stats] = await Promise.all([
      reviewRepository.findByProduct(productId, { page, limit }),
      reviewRepository.getStats(productId),
    ]);
    return { reviews, stats };
  }

  async submitReview(userId, productId, data) {
    const { rating, title, body, order_id } = data;

    if (!rating || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }
    if (!body || String(body).trim().length < 10) {
      throw new Error('Review body must be at least 10 characters.');
    }

    // Check for duplicate review
    const existing = await reviewRepository.findByUserAndProduct(userId, productId);
    if (existing) throw new Error('You have already reviewed this product.');

    // Verify purchase for "verified buyer" badge
    const is_verified = await reviewRepository.hasDeliveredOrder(userId, productId);

    const review = await reviewRepository.create(userId, productId, {
      rating:      Number(rating),
      title:       (title || '').trim(),
      body:        String(body).trim(),
      order_id:    order_id || null,
      is_verified,
    });

    logger.info('Review submitted', { userId, productId, reviewId: review.id });
    return review;
  }

  async deleteReview(reviewId, userId) {
    const deleted = await reviewRepository.deleteByIdAndUser(reviewId, userId);
    if (!deleted) throw new Error('Review not found or access denied.');
    return true;
  }
}

module.exports = new ReviewService();

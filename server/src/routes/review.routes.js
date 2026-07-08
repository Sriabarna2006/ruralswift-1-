// server/src/routes/review.routes.js
'use strict';

const express          = require('express');
const router           = express.Router();
const reviewController = require('../controllers/review.controller');
const authenticateToken = require('../middleware/auth.middleware');

// ── Public: get reviews + stats for a product ─────────────────────────────────
router.get('/products/:id/reviews', reviewController.getProductReviews.bind(reviewController));

// ── Protected: submit or delete a review ─────────────────────────────────────
router.post(  '/products/:id/reviews', authenticateToken, reviewController.submitReview.bind(reviewController));
router.delete('/reviews/:id',          authenticateToken, reviewController.deleteReview.bind(reviewController));

module.exports = router;

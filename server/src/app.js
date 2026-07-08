// server/src/app.js
'use strict';

const crypto              = require('crypto');
const express             = require('express');
const cors                = require('cors');
const helmet              = require('helmet');
const rateLimit           = require('express-rate-limit');
const userRoutes          = require('./routes/user.routes');
const productRoutes       = require('./routes/product.routes');
const cartRoutes          = require('./routes/cart.routes');
const orderRoutes         = require('./routes/order.routes');
const wishlistRoutes      = require('./routes/wishlist.routes');
const addressRoutes       = require('./routes/address.routes');
const notificationRoutes  = require('./routes/notification.routes');
const sellerRoutes        = require('./routes/seller.routes');
const reviewRoutes        = require('./routes/review.routes');
const errorHandler        = require('./middleware/error.middleware');
const { sanitizeBody }    = require('./middleware/validate.middleware');
const { sendError }       = require('./utils/response');
const logger              = require('./utils/logger');

const app = express();

// ── 1. Security headers (helmet) ──────────────────────────────────────────────
// Sets X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
app.use(helmet());

// ── 2. CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  'https://ruralshift-test.netlify.app',
];

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin "${origin}" not allowed.`), false);
  },
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  credentials:  true,
}));

// ── 3. Request ID ─────────────────────────────────────────────────────────────
// Attach a unique ID to every request for log correlation and error responses.
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// ── 4. Rate limiting ──────────────────────────────────────────────────────────
// General API limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    success:   false,
    code:      'TOO_MANY_REQUESTS',
    message:   'Too many requests from this IP. Please try again in 15 minutes.',
    timestamp: new Date().toISOString(),
  },
  handler(req, res, next, options) {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path, requestId: req.id });
    res.status(options.statusCode).json(options.message);
  },
});

// Stricter limit for auth endpoints: 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success:   false,
    code:      'TOO_MANY_REQUESTS',
    message:   'Too many authentication attempts. Please wait 15 minutes before trying again.',
    timestamp: new Date().toISOString(),
  },
  handler(req, res, next, options) {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, path: req.path, requestId: req.id });
    res.status(options.statusCode).json(options.message);
  },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// ── 5. Body parsers (with size limits to prevent DoS) ─────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── 6. Input sanitization ─────────────────────────────────────────────────────
app.use(sanitizeBody);

// ── 7. Structured request logging ─────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.request(req, res, Date.now() - start);
  });
  next();
});

// ── 8. Routes ─────────────────────────────────────────────────────────────────
// NOTE: All profile endpoints are handled inside userRoutes (/api/profile).
// The separate profileRoutes was removed to eliminate the duplicate route conflict.
app.use('/api', userRoutes);
app.use('/api', productRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);
app.use('/api', wishlistRoutes);
app.use('/api', addressRoutes);
app.use('/api', notificationRoutes);
app.use('/api', sellerRoutes);
app.use('/api', reviewRoutes);

// ── 9. Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    status:    'ok',
    message:   'RuralSwift API is running 🚀',
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

// ── 10. 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  return sendError(
    res, 404,
    `Route ${req.method} ${req.path} not found.`,
    'NOT_FOUND'
  );
});

// ── 11. Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

module.exports = app;

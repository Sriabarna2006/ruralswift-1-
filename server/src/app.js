// server/src/app.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');
const profileRoutes = require('./routes/profile.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:4200', 'https://ruralshift-test.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', userRoutes);
app.use('/api/profile', profileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RuralSwift API is running 🚀' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;

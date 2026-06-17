require('./config/registerModels')();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { generalLimiter } = require('./middlewares/rateLimiter');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

// Import Routers
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const communityRoutes = require('./routes/communityRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./admin/routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const documentRoutes = require('./routes/documentRoutes');
const rideRequestRoutes = require('./routes/rideRequestRoutes');

const app = express();

// Set HTTP Security Headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors({
  origin: '*', // Scale this to strict production whitelists during deployment
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — registered before rate limiter so it never counts toward the cap
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ride Share API is active and healthy',
    timestamp: new Date()
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ride Share API is active and healthy',
    timestamp: new Date()
  });
});

// Apply general rate limiter to API routes
app.use('/api', generalLimiter);

// Map Endpoints to Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rides', rideRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/communities', communityRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/ride-requests', rideRequestRoutes);

// Centralized Route Interceptors
app.use(notFound);
app.use(errorHandler);

module.exports = app;

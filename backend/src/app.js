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
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return [...new Set(origins)];
}

const allowedOrigins = parseCorsOrigins();

// Set HTTP Security Headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing (Netlify frontend → Render API)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

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
app.use('/api/v1/notifications', notificationRoutes);

// Centralized Route Interceptors
app.use(notFound);
app.use(errorHandler);

module.exports = app;

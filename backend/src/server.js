require('dotenv').config();
const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = async () => {
  const connect = require('./config/db');
  await connect();
};
const Chat = require('./models/Chat');
const { ensureSingleAdmin } = require('./config/seedAdmin');
const { setAdminIo } = require('./admin/services/adminRealtime');
const { setAppIo } = require('./services/realtimeService');
const { verifyAdminToken } = require('./admin/utils/adminToken');

// Setup HTTP Server
const server = http.createServer(app);

// Setup Socket.io Server with proper CORS parameters
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configure Socket.io Namespaces and Room Events
setAdminIo(io);
setAppIo(io);

const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'production_grade_super_secret_jwt_key_123!@#'
      );
      if (decoded?.id) socket.data.userId = String(decoded.id);
    }
  } catch {
    /* allow connection; user-join may still set userId */
  }
  next();
});

io.on('connection', (socket) => {
  console.log(`New WebSocket client connected: ${socket.id}`);

  socket.on('user-join', ({ userId }) => {
    const uid = socket.data.userId || userId;
    if (uid) {
      socket.join(`user:${uid}`);
      socket.data.userId = String(uid);
    }
  });

  socket.on('driver-location-update', async ({ lat, lng }) => {
    const userId = socket.data.userId;
    if (!userId || lat == null || lng == null) return;
    try {
      const User = require('./models/User');
      const { sanitizeDriverAvailability } = require('./utils/userGeo');
      const user = await User.findById(userId);
      if (user) {
        user.driverAvailability = user.driverAvailability || {};
        user.driverAvailability.location = { type: 'Point', coordinates: [lng, lat] };
        user.driverAvailability.updatedAt = new Date();
        sanitizeDriverAvailability(user);
        await user.save();
      }
    } catch {
      /* ignore */
    }
  });

  socket.on('join-ride-request-room', ({ requestId, userId }) => {
    if (requestId) {
      socket.join(`ride-request:${requestId}`);
      socket.data.rideRequestId = requestId;
      if (userId) socket.data.userId = userId;
    }
  });

  socket.on('ride-request-location', async ({ requestId, lat, lng }) => {
    const userId = socket.data.userId;
    if (!requestId || !userId || lat == null || lng == null) return;
    try {
      const activeRideService = require('./services/activeRideService');
      await activeRideService.updateDriverLocation(requestId, userId, { lat, lng });
    } catch {
      /* ignore */
    }
  });

  socket.on('ride-request-chat', async ({ requestId, senderName, message }) => {
    const senderId = socket.data.userId;
    if (!requestId || !senderId || !message) return;
    try {
      const activeRideService = require('./services/activeRideService');
      await activeRideService.saveChatMessage(requestId, senderId, senderName, message);
    } catch (err) {
      socket.emit('socket-error', { message: err.message || 'Chat failed' });
    }
  });

  socket.on('ride-request-chat-delivered', async ({ messageId }) => {
    const userId = socket.data.userId;
    if (!messageId || !userId) return;
    try {
      const activeRideService = require('./services/activeRideService');
      await activeRideService.markMessageDelivered(messageId, userId);
    } catch {
      /* ignore */
    }
  });

  socket.on('ride-request-chat-read', async ({ requestId }) => {
    const userId = socket.data.userId;
    if (!requestId || !userId) return;
    try {
      const activeRideService = require('./services/activeRideService');
      await activeRideService.markChatRead(requestId, userId);
    } catch {
      /* ignore */
    }
  });

  socket.on('ride-request-chat-typing', ({ requestId, senderName }) => {
    const userId = socket.data.userId;
    if (!requestId || !userId) return;
    socket.to(`ride-request:${requestId}`).emit('ride-request:chat-typing', {
      requestId,
      userId,
      senderName: senderName || ''
    });
  });

  socket.on('ride-request-chat-stop-typing', ({ requestId }) => {
    const userId = socket.data.userId;
    if (!requestId || !userId) return;
    socket.to(`ride-request:${requestId}`).emit('ride-request:chat-stop-typing', {
      requestId,
      userId
    });
  });

  socket.on('admin-join', ({ token }) => {
    try {
      const decoded = verifyAdminToken(token);
      if (decoded.role === 'ADMIN') {
        socket.join('admin-room');
        socket.emit('admin-connected', { ok: true });
      }
    } catch {
      socket.emit('admin-error', { message: 'Invalid admin token' });
    }
  });

  socket.on('admin-heartbeat', () => {
    if (socket.rooms.has('admin-room')) {
      socket.emit('admin-pong', { at: new Date() });
    }
  });

  // 1. Join a specific Ride Room (for active location tracking and chats)
  socket.on('join-ride-room', ({ rideId, userId }) => {
    const roomName = `ride:${rideId}`;
    socket.join(roomName);
    console.log(`User ${userId} joined room ${roomName}`);
  });

  // 2. Real-Time Location Update Broadcast
  socket.on('update-location', ({ rideId, lat, lng, bearing, speed }) => {
    const roomName = `ride:${rideId}`;
    // Broadcast coordinates instantly to all passengers in the same ride room
    socket.to(roomName).emit('driver-moved', {
      lat,
      lng,
      bearing: bearing || 0,
      speed: speed || 0,
      timestamp: new Date()
    });
    console.log(`Coords update on ${roomName}: [${lat}, ${lng}]`);
  });

  // 3. Real-Time Ride Instance Messaging
  socket.on('chat-msg', async ({ rideId, senderId, senderName, message }) => {
    const roomName = `ride:${rideId}`;
    try {
      const { saveChatMessage } = require('./services/carpoolChatService');
      const saved = await saveChatMessage(
        rideId,
        senderId,
        senderName,
        message
      );
      io.to(roomName).emit('chat-msg-received', saved);
      console.log(`New msg in ${roomName} from ${senderName || senderId}`);
    } catch (err) {
      console.error('Error saving socket message:', err.message);
      socket.emit('socket-error', { message: err.message || 'Failed to deliver message' });
    }
  });

  // 4. Handle Disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Run Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Primary Database
  await connectDB();
  await ensureSingleAdmin();

  setInterval(async () => {
    try {
      const { getRealtimeSnapshot } = require('./admin/services/adminOperationsService');
      const snap = await getRealtimeSnapshot();
      io.to('admin-room').emit('admin-realtime', snap);
    } catch (e) {
      /* ignore poll errors */
    }
  }, 10000);

  setInterval(async () => {
    try {
      const { processDueSearchCancellations } = require('./services/rideRequestExpiryService');
      const n = await processDueSearchCancellations();
      if (n > 0) console.log(`Auto-cancelled ${n} inactive ride search(es)`);
    } catch (e) {
      /* ignore */
    }
  }, 60000);
  
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` CARPOOLING GATEWAY ACTIVATED ON PORT: ${PORT} `);
    console.log(` http://localhost:${PORT}/api/health (Health check) `);
    console.log(`==================================================`);
  });
};

startServer();

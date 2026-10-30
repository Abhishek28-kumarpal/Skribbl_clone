
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomManager } from './game/RoomManager.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

// Allowed frontend origins
const allowedOrigins = [
  'https://skribbl-clone-snjs.vercel.app'
];

// Initialize Express
const app = express();
const httpServer = createServer(app);

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Initialize Room Manager
const roomManager = new RoomManager();

// Express CORS configuration
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Health check API
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
  });
});

// Game statistics API
app.get('/api/stats', (req, res) => {
  res.json({
    activeRooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
    environment: NODE_ENV,
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io, roomManager);

// Start server
const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Closing server gracefully...');

  server.close(() => {
    console.log('HTTP server closed');

    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error('Force shutting down...');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

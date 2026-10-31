import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomManager } from './game/RoomManager.ts';
import { setupSocketHandlers } from './socket/handlers.ts';
import dns from 'node:dns';

dns.setServers(['1.1.1.1', '1.0.0.1']);
dotenv.config();

// Allowed frontend origins - ADD ALL YOUR DEPLOYED URLS
const allowedOrigins = [
  'https://skribbl-clone-snjs.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://skribbl-clone-d2z8.onrender.com', // If frontend is also on Render
  process.env.CLIENT_URL, // Add from .env
].filter(Boolean); // Remove undefined values

// Initialize Express
const app = express();
const httpServer = createServer(app);
const roomManager = new RoomManager();

// Socket.IO configuration with proper CORS
const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Express CORS configuration with dynamic origin check
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight requests explicitly
app.options('*', cors());

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
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
  });
});

// Game statistics API
app.get('/api/stats', (_req, res) => {
  res.json({
    activeRooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
    environment: NODE_ENV,
  });
});

// Setup Socket.IO handlers
setupSocketHandlers(io, roomManager);

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
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

export { io };
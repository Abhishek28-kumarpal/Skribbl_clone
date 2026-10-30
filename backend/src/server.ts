import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { RoomManager } from './game/RoomManager.js';
import { setupSocketHandlers } from './socket/handlers.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://skribbl-clone-snjs.vercel.app',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

app.use(cors({
  origin: process.env.CLIENT_URL || 'https://skribbl-clone-snjs.vercel.app',
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skribbl';
const NODE_ENV = process.env.NODE_ENV || 'development';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
  });
});

app.get('/api/stats', (req, res) => {
  res.json({
    activeRooms: roomManager.getRoomCount(),
    activeGames: roomManager.getActiveGames(),
    environment: NODE_ENV,
  });
});

setupSocketHandlers(io, roomManager);

const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
});

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

import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.ts';
import type { Player, RoomSettings, DrawingStroke } from '../types/index.ts';
import { GameResult } from '../models/GameResult.ts';

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  io.on('connection', (socket: Socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('create_room', async (data, callback) => {
      try {
        const { playerName, settings } = data;
        if (!playerName || !settings) {
          callback({ error: 'Missing required fields' });
          return;
        }

        const playerId = socket.id;
        const room = roomManager.createRoom(playerId, settings);

        const player: Player = {
          id: playerId,
          name: playerName,
          socketId: socket.id,
          score: 0,
          guessedCorrectCount: 0,
          ready: true,
        };

        room.addPlayer(player);
        socket.join(room.roomCode);

        callback({
          success: true,
          roomCode: room.roomCode,
          roomData: {
            roomCode: room.roomCode,
            hostId: room.hostId,
            players: room.getAllPlayers(),
            settings: room.settings,
          },
        });

        io.to(room.roomCode).emit('player_joined', {
          players: room.getAllPlayers(),
        });
      } catch (error) {
        callback({ error: 'Failed to create room' });
      }
    });

    socket.on('join_room', async (data, callback) => {
      try {
        const { roomCode, playerName } = data;
        if (!roomCode || !playerName) {
          callback({ error: 'Missing required fields' });
          return;
        }

        const room = roomManager.getRoom(roomCode);
        if (!room) {
          callback({ error: 'Room not found' });
          return;
        }

        if (room.isFull()) {
          callback({ error: 'Room is full' });
          return;
        }

        const playerId = socket.id;
        const player: Player = {
          id: playerId,
          name: playerName,
          socketId: socket.id,
          score: 0,
          guessedCorrectCount: 0,
          ready: false,
        };

        room.addPlayer(player);
        socket.join(roomCode);

        callback({
          success: true,
          roomData: {
            roomCode: room.roomCode,
            hostId: room.hostId,
            players: room.getAllPlayers(),
            settings: room.settings,
          },
        });

        io.to(roomCode).emit('player_joined', {
          players: room.getAllPlayers(),
        });
      } catch (error) {
        callback({ error: 'Failed to join room' });
      }
    });

    socket.on('set_ready', (data) => {
      try {
        const { roomCode, ready } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        room.setPlayerReady(socket.id, ready);
        io.to(roomCode).emit('player_ready_status', {
          players: room.getAllPlayers(),
        });
      } catch (error) {
        console.error('Error setting ready:', error);
      }
    });

    socket.on('start_game', (data, callback) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room) {
          callback({ error: 'Room not found' });
          return;
        }

        if (room.hostId !== socket.id) {
          callback({ error: 'Only host can start game' });
          return;
        }

        if (!room.canStartGame()) {
          callback({ error: 'Not all players are ready' });
          return;
        }

        const game = room.startGame();
        callback({ success: true });

        io.to(roomCode).emit('game_started', {
          gameState: game.gameState,
        });
      } catch (error) {
        callback({ error: 'Failed to start game' });
      }
    });

    socket.on('select_word', (data, callback) => {
      try {
        const { roomCode, word } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) {
          callback({ error: 'Invalid room' });
          return;
        }

        const drawer = room.game.getCurrentDrawer();
        if (!drawer || drawer.id !== socket.id) {
          callback({ error: 'Only drawer can select word' });
          return;
        }

        room.game.selectWord(word);
        callback({ success: true });

        io.to(roomCode).emit('word_selected', {
          gameState: room.game.gameState,
        });
      } catch (error) {
        callback({ error: 'Invalid word' });
      }
    });

    socket.on('draw', (data) => {
      try {
        const { roomCode, stroke } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) return;

        const drawer = room.game.getCurrentDrawer();
        if (!drawer || drawer.id !== socket.id) return;

        room.game.addStroke(stroke);
        socket.to(roomCode).emit('draw_data', { stroke });
      } catch (error) {
        console.error('Error drawing:', error);
      }
    });

    socket.on('canvas_clear', (data) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) return;

        const drawer = room.game.getCurrentDrawer();
        if (!drawer || drawer.id !== socket.id) return;

        room.game.clearCanvas();
        io.to(roomCode).emit('canvas_cleared', {});
      } catch (error) {
        console.error('Error clearing canvas:', error);
      }
    });

    socket.on('undo_stroke', (data) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) return;

        const drawer = room.game.getCurrentDrawer();
        if (!drawer || drawer.id !== socket.id) return;

        room.game.undoStroke();
        io.to(roomCode).emit('stroke_undone', {});
      } catch (error) {
        console.error('Error undoing stroke:', error);
      }
    });

    socket.on('submit_guess', (data, callback) => {
      try {
        const { roomCode, guess } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) {
          callback({ error: 'Invalid room' });
          return;
        }

        const drawer = room.game.getCurrentDrawer();
        if (drawer && drawer.id === socket.id) {
          callback({ error: 'Drawer cannot guess' });
          return;
        }

        const isCorrect = room.game.validateGuess(guess);
        if (isCorrect && !room.game.gameState.playersWhoGuessedCorrect.has(socket.id)) {
          const points = Math.max(10, 100 - Math.floor((Date.now() - room.game.gameState.roundStartTime) / 100));
          room.game.recordCorrectGuess(socket.id, points);

          io.to(roomCode).emit('correct_guess', {
            playerId: socket.id,
            playerName: room.getPlayer(socket.id)?.name || 'Unknown',
            word: room.game.gameState.currentWord,
            players: room.game.gameState.players,
          });
        }

        callback({ success: true, isCorrect });
      } catch (error) {
        callback({ error: 'Error submitting guess' });
      }
    });

    socket.on('end_round', (data) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) return;

        room.game.endRound();

        if (room.game.isGameOver()) {
          const winner = room.game.getWinner();
          const gameResult = new GameResult({
            gameId: room.game.gameState.gameId,
            roomCode: room.roomCode,
            players: room.game.gameState.players.map(p => ({
              name: p.name,
              finalScore: p.score,
              guessedCorrect: p.guessedCorrectCount,
            })),
            winner: winner.name,
            totalRounds: room.game.gameState.totalRounds,
            settings: room.game.gameState.settings,
            endedAt: new Date(),
          });

          gameResult.save().catch(err => console.error('Error saving game result:', err));

          io.to(roomCode).emit('game_over', {
            winner: winner.name,
            players: room.game.gameState.players,
            gameState: room.game.gameState,
          });

          setTimeout(() => roomManager.deleteRoom(roomCode), 5000);
        } else {
          io.to(roomCode).emit('round_end', {
            gameState: room.game.gameState,
          });
        }
      } catch (error) {
        console.error('Error ending round:', error);
      }
    });

    socket.on('get_public_rooms', (data, callback) => {
      try {
        const publicRooms = roomManager.getPublicRooms();
        callback({
          rooms: publicRooms.map(room => ({
            roomCode: room.roomCode,
            hostName: room.getHostName(),
            playerCount: room.players.size,
            maxPlayers: room.settings.maxPlayers,
          })),
        });
      } catch (error) {
        callback({ error: 'Failed to fetch rooms' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      roomManager.cleanupEmptyRooms();
    });
  });
}

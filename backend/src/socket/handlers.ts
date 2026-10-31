import { Server, Socket } from 'socket.io';
import { RoomManager } from '../game/RoomManager.ts';
import type { Player, RoomSettings, DrawingStroke } from '../types/index.ts';
import { GameResult } from '../models/GameResult.ts';

// Helper function to handle round transitions cleanly
const advanceToNextRound = (roomCode: string, io: Server, roomManager: RoomManager) => {
  setTimeout(() => {
    const currentRoom = roomManager.getRoom(roomCode);
    if (!currentRoom || !currentRoom.game) return;

    // Prevent double-advancing if phase already changed
    if (currentRoom.game.gameState.phase !== 'round-end') return;

    currentRoom.game.gameState.currentRound += 1;
    currentRoom.game.gameState.currentDrawerIndex =
      (currentRoom.game.gameState.currentDrawerIndex + 1) % currentRoom.game.gameState.players.length;

    if (currentRoom.game.isGameOver()) {
      currentRoom.game.gameState.phase = 'game-over';
      const winner = currentRoom.game.getWinner();
      
      const gameResult = new GameResult({
        gameId: currentRoom.game.gameState.gameId,
        roomCode: currentRoom.roomCode,
        players: currentRoom.game.gameState.players.map(p => ({
          name: p.name,
          finalScore: p.score,
          guessedCorrect: p.guessedCorrectCount,
        })),
        winner: winner.name,
        totalRounds: currentRoom.game.gameState.totalRounds,
        settings: currentRoom.game.gameState.settings,
        endedAt: new Date(),
      });

      gameResult.save().catch(err => console.error('Error saving game result:', err));

      io.to(roomCode).emit('game_over', {
        winner: winner.name,
        players: currentRoom.game.gameState.players,
        gameState: currentRoom.game.gameState,
      });

      setTimeout(() => roomManager.deleteRoom(roomCode), 5000);
    } else {
      currentRoom.game.startNewRound();
      io.to(roomCode).emit('new_round_started', {
        gameState: currentRoom.game.gameState,
      });
    }
  }, 3000); // 3 seconds delay so players can see the result
};

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

    socket.on('get_game_state', (data, callback) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }

        if (room.game && room.game.gameState) {
          callback({ success: true, gameState: room.game.gameState });
        } else {
          callback({ success: false, error: 'Game not started' });
        }
      } catch (error) {
        console.error('Error getting game state:', error);
        callback({ success: false, error: 'Failed to get game state' });
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

        // Set timeout to end round if time runs out
        const drawTimeMs = room.game.gameState.settings.drawTime * 1000;
        setTimeout(() => {
          const currentRoom = roomManager.getRoom(roomCode);
          // Only end round if it's still in the 'drawing' phase (prevents double-triggering)
          if (currentRoom?.game?.gameState.phase === 'drawing') {
            currentRoom.game.endRound();
            io.to(roomCode).emit('round_end', {
              gameState: currentRoom.game.gameState,
            });
            advanceToNextRound(roomCode, io, roomManager);
          }
        }, drawTimeMs);

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

          // IMMEDIATELY END THE ROUND ON FIRST CORRECT GUESS
          room.game.endRound();

          // Emit round_end with FULL gameState (reveals word, updates scores for everyone)
          io.to(roomCode).emit('round_end', {
            gameState: room.game.gameState,
          });

          // Trigger the next round sequence
          advanceToNextRound(roomCode, io, roomManager);
        }

        callback({ success: true, isCorrect });
      } catch (error) {
        callback({ error: 'Error submitting guess' });
      }
    });

    socket.on('reveal_hint', (data, callback) => {
      try {
        const { roomCode } = data;
        const room = roomManager.getRoom(roomCode);
        if (!room || !room.game) return;

        const drawer = room.game.getCurrentDrawer();
        if (!drawer || drawer.id !== socket.id) {
          callback({ error: 'Only drawer can reveal hints' });
          return;
        }

        room.game.revealHint();
        io.to(roomCode).emit('hint_revealed', {
          gameState: room.game.gameState,
        });
        callback({ success: true });
      } catch (error) {
        callback({ error: 'Failed to reveal hint' });
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
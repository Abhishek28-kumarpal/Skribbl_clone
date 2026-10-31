import type { Player, RoomSettings } from '../types/index.ts';
import { Game } from './Game.ts';

export class Room {
  roomCode: string;
  hostId: string;
  players: Map<string, Player>;
  settings: RoomSettings;
  game: Game | null;
  createdAt: Date;

  constructor(roomCode: string, hostId: string, settings: RoomSettings) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.players = new Map();
    this.settings = settings;
    this.game = null;
    this.createdAt = new Date();
  }

  addPlayer(player: Player): boolean {
    if (this.players.size >= this.settings.maxPlayers) {
      return false;
    }
    this.players.set(player.id, player);
    return true;
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayerBySocketId(socketId: string): Player | undefined {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        return player;
      }
    }
    return undefined;
  }

  updatePlayerSocketId(playerId: string, newSocketId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.socketId = newSocketId;
    }
  }

  setPlayerReady(playerId: string, ready: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.ready = ready;
    }
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  canStartGame(): boolean {
    if (this.players.size < 2) return false;
    return Array.from(this.players.values()).every(p => p.ready);
  }

  startGame(): Game {
    const gameId = `${this.roomCode}-${Date.now()}`;
    const players = this.getAllPlayers();
    this.game = new Game(gameId, this.roomCode, players, this.hostId, this.settings);
    this.game.startGame();
    return this.game;
  }

  isFull(): boolean {
    return this.players.size >= this.settings.maxPlayers;
  }

  isEmpty(): boolean {
    return this.players.size === 0;
  }

  isHostPresent(): boolean {
    return this.players.has(this.hostId);
  }

  getHostName(): string {
    const host = this.players.get(this.hostId);
    return host ? host.name : 'Unknown';
  }
}

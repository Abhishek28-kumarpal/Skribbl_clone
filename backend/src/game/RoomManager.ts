import { Room } from './Room.js';
import { Player, RoomSettings } from '../types/index.js';

export class RoomManager {
  private rooms: Map<string, Room>;
  private publicRooms: Set<string>;

  constructor() {
    this.rooms = new Map();
    this.publicRooms = new Set();
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  createRoom(hostId: string, settings: RoomSettings): Room {
    const roomCode = this.generateRoomCode();
    const room = new Room(roomCode, hostId, settings);
    this.rooms.set(roomCode, room);

    if (!settings.isPrivate) {
      this.publicRooms.add(roomCode);
    }

    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  deleteRoom(roomCode: string): void {
    this.rooms.delete(roomCode);
    this.publicRooms.delete(roomCode);
  }

  getPublicRooms(): Room[] {
    return Array.from(this.publicRooms)
      .map(code => this.rooms.get(code))
      .filter((room): room is Room => room !== undefined && !room.isFull());
  }

  cleanupEmptyRooms(): void {
    const codesToDelete: string[] = [];
    for (const [code, room] of this.rooms.entries()) {
      if (room.isEmpty()) {
        codesToDelete.push(code);
      }
    }
    codesToDelete.forEach(code => this.deleteRoom(code));
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getActiveGames(): number {
    let count = 0;
    for (const room of this.rooms.values()) {
      if (room.game && !room.game.isGameOver()) {
        count++;
      }
    }
    return count;
  }
}

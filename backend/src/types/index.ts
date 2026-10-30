export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  isPrivate: boolean;
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  score: number;
  guessedCorrectCount: number;
  ready: boolean;
}

export interface DrawingStroke {
  x: number;
  y: number;
  color: string;
  size: number;
  isEraser: boolean;
}

export interface GameState {
  gameId: string;
  roomCode: string;
  phase: 'lobby' | 'word-selection' | 'drawing' | 'round-end' | 'game-over';
  currentRound: number;
  totalRounds: number;
  currentDrawerIndex: number;
  currentWord: string;
  wordHint: string;
  wordOptions: string[];
  players: Player[];
  hostId: string;
  settings: RoomSettings;
  drawingData: DrawingStroke[];
  playersWhoGuessedCorrect: Set<string>;
  roundStartTime: number;
  roundEndTime: number;
  createdAt: Date;
}

export interface SocketPayload {
  [key: string]: any;
}

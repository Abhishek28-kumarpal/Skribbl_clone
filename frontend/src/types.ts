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
  score: number;
  guessedCorrectCount: number;
  ready: boolean;
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
  drawingData: any[];
  playersWhoGuessedCorrect: string[];
  roundStartTime: number;
  roundEndTime: number;
}

export interface RoomData {
  roomCode: string;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
}

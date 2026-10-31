import type {
  GameState,
  Player,
  RoomSettings,
  DrawingStroke
} from '../types/index.ts';
import { getRandomWords } from '../data/words.ts';

export class Game {
  gameState: GameState;

  constructor(
    gameId: string,
    roomCode: string,
    players: Player[],
    hostId: string,
    settings: RoomSettings
  ) {
    this.gameState = {
      gameId,
      roomCode,
      phase: 'lobby',
      currentRound: 0,
      totalRounds: settings.rounds,
      currentDrawerIndex: 0,
      currentWord: '',
      wordHint: '',
      wordOptions: [],
      players: players.map(p => ({ ...p, score: 0, guessedCorrectCount: 0 })),
      hostId,
      settings,
      drawingData: [],
      playersWhoGuessedCorrect: new Set(),
      roundStartTime: 0,
      roundEndTime: 0,
      createdAt: new Date(),
    };
  }

  startGame(): void {
    this.gameState.phase = 'word-selection';
    this.gameState.currentRound = 1;
    this.gameState.currentDrawerIndex = 0;
    this.startNewRound();
  }

  startNewRound(): void {
    if (this.gameState.currentRound > this.gameState.totalRounds) {
      this.gameState.phase = 'game-over';
      return;
    }

    this.gameState.phase = 'word-selection';
    this.gameState.drawingData = [];
    this.gameState.playersWhoGuessedCorrect = new Set();
    this.gameState.currentWord = '';
    this.gameState.wordHint = '';
    this.gameState.wordOptions = getRandomWords(this.gameState.settings.wordCount);
  }

  selectWord(word: string): void {
    if (!this.gameState.wordOptions.includes(word)) {
      throw new Error('Invalid word selected');
    }
    this.gameState.currentWord = word;
    this.gameState.phase = 'drawing';
    this.gameState.roundStartTime = Date.now();
    this.gameState.roundEndTime = Date.now() + this.gameState.settings.drawTime * 1000;
    this.updateWordHint();
  }

  updateWordHint(): void {
    const word = this.gameState.currentWord;
    let hint = '';
    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') {
        hint += ' ';
      } else {
        hint += '_';
      }
    }
    this.gameState.wordHint = hint;
  }

  revealLetters(count: number): void {
    const word = this.gameState.currentWord;
    let hint = this.gameState.wordHint.split('');
    const hiddenIndices: number[] = [];

    for (let i = 0; i < word.length; i++) {
      if (hint[i] === '_') {
        hiddenIndices.push(i);
      }
    }

    for (let i = 0; i < Math.min(count, hiddenIndices.length); i++) {
      const randomIdx = Math.floor(Math.random() * hiddenIndices.length);
      const realIdx = hiddenIndices[randomIdx];
      hint[realIdx] = word[realIdx];
      hiddenIndices.splice(randomIdx, 1);
    }

    this.gameState.wordHint = hint.join('');
  }

  validateGuess(guess: string): boolean {
    const normalized = guess.trim().toLowerCase();
    const wordNormalized = this.gameState.currentWord.trim().toLowerCase();
    return normalized === wordNormalized;
  }

  addStroke(stroke: DrawingStroke): void {
    this.gameState.drawingData.push(stroke);
  }

  clearCanvas(): void {
    this.gameState.drawingData = [];
  }

  undoStroke(): void {
    this.gameState.drawingData.pop();
  }

  recordCorrectGuess(playerId: string, points: number): void {
    if (this.gameState.playersWhoGuessedCorrect.has(playerId)) {
      return;
    }

    this.gameState.playersWhoGuessedCorrect.add(playerId);
    const player = this.gameState.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
      player.guessedCorrectCount += 1;
    }
  }

  endRound(): void {
    this.gameState.phase = 'round-end';
    this.gameState.currentRound += 1;
    this.gameState.currentDrawerIndex =
      (this.gameState.currentDrawerIndex + 1) % this.gameState.players.length;
  }

  getWinner(): Player {
    const sorted = [...this.gameState.players].sort((a, b) => b.score - a.score);
    return sorted[0];
  }

  getCurrentDrawer(): Player | undefined {
    return this.gameState.players[this.gameState.currentDrawerIndex];
  }

  isGameOver(): boolean {
    return this.gameState.phase === 'game-over';
  }
}

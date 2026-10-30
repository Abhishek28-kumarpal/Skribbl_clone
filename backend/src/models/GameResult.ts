import mongoose, { Schema, Document } from 'mongoose';

export interface IGameResult extends Document {
  gameId: string;
  roomCode: string;
  players: Array<{
    name: string;
    finalScore: number;
    guessedCorrect: number;
  }>;
  winner: string;
  totalRounds: number;
  settings: {
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    wordCount: number;
    hints: number;
  };
  createdAt: Date;
  endedAt: Date;
}

const GameResultSchema = new Schema<IGameResult>(
  {
    gameId: { type: String, required: true, unique: true, index: true },
    roomCode: { type: String, required: true, index: true },
    players: [
      {
        name: { type: String, required: true },
        finalScore: { type: Number, required: true },
        guessedCorrect: { type: Number, required: true },
        _id: false,
      },
    ],
    winner: { type: String, required: true },
    totalRounds: { type: Number, required: true },
    settings: {
      maxPlayers: Number,
      rounds: Number,
      drawTime: Number,
      wordCount: Number,
      hints: Number,
      _id: false,
    },
    createdAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date, required: true },
  },
  { timestamps: false }
);

export const GameResult = mongoose.model<IGameResult>(
  'GameResult',
  GameResultSchema
);

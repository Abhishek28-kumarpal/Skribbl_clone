# Skribbl Clone - Multiplayer Drawing & Guessing Game

A full-stack multiplayer drawing and word-guessing game inspired by Skribbl.io, built with React, Node.js, Express, Socket.IO, and MongoDB.

## Features

- **Multiplayer Rooms**: Create or join private/public game rooms
- **Real-time Drawing**: Canvas synchronization across all players
- **Turn-Based Gameplay**: Each player takes turns drawing
- **Word Guessing**: Players guess the word being drawn for points
- **Live Leaderboard**: Real-time score updates
- **Drawing Tools**: Brush, colors, eraser, undo, clear canvas
- **Hint System**: Progressive letter reveals
- **Responsive Design**: Works on desktop and mobile
- **MongoDB Persistence**: Game results saved to database

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Socket.IO Client
- **Backend**: Node.js, Express, TypeScript
- **Real-time**: Socket.IO
- **Database**: MongoDB with Mongoose
- **Icons**: Lucide React
- **Deployment**: Render (Backend), Vercel (Frontend)

## Project Structure

```
skribbl-app/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Main server entry point
│   │   ├── game/               # Game logic classes
│   │   │   ├── Game.ts         # Game state and rules
│   │   │   ├── Room.ts         # Room management
│   │   │   └── RoomManager.ts  # All rooms registry
│   │   ├── models/             # MongoDB models
│   │   │   └── GameResult.ts   # Persisted game results
│   │   ├── socket/             # Socket.IO handlers
│   │   │   └── handlers.ts     # Event handling
│   │   ├── data/               # Static data
│   │   │   └── words.ts        # Word bank
│   │   ├── types/              # TypeScript interfaces
│   │   │   └── index.ts        # Type definitions
│   │   └── config/             # Configuration files
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/              # React pages
│   │   │   ├── Home.tsx        # Main landing page
│   │   │   ├── CreateRoom.tsx  # Room configuration
│   │   │   ├── Lobby.tsx       # Player lobby
│   │   │   ├── Game.tsx        # Main game screen
│   │   │   └── Results.tsx     # Final results
│   │   ├── components/         # Reusable components
│   │   │   └── DrawingCanvas.tsx
│   │   ├── services/           # API/Socket services
│   │   │   └── socket.ts       # Socket.IO client
│   │   ├── App.tsx             # Root component
│   │   ├── main.tsx            # Entry point
│   │   ├── types.ts            # Frontend types
│   │   └── index.css           # Tailwind styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
└── README.md
```

## Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **MongoDB Atlas** account (free tier available)
- **Git**

## MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with credentials
3. Whitelist your IP address (or allow from anywhere: 0.0.0.0/0)
4. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/database`)
5. Keep this connection string for the `.env` file

## Local Installation

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Edit .env with your MongoDB URI
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skribbl?retryWrites=true&w=majority
CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
```

Start the backend:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local (optional - defaults to http://localhost:5000)
echo "VITE_SERVER_URL=https://skribbl-clone-d2z8.onrender.com" > .env.local
```

Start the frontend:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## How to Play

1. **Enter Your Name**: On the home page, enter a player name
2. **Create or Join Room**: 
   - Create a new private room and configure settings
   - OR join an existing room with a code
3. **Wait in Lobby**: Other players join your room
4. **Host Starts Game**: The room creator clicks "Start Game" when ready
5. **Drawing Phase**:
   - Current drawer selects a word and draws on the canvas
   - Other players type guesses in the chat
   - First correct guess gets maximum points
6. **Scoring**: Points awarded based on speed of guessing
7. **Turn Rotation**: After each round, the next player becomes the drawer
8. **Game End**: After all rounds, see the winner and final leaderboard

## Socket.IO Events

### Room Events
- `create_room` - Create a new game room
- `join_room` - Join an existing room
- `player_joined` - Broadcast when player joins
- `player_left` - Broadcast when player leaves
- `start_game` - Host initiates game start
- `set_ready` - Player marks ready status

### Game Events
- `game_started` - Game begins, send initial state
- `round_start` - New round begins
- `word_chosen` - Drawer selected a word
- `round_end` - Round finished, show results
- `game_over` - Game completed, show final leaderboard

### Drawing Events
- `draw` - Drawer sends stroke data
- `draw_data` - Broadcast stroke to all players
- `canvas_clear` - Clear entire canvas
- `stroke_undone` - Undo last stroke

### Guessing Events
- `submit_guess` - Player submits a word guess
- `guess_result` - Server validates and broadcasts result
- `correct_guess` - Broadcast correct guess to all

## Database Schema

### GameResult Collection
Stores completed game results for statistics and history:

```typescript
{
  gameId: string           // Unique game identifier
  roomCode: string         // Room code for reference
  players: [{
    name: string
    finalScore: number
    guessedCorrect: number
  }]
  winner: string          // Winner's name
  totalRounds: number     // Rounds completed
  settings: {
    maxPlayers: number
    rounds: number
    drawTime: number
    wordCount: number
    hints: number
  }
  createdAt: Date        // Game creation timestamp
  endedAt: Date          // Game end timestamp
}
```

## Deployment

### Backend (Render)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your GitHub repo
4. Set environment variables:
   ```
   MONGODB_URI=your_mongodb_atlas_url
   CLIENT_URL=https://your-frontend-domain.com
   NODE_ENV=production
   PORT=5000
   ```
5. Deploy and get your backend URL

### Frontend (Vercel)

1. Import project to Vercel
2. Set environment variable:
   ```
   VITE_SERVER_URL=https://skribbl-clone-d2z8.onrender.com
   ```
3. Deploy

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/skribbl
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Frontend (.env.local)
```
VITE_SERVER_URL=https://skribbl-clone-d2z8.onrender.com
```

## Game Flow & Scoring

### Game Phases
1. **Lobby**: Players join and ready up
2. **Word Selection**: Drawer chooses from 1-5 words
3. **Drawing**: Canvas display, drawer draws, others guess
4. **Round End**: Show word, update scores
5. **Game Over**: Final leaderboard after all rounds

### Scoring Logic
- **Correct Guess Points**: 100 - (time elapsed in 100ms increments)
- **Minimum Points**: 10 (for late correct guesses)
- **Drawer**: Doesn't earn points but can see guesses after round ends
- **Wrong Guesses**: No points deducted

## Testing

### Test in Multiple Browser Tabs
1. Open localhost:5173 in 2+ browser tabs
2. Create room in tab 1, join in tab 2
3. Verify:
   - Both see the same room code
   - Players list updates in real-time
   - Drawing strokes appear on all screens
   - Guesses are validated correctly
   - Scores update properly
   - All rounds complete successfully
   - Results save to MongoDB

### Verify MongoDB Storage
```bash
# Connect to MongoDB Atlas
mongosh "your_connection_string"

# Check database
use skribbl
db.gameresults.find().pretty()
```

## Known Limitations

- Authentication is not implemented (uses socket IDs as player identifiers)
- Word bank is pre-built (no custom word uploading yet)
- No persistent player profiles/statistics
- Spectator mode not implemented
- No voice chat
- Drawing is mouse/touch only (no stylus pressure)

## Future Enhancements

- User authentication and profiles
- Player statistics and ranking system
- Custom word list upload
- Different game modes (team play, elimination)
- Voice chat integration
- Replay feature
- Advanced drawing tools (shapes, lines)
- Theme customization
- Multiplayer tournament brackets

## Architecture Overview

### Frontend → Backend Communication
1. **React Component** → User action (draw, guess, etc.)
2. **Socket.IO Emit** → Send event to backend
3. **Backend Handler** → Validate & process
4. **Game Logic** → Update game state
5. **MongoDB** → Persist if needed (results only)
6. **Socket.IO Broadcast** → Send to all players
7. **React State Update** → Render changes

### Real-time Drawing Sync
- Strokes sent as individual objects (not full canvas)
- Each stroke contains: x, y, color, size, isEraser
- Latency ~50-100ms depending on network
- Drawing data stored in-memory during active game

### Game State Management
- **In-Memory**: Active games (Room, Game objects)
- **Persistent**: GameResult documents in MongoDB
- **Client-Side**: React state for UI rendering
- **Server-Authoritative**: Validation on all critical actions

## Build & Production

### Build Backend
```bash
cd backend
npm run build
# Output: dist/server.js
```

### Build Frontend
```bash
cd frontend
npm run build
# Output: dist/ (ready for static hosting)
```

### Start Production
```bash
# Backend
cd backend && npm start

# Frontend is static, served by CDN/Vercel
```

## Performance Considerations

- **Drawing**: Efficient stroke transmission (~200 bytes per stroke)
- **Canvas**: Redraw on reconnection only
- **Scaling**: Single Node.js instance supports ~500 concurrent games
- **Memory**: In-memory state cleaned when rooms empty

## License

MIT License - Feel free to use for personal and commercial projects

## Support

For issues or questions, check the GitHub issues or create a new one.

---

**Ready to play?** Start with `npm run dev` in both backend and frontend directories!

# Skribblrs.io

A real-time multiplayer drawing and guessing game (a clone of [skribbl.io](https://skribbl.io)). One player draws a word, everyone else races to guess it in chat. Faster guesses earn more points, and the player with the most points at the end wins.

**Live demo:** `<ADD-YOUR-LIVE-URL-HERE>` (e.g. `https://your-app.up.railway.app`)

> Free hosting tiers sleep when idle, so the first load can take a few seconds.

---

## Features

**Rooms and lobby**
- Create a private room and get an invite link (`/?id=<roomId>`)
- Join through the link, choose a name and an avatar
- Lobby shows all joined players; the room owner starts the game

**Game flow**
- Turn-based: every player draws once per round
- The drawer picks 1 of 3 random words (auto-picks if they take longer than 15 s)
- Other players see blanks (`_ _ _ _`) instead of the word
- Letter hints are revealed automatically during the second half of the round
- A round ends when the timer runs out or everyone has guessed
- Final scoreboard sorted by score at game end

**Drawing**
- Brush with 22 colors and 4 sizes
- Clear canvas (drawer only)
- Strokes are streamed live to every player over WebSockets

**Chat and guessing**
- Guesses and chat share one box
- "You guessed it right!" / "`<name>` has guessed the word!" notifications
- "That was very close!" message when a guess is within 2 edits of the word
- Time-based scoring: guess earlier, score more; the drawer gets a bonus per correct guesser

**Room settings (owner only)**
- Rounds: 2-10
- Draw time: 30-180 seconds
- Word language: Assamese, Bengali, English, Gujarati, Hindi, Kannada, Malayalam, Nepali, Oriya, Punjabi, Tamil, Telugu
- Custom words and a slider for how often custom words appear

**Extras**
- DiceBear avatars (style and background color)
- Sound effects (turn start, timer, correct guess, hints, game over)
- Transliteration helper for non-English languages (Varnam API)

---

## Tech stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express |
| Realtime | Socket.IO 4 |
| Views | EJS templates, Bootstrap 5, Animate.css |
| Canvas | HTML5 Canvas via [responsive-sketchpad](https://www.npmjs.com/package/responsive-sketchpad) |
| Audio | Howler.js |
| Utilities | `nanoid` (room IDs), `chance` (random picks), `leven` (guess distance), `grapheme-splitter` (multi-script words) |
| Linting | ESLint (airbnb-base, 4-space indent) |

---

## Project structure

```
.
├── app.js                 # Express app: static files + EJS index route
├── sockets.js             # Socket.IO setup; maps events to controller classes
├── words.json             # Word lists, one array per language
├── controllers/
│   ├── Rooms.js           # Create/join room, update settings
│   ├── Game.js            # Game loop, turns, word choice, guess checking, scoring
│   ├── Canvas.js          # Relays drawing and clear events
│   ├── Disconnect.js      # Handles players leaving
│   └── helpers.js         # Scoring, hints, word picking, timer wait
├── views/
│   ├── index.ejs
│   └── partials/          # landing, settings (lobby), gameZone, tools, gameEnd, footer
└── public/
    ├── js/                # settings.js (lobby), canvas.js, game.js, avatar.js, transliterate.js
    ├── css/index.css
    ├── images/
    └── audio/
```

---

## Local setup

**Requirements:** Node.js 18 or newer and npm.

```bash
git clone <your-repo-url>
cd Skribblrs.io-main
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). To test multiplayer, open the invite link in a second browser window or a private window.

### Important: server entry point

`package.json` starts the app with `node ./bin/www`, and the controllers expect these globals to exist before any socket connects:

| Global | Purpose |
|---|---|
| `games` | Object holding the state of every room |
| `round` | An `EventEmitter` used to end a round early when everybody has guessed |
| `MAX_POINTS` | Maximum points for an instant correct guess |
| `BONUS` | Points the drawer earns for each correct guess |

If `bin/www` is missing from your copy, create it like this:

```js
#!/usr/bin/env node
const http = require('http');
const { EventEmitter } = require('events');
const app = require('../app');
const sockets = require('../sockets');

global.games = {};
global.round = new EventEmitter();
global.MAX_POINTS = 500; // example value, tune to taste
global.BONUS = 50;       // example value, tune to taste

const port = process.env.PORT || 3000;
const server = http.createServer(app);
sockets.init(server);
server.listen(port, () => console.log(`Listening on port ${port}`));
```

---

## How to play

1. One player enters a name, picks an avatar and clicks **Create Private Room**.
2. The owner adjusts rounds, draw time and language, then shares the invite link.
3. Friends open the link, enter their names and click **Join Room**.
4. The owner clicks **Start Game**.
5. Each turn the drawer picks a word and draws it. Everyone else types guesses in the chat box.
6. After every player has drawn in every round, the final scores are shown.

---

## Architecture overview

```
 Browser (drawer)                  Server (Node + Socket.IO)                 Browser (guessers)
┌──────────────────┐            ┌──────────────────────────────┐          ┌──────────────────┐
│ canvas.js        │  drawing   │ sockets.js                   │ drawing  │ canvas.js        │
│  mouse events ───┼──────────► │  routes events to classes:   │ ───────► │  redraws segment │
│                  │            │   Canvas  → relay strokes    │          │                  │
│ game.js          │  message   │   Game    → turns, guesses   │ message  │ game.js          │
│  chat/guess ─────┼──────────► │   Room    → lobby, settings  │ ───────► │  chat, scores    │
│                  │            │   Disconnect → cleanup       │          │                  │
│ settings.js      │ chooseWord │                              │ hints,   │ settings.js      │
│  lobby ──────────┼──────────► │ global `games[roomId]` state │ timer…   │  lobby           │
└──────────────────┘            └──────────────────────────────┘          └──────────────────┘
```

### Drawing: capture, send, render
1. **Capture:** while the drawer holds the mouse button, `canvas.js` listens to `mousemove` (throttled to one event per 10 ms).
2. **Normalize:** each event becomes a line segment `{ start, end, lineColor, lineSize }`. Coordinates are divided by the canvas width and height, so they are values between 0 and 1.
3. **Send:** the segment is emitted as a `drawing` event.
4. **Relay:** `Canvas.broadcastDrawing` rebroadcasts it to everyone else in the room (`socket.broadcast.to(roomID)`).
5. **Render:** each client multiplies the coordinates by its own canvas size and draws the line. Players with different screen sizes therefore see the same picture.

### Game state, turns and scoring
- All room state lives in the global `games` object, keyed by room ID. Each room stores its settings (`rounds`, `time`, `language`, `customWords`), the current word, the current drawer, the round start time, and one entry per player (`name`, `avatar`, `score`).
- `Game.startGame` loops over `rounds`, and inside it over every player. `giveTurnTo` runs one turn:
  1. Resets guess flags and tells everyone who is choosing.
  2. Sends the drawer 3 words (`chooseWord`) and waits for their pick.
  3. Sends blanks to the guessers (`hideWord`) and the hint schedule (`hints`), then emits `startTimer`.
  4. Waits until the timer ends or every guesser is correct (`everybodyGuessed`).
  5. Emits `lastWord` so players see the answer.
- After the final turn the server emits `endGame` with all scores and deletes the room.
- **Points:** `floor((timeLeft / roundTime) * MAX_POINTS)` for the guesser, plus `BONUS` for the drawer.

### Word matching
Implemented in `Game.onMessage`:
1. The guess is lower-cased and trimmed; empty guesses are ignored.
2. It is compared with the lower-cased current word using Levenshtein distance (`leven`).
3. Distance `0` is a **correct guess**. Only the first correct guess per player scores, and the drawer cannot score.
4. Distance `1` or `2` triggers a private "very close" hint, and the message is shown to everyone.
5. Anything else is a normal chat message.

There is no partial or substring matching; the whole guess must match the whole word.

### WebSocket events

| Event | Direction | Purpose |
|---|---|---|
| `newPrivateRoom` | client → server → client | Create a room, receive its ID |
| `joinRoom` | client → server → others | Join a room, announce the player |
| `otherPlayers` | server → client | Players already in the room |
| `settingsUpdate` | client → server → others | Owner changed settings |
| `startGame` | client → server → others | Begin the game |
| `getPlayers` | client ↔ server | Load the scoreboard |
| `choosing` / `chooseWord` | server → client | Drawer is picking / word options for the drawer |
| `hideWord` | server → guessers | Word shown as blanks |
| `hints` | server → guessers | Hint schedule |
| `startTimer` | server → all | Start the countdown |
| `drawing` / `clearCanvas` | client → server → others | Stroke and clear sync |
| `message` | client ↔ server | Chat and guesses |
| `correctGuess` / `closeGuess` | server → client | Guess feedback |
| `updateScore` | server → all | Score update |
| `lastWord` | server → guessers | Reveal the word |
| `disableCanvas` | server → previous drawer | Lock the canvas |
| `disconnection` | server → others | A player left |
| `endGame` | server → all | Final scores |

---

## Deployment

The app is a single Node process serving both the pages and the WebSocket connection, so it needs a host with persistent WebSocket support.

**Render / Railway (recommended)**
1. Push the repo to GitHub.
2. Create a new Web Service from the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. The app reads the `PORT` environment variable (see the entry point above).
5. Copy the public URL into the **Live demo** line at the top of this file.

**Vercel / Netlify:** serverless functions do not keep WebSocket connections open, so the Node server cannot run there. Host the server on Render or Railway instead.

**Important:** game state is stored in memory. Run exactly one instance, because multiple instances would not share rooms, and a restart ends all running games.

---

## Known limitations

- No undo, eraser tool, or public room list
- Max players, number of word choices (fixed at 3), hint count and word mode are not configurable
- Draw time is limited to 30-180 s
- Players join by link only (no short room code)
- No kick, ban, votekick or spectator mode
- State is in memory only (no database)

---

## Credits

- Based on [Skribblrs.io by Aditya DS](https://github.com/Aditya-ds-1806/Skribblrs.io) (MIT). Update this section to describe your own changes.
- Idea and reference: [skribbl.io](https://skribbl.io)
- Feature ideas: [scribble.rs](https://github.com/scribble-rs/scribble.rs)
- Sounds: [freesound.org](https://freesound.org/)
- Avatars: [DiceBear](https://github.com/DiceBear/avatars)

## License

MIT. See [LICENSE](./LICENSE).

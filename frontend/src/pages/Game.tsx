import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { GameState } from '../types';

export const Game: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = getSocket();

  const navState = (location.state as any)?.gameState as GameState | undefined;
  const [gameState, setGameState] = useState<GameState | null>(navState ?? null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [, setSelectedWord] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(navState?.settings?.drawTime ?? 0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Server-synced timer that stops immediately when phase changes
  useEffect(() => {
    if (!gameState || gameState.phase !== 'drawing' || !gameState.roundEndTime) {
      clearTimer();
      // Stop timer visually when round ends or game is over
      if (gameState && gameState.phase !== 'drawing') {
        setTimeLeft(0);
      } else {
        setTimeLeft(gameState?.settings?.drawTime ?? 0);
      }
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((gameState.roundEndTime - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearTimer();
      }
    };

    updateTimer(); // Run immediately
    timerRef.current = setInterval(updateTimer, 500); // Check twice a second for smooth UI

    return () => clearTimer();
  }, [gameState?.roundEndTime, gameState?.phase, gameState?.settings?.drawTime]);

  // Fetch state on mount
  useEffect(() => {
    if (!gameState && roomCode) {
      const timeoutId = setTimeout(() => {
        navigate(`/lobby/${roomCode}`);
      }, 3000);

      socket.emit('get_game_state', { roomCode }, (response: any) => {
        clearTimeout(timeoutId);
        if (response?.success && response.gameState) {
          setGameState(response.gameState);
        } else {
          navigate(`/lobby/${roomCode}`);
        }
      });
    }
  }, [roomCode, gameState, socket, navigate]);

  // Socket listeners
  useEffect(() => {
    if (!roomCode) return;

    const onGameStarted = (data: any) => setGameState(data.gameState);
    const onWordSelected = (data: any) => setGameState(data.gameState);
    
    const onNewRoundStarted = (data: any) => {
      setGameState(data.gameState);
      setMessages(prev => [...prev, { type: 'system', text: `Round ${data.gameState.currentRound} started!` }]);
    };

    const onDrawData = (data: any) => {
      setGameState(prev => prev ? { ...prev, drawingData: [...prev.drawingData, data.stroke] } : prev);
    };

    const onCanvasCleared = () => {
      setGameState(prev => prev ? { ...prev, drawingData: [] } : prev);
    };

    const onStrokeUndone = () => {
      setGameState(prev => {
        if (!prev) return prev;
        const newData = [...prev.drawingData];
        newData.pop();
        return { ...prev, drawingData: newData };
      });
    };

    const onCorrectGuess = (data: any) => {
      // Receives full gameState from backend, so scores update perfectly
      if (data.gameState) setGameState(data.gameState);
      setMessages(prev => [
        ...prev,
        { type: 'correct', text: `${data.playerName} guessed the word!`, word: data.word },
      ]);
    };

    const onRoundEnd = (data: any) => {
      clearTimer();
      setGameState(data.gameState); // This updates the UI to show the full revealed word
      setMessages(prev => [
        ...prev,
        { type: 'system', text: `Round ended. Word was: ${data.gameState.currentWord}` },
      ]);
    };

    const onGameOver = (data: any) => {
      clearTimer();
      navigate(`/results/${roomCode}`, { state: { gameData: data } });
    };

    const onHintRevealed = (data: any) => {
      setGameState(data.gameState);
    };

    socket.on('game_started', onGameStarted);
    socket.on('word_selected', onWordSelected);
    socket.on('new_round_started', onNewRoundStarted);
    socket.on('draw_data', onDrawData);
    socket.on('canvas_cleared', onCanvasCleared);
    socket.on('stroke_undone', onStrokeUndone);
    socket.on('correct_guess', onCorrectGuess);
    socket.on('round_end', onRoundEnd);
    socket.on('game_over', onGameOver);
    socket.on('hint_revealed', onHintRevealed);

    return () => {
      socket.off('game_started', onGameStarted);
      socket.off('word_selected', onWordSelected);
      socket.off('new_round_started', onNewRoundStarted);
      socket.off('draw_data', onDrawData);
      socket.off('canvas_cleared', onCanvasCleared);
      socket.off('stroke_undone', onStrokeUndone);
      socket.off('correct_guess', onCorrectGuess);
      socket.off('round_end', onRoundEnd);
      socket.off('game_over', onGameOver);
      socket.off('hint_revealed', onHintRevealed);
      clearTimer();
    };
  }, [socket, navigate, roomCode]);

  // Actions
  const handleSelectWord = (word: string) => {
    socket.emit('select_word', { roomCode, word }, (response: any) => {
      if (response?.success) setSelectedWord(word);
    });
  };

  const handleStroke = (stroke: any) => socket.emit('draw', { roomCode, stroke });
  const handleClear = () => socket.emit('canvas_clear', { roomCode });
  const handleUndo = () => socket.emit('undo_stroke', { roomCode });
  
  const handleRevealHint = () => {
    socket.emit('reveal_hint', { roomCode });
  };

  const handleSubmitGuess = () => {
    if (!message.trim()) return;
    const guess = message;
    setMessage('');
    socket.emit('submit_guess', { roomCode, guess }, (response: any) => {
      if (!response?.isCorrect) {
        setMessages(prev => [...prev, { type: 'guess', text: guess, isYou: true }]);
      }
    });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin mb-4 text-4xl">⏳</div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  const currentDrawer = gameState.players[gameState.currentDrawerIndex];
  const isDrawer = currentDrawer?.id === socket.id;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              Round {gameState.currentRound}/{gameState.totalRounds}
            </h1>
            <div className="text-right">
              <p className="text-sm text-gray-600">Drawer:</p>
              <p className="text-lg font-semibold text-indigo-600">
                {currentDrawer?.name} {isDrawer && '(You)'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-red-600">
              {timeLeft}s
            </div>
            <div className="text-2xl font-bold text-gray-800 tracking-widest">
              {gameState.wordHint || 'Waiting for word...'}
            </div>
            {isDrawer && gameState.phase === 'drawing' && (
              <button 
                onClick={handleRevealHint}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Reveal Letter
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-3">
            {gameState.phase === 'word-selection' && isDrawer ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Choose a Word</h2>
                <div className="grid grid-cols-1 gap-3">
                  {(gameState.wordOptions || []).map((word, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectWord(word)}
                      className="p-4 border-2 border-indigo-500 rounded-lg font-bold text-lg hover:bg-indigo-500 hover:text-white transition-colors"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <DrawingCanvas
                isDrawer={isDrawer && gameState.phase === 'drawing'}
                onStroke={handleStroke}
                onClear={handleClear}
                onUndo={handleUndo}
                drawingData={gameState.drawingData || []}
              />
            )}
          </div>

          {/* Right Panel (Leaderboard & Chat) */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Scores</h3>
              <div className="space-y-2">
                {[...gameState.players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, idx) => (
                    <div key={player.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {idx + 1}. {player.name}
                          {player.id === socket.id && <span className="ml-1 text-xs text-gray-500">(You)</span>}
                        </p>
                      </div>
                      <span className="font-bold text-indigo-600">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col flex-1 min-h-80">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Chat</h3>
              <div className="flex-1 overflow-y-auto mb-3 space-y-2 text-sm">
                {messages.map((msg, idx) => (
                  <div key={idx} className="text-gray-700">
                    {msg.type === 'system' && <p className="text-yellow-700 font-semibold">{msg.text}</p>}
                    {msg.type === 'correct' && <p className="text-green-700 font-bold">✓ {msg.text}</p>}
                    {msg.type === 'guess' && (
                      <p className={msg.isYou ? 'text-blue-700 font-medium' : 'text-gray-700'}>
                        {msg.isYou ? 'You: ' : ''}{msg.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {!isDrawer && gameState.phase === 'drawing' && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmitGuess()}
                    placeholder="Type your guess..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button onClick={handleSubmitGuess} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                    Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
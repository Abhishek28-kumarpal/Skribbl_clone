import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { GameState } from '../types';

export const Game: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socket = getSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [, setSelectedWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    socket.on('game_started', (data: any) => {
      setGameState(data.gameState);
      setTimeLeft(data.gameState.settings.drawTime);
    });

    socket.on('word_selected', (data: any) => {
      setGameState(data.gameState);
      setMessages(prev => [...prev, { type: 'system', text: 'Word selected!' }]);
      setTimeLeft(data.gameState.settings.drawTime);
      startRoundTimer(data.gameState.settings.drawTime);
    });

    socket.on('draw_data', (data: any) => {
      const { stroke } = data;
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          drawingData: [...prev.drawingData, stroke],
        };
      });
    });

    socket.on('canvas_cleared', () => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, drawingData: [] };
      });
    });

    socket.on('stroke_undone', () => {
      setGameState(prev => {
        if (!prev) return prev;
        const newData = [...prev.drawingData];
        newData.pop();
        return { ...prev, drawingData: newData };
      });
    });

    socket.on('correct_guess', (data: any) => {
      if (data.gameState) {
        setGameState(data.gameState);
      }
      setMessages(prev => [
        ...prev,
        {
          type: 'correct',
          text: `${data.playerName} guessed the word!`,
          word: data.word,
        },
      ]);
    });

    socket.on('round_end', (data: any) => {
      setGameState(data.gameState);
      setMessages(prev => [
        ...prev,
        {
          type: 'system',
          text: `Round ended. Word was: ${data.gameState.currentWord}`,
        },
      ]);
      setTimeout(() => handleEndRound(), 2000);
    });

    socket.on('game_over', (data: any) => {
      navigate(`/results/${roomCode}`, { state: { gameData: data } });
    });

    return () => {
      socket.off('game_started');
      socket.off('word_selected');
      socket.off('draw_data');
      socket.off('canvas_cleared');
      socket.off('stroke_undone');
      socket.off('correct_guess');
      socket.off('round_end');
      socket.off('game_over');
    };
  }, [socket, navigate, roomCode]);

  const startRoundTimer = (duration: number) => {
    let remaining = duration;
    const interval = setInterval(() => {
      remaining--;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleEndRound();
      }
    }, 1000);
  };

  const handleSelectWord = (word: string) => {
    socket.emit('select_word', { roomCode, word }, (response: any) => {
      if (response.success) {
        setSelectedWord(word);
      }
    });
  };

  const handleStroke = (stroke: any) => {
    socket.emit('draw', { roomCode, stroke });
  };

  const handleClear = () => {
    socket.emit('canvas_clear', { roomCode });
  };

  const handleUndo = () => {
    socket.emit('undo_stroke', { roomCode });
  };

  const handleSubmitGuess = () => {
    if (!message.trim()) return;

    socket.emit(
      'submit_guess',
      { roomCode, guess: message },
      (response: any) => {
        setMessages(prev => [
          ...prev,
          {
            type: response.isCorrect ? 'correct' : 'guess',
            text: message,
            isYou: true,
          },
        ]);
        setMessage('');
      }
    );
  };

  const handleEndRound = () => {
    socket.emit('end_round', { roomCode });
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin mb-4">⏳</div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  const isDrawer = gameState.players[gameState.currentDrawerIndex].id === socket.id;
  const currentDrawer = gameState.players[gameState.currentDrawerIndex];

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
                {currentDrawer.name} {isDrawer && '(You)'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-red-600">{Math.ceil(timeLeft)}s</div>
            <div className="text-lg font-semibold text-gray-800">
              {gameState.wordHint || 'Waiting for word...'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-3">
            {gameState.phase === 'word-selection' && isDrawer ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Choose a Word
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  {gameState.wordOptions.map((word, idx) => (
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
                drawingData={gameState.drawingData}
              />
            )}
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-4">
            {/* Leaderboard */}
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
                        </p>
                      </div>
                      <span className="font-bold text-indigo-600">{player.score}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col flex-1 min-h-80">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Chat</h3>
              <div className="flex-1 overflow-y-auto mb-3 space-y-2 text-sm">
                {messages.map((msg, idx) => (
                  <div key={idx} className="text-gray-700">
                    {msg.type === 'system' && (
                      <p className="text-yellow-700 font-semibold">{msg.text}</p>
                    )}
                    {msg.type === 'correct' && (
                      <p className="text-green-700 font-bold">✓ {msg.text}</p>
                    )}
                    {msg.type === 'guess' && (
                      <p className={msg.isYou ? 'text-blue-700' : 'text-gray-700'}>
                        {msg.text}
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
                    onKeyPress={e => e.key === 'Enter' && handleSubmitGuess()}
                    placeholder="Type your guess..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    onClick={handleSubmitGuess}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
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

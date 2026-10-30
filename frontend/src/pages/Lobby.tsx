import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { Player, RoomData } from '../types';
import { Copy, Check } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = getSocket();
  const playerName = (location.state as any)?.playerName || 'Unknown';
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    socket.emit(
      'join_room',
      { roomCode, playerName },
      (response: any) => {
        if (response.success) {
          const roomData: RoomData = response.roomData;
          setPlayers(roomData.players);
          setIsHost(roomData.hostId === socket.id);
        } else {
          setError(response.error || 'Failed to join room');
          setTimeout(() => navigate('/'), 3000);
        }
      }
    );

    socket.on('player_joined', (data: any) => {
      setPlayers(data.players);
    });

    socket.on('player_ready_status', (data: any) => {
      setPlayers(data.players);
    });

    socket.on('game_started', () => {
      navigate(`/game/${roomCode}`);
    });

    return () => {
      socket.off('player_joined');
      socket.off('player_ready_status');
      socket.off('game_started');
    };
  }, [roomCode, socket, navigate]);

  const handleReady = () => {
    socket.emit('set_ready', { roomCode, ready: !ready });
    setReady(!ready);
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      setError('Need at least 2 players');
      return;
    }

    socket.emit('start_game', { roomCode }, (response: any) => {
      if (!response.success) {
        setError(response.error || 'Failed to start game');
      }
    });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?code=${roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allReady = players.length > 1 && players.every(p => p.ready);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Lobby
          </h1>
          <p className="text-center text-gray-600 mb-6">Waiting for players...</p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Room Code */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-800 mb-2">Room Code</h2>
            <div className="flex items-center gap-2 mb-2">
              <code className="text-2xl font-bold text-indigo-600 flex-1">{roomCode}</code>
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Share the code or link with friends to join
            </p>
          </div>

          {/* Players List */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Players ({players.length})
            </h2>
            <div className="space-y-2">
              {players.map(player => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{player.name}</p>
                    {isHost && player.id === socket.id && (
                      <span className="text-xs text-indigo-600 font-semibold">
                        (Host)
                      </span>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      player.ready
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {player.ready ? '✓ Ready' : 'Not Ready'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!isHost && (
              <button
                onClick={handleReady}
                className={`w-full font-bold py-3 rounded-lg transition-all duration-200 ${
                  ready
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
              >
                {ready ? '✓ Ready to Play' : 'Not Ready'}
              </button>
            )}

            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!allReady}
                className={`w-full font-bold py-3 rounded-lg transition-all duration-200 ${
                  allReady
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white cursor-pointer'
                    : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                }`}
              >
                Start Game
              </button>
            )}

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition-colors"
            >
              Leave
            </button>
          </div>

          {players.length < 2 && isHost && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              Waiting for at least 2 players to start
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

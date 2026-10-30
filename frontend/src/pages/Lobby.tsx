import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { Player, RoomData } from '../types';
import { Copy, Check } from 'lucide-react';

export const Lobby: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const socket = getSocket();

  // ---- Player name resolution (fixes the "Unknown" issue) ----
  // Priority: location.state > localStorage > empty (prompt user)
  const [playerName, setPlayerName] = useState<string>('');
  const [nameConfirmed, setNameConfirmed] = useState(false);

  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  // Track whether we've already auto-readied the host (avoids re-emitting on every render)
  const hasAutoReadiedRef = useRef(false);

  // Resolve the player name once on mount / when location.state changes
  useEffect(() => {
    const stateName = (location.state as any)?.playerName;
    const storedName = localStorage.getItem('playerName');
    const resolvedName = (stateName || storedName || '').trim();

    if (resolvedName) {
      setPlayerName(resolvedName);
      setNameConfirmed(true);
    } else {
      setPlayerName('');
      setNameConfirmed(false);
    }
  }, [location.state]);

  const handleNameSubmit = () => {
    const trimmed = playerName.trim();
    if (!trimmed) return;
    localStorage.setItem('playerName', trimmed);
    setPlayerName(trimmed);
    setNameConfirmed(true);
  };

  // ---- Join room & socket listeners ----
  useEffect(() => {
    if (!nameConfirmed || !playerName || !roomCode) return;

    // Reset auto-ready flag for this room/session
    hasAutoReadiedRef.current = false;

    socket.emit(
      'join_room',
      { roomCode, playerName },
      (response: any) => {
        if (response.success) {
          const roomData: RoomData = response.roomData;
          setPlayers(roomData.players);

          const hostId = roomData.hostId;
          const iAmHost = hostId === socket.id;
          setIsHost(iAmHost);

          // FIX #1: Host is automatically ready for every game
          if (iAmHost && !hasAutoReadiedRef.current) {
            setReady(true);
            socket.emit('set_ready', { roomCode, ready: true });
            hasAutoReadiedRef.current = true;
          }
        } else {
          setError(response.error || 'Failed to join room');
          setTimeout(() => navigate('/'), 3000);
        }
      }
    );

    const onPlayerJoined = (data: any) => setPlayers(data.players);
    const onReadyStatus = (data: any) => setPlayers(data.players);
    const onGameStarted = () => navigate(`/game/${roomCode}`);

    socket.on('player_joined', onPlayerJoined);
    socket.on('player_ready_status', onReadyStatus);
    socket.on('game_started', onGameStarted);

    return () => {
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_ready_status', onReadyStatus);
      socket.off('game_started', onGameStarted);
    };
  }, [roomCode, socket, navigate, nameConfirmed, playerName]);

  const handleReady = () => {
    const newReady = !ready;
    socket.emit('set_ready', { roomCode, ready: newReady });
    setReady(newReady);
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

  const handleLeave = () => {
    socket.emit('leave_room', { roomCode });
    navigate('/');
  };

  const allReady =
    players.length > 1 && players.every((p) => p.ready);

  // ---- Name prompt screen (FIX #2/#3) ----
  if (!nameConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
            Welcome!
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Please enter your name to join room <strong>{roomCode}</strong>
          </p>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
            placeholder="Your name"
            maxLength={20}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
          />
          <button
            onClick={handleNameSubmit}
            disabled={!playerName.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
          >
            Continue
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full mt-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---- Lobby UI ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Lobby
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Playing as <span className="font-semibold text-indigo-600">{playerName}</span>
            {isHost && (
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                Host
              </span>
            )}
          </p>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Room Code */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-800 mb-2">Room Code</h2>
            <div className="flex items-center gap-2 mb-2">
              <code className="text-2xl font-bold text-indigo-600 flex-1">
                {roomCode}
              </code>
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
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {player.name}
                      {player.id === socket.id && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </p>
                    {isHost && player.id === socket.id && (
                      <span className="text-xs text-indigo-600 font-semibold">
                        Host
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
            {/* Host is always ready — no toggle shown. Non-hosts get the toggle. */}
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
              onClick={handleLeave}
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
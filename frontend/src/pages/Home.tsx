import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { Pencil } from 'lucide-react';

interface PublicRoom {
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const socket = getSocket();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    socket.emit(
      'create_room',
      {
        playerName,
        settings: {
          maxPlayers: 8,
          rounds: 5,
          drawTime: 80,
          wordCount: 3,
          hints: 2,
          isPrivate: true,
        },
      },
      (response: any) => {
        if (response.success) {
          navigate(`/create/${response.roomCode}`, { state: { playerName } });
        } else {
          setError(response.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    socket.emit(
      'join_room',
      { roomCode: joinCode.toUpperCase(), playerName },
      (response: any) => {
        if (response.success) {
          navigate(`/lobby/${joinCode.toUpperCase()}`, { state: { playerName } });
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

  const handleJoinPublicRoom = (roomCode: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    socket.emit(
      'join_room',
      { roomCode, playerName },
      (response: any) => {
        if (response.success) {
          navigate(`/lobby/${roomCode}`, { state: { playerName } });
        } else {
          setError(response.error || 'Failed to join room');
        }
      }
    );
  };

  const loadPublicRooms = () => {
    socket.emit('get_public_rooms', {}, (response: any) => {
      setPublicRooms(response.rooms || []);
    });
  };

  useEffect(() => {
    loadPublicRooms();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Pencil className="w-12 h-12 text-white" />
            <h1 className="text-5xl font-bold text-white">Skribbl Clone</h1>
          </div>
          <p className="text-xl text-white/90">
            Draw, Guess, and Win with Friends
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Player Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => {
                setPlayerName(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Create Room */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Create a New Game
            </h2>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Create Private Room
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or</span>
            </div>
          </div>

          {/* Join Room */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Join a Game
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="Enter room code"
                maxLength={6}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none uppercase"
              />
              <button
                onClick={handleJoinRoom}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Join
              </button>
            </div>
          </div>

          {/* Public Rooms */}
          {publicRooms.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Available Games
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {publicRooms.map(room => (
                  <div
                    key={room.roomCode}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {room.hostName}'s Game
                      </p>
                      <p className="text-sm text-gray-600">
                        {room.playerCount}/{room.maxPlayers} Players
                      </p>
                    </div>
                    <button
                      onClick={() => handleJoinPublicRoom(room.roomCode)}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* How to Play */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-4">How to Play</h2>
          <ul className="space-y-2 text-sm">
            <li>🎮 One player draws while others guess the word</li>
            <li>🎨 Correct guesses earn points based on speed</li>
            <li>🔄 Take turns being the drawer each round</li>
            <li>🏆 Highest score at the end wins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { Copy, Check } from 'lucide-react';

export const CreateRoom: React.FC = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const socket = getSocket();
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    rounds: 5,
    drawTime: 80,
    wordCount: 3,
    hints: 2,
  });

  const copyToClipboard = () => {
    const inviteLink = `${window.location.origin}?code=${roomCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    navigate(`/lobby/${roomCode}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
            Configure Game
          </h1>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-gray-800 mb-2">Room Code</h2>
            <div className="flex items-center gap-2">
              <code className="text-2xl font-bold text-blue-600 flex-1">{roomCode}</code>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Players: {settings.maxPlayers}
              </label>
              <input
                type="range"
                min="2"
                max="20"
                value={settings.maxPlayers}
                onChange={e => setSettings({ ...settings, maxPlayers: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rounds: {settings.rounds}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={settings.rounds}
                onChange={e => setSettings({ ...settings, rounds: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Draw Time (seconds): {settings.drawTime}
              </label>
              <input
                type="range"
                min="15"
                max="240"
                step="15"
                value={settings.drawTime}
                onChange={e => setSettings({ ...settings, drawTime: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Word Choices: {settings.wordCount}
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={settings.wordCount}
                onChange={e => setSettings({ ...settings, wordCount: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hints: {settings.hints}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                value={settings.hints}
                onChange={e => setSettings({ ...settings, hints: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>

          <button
            onClick={handleStartGame}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Continue to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

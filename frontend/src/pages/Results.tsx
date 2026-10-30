import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trophy, Home } from 'lucide-react';

export const Results: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const gameData = (location.state as any)?.gameData;

  useEffect(() => {
    if (!gameData) {
      navigate('/');
    }
  }, [gameData, navigate]);

  if (!gameData) {
    return null;
  }

  const sortedPlayers = [...gameData.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-600 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Winner Section */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center mb-6">
          <div className="flex justify-center mb-4">
            <Trophy className="w-16 h-16 text-yellow-500" />
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {winner.name}
          </h1>
          <p className="text-xl text-gray-600 mb-1">
            Wins the Game! 🎉
          </p>
          <p className="text-3xl font-bold text-indigo-600">
            {winner.score} Points
          </p>
        </div>

        {/* Final Leaderboard */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Final Leaderboard
          </h2>

          <div className="space-y-3">
            {sortedPlayers.map((player, idx) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  idx === 0
                    ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400'
                    : idx === 1
                    ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-gray-300'
                    : idx === 2
                    ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-2 border-orange-300'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-2xl font-bold text-gray-800 w-8">
                    {idx === 0 && '🥇'}
                    {idx === 1 && '🥈'}
                    {idx === 2 && '🥉'}
                    {idx > 2 && `${idx + 1}.`}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{player.name}</p>
                    <p className="text-sm text-gray-600">
                      {player.guessedCorrectCount} correct guesses
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">
                    {player.score}
                  </p>
                  <p className="text-xs text-gray-600">points</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Stats */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Game Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-indigo-600">
                {gameData.gameState.totalRounds}
              </p>
              <p className="text-sm text-gray-600">Rounds Played</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {gameData.players.length}
              </p>
              <p className="text-sm text-gray-600">Total Players</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">
                {gameData.gameState.settings.drawTime}s
              </p>
              <p className="text-sm text-gray-600">Draw Time</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 font-bold py-3 rounded-lg shadow-lg transition-all duration-200"
          >
            <Home size={20} />
            Back to Home
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all duration-200"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

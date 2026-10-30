import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getSocket } from './services/socket';
import { Home } from './pages/Home';
import { CreateRoom } from './pages/CreateRoom';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { Results } from './pages/Results';

function AppContent() {

  useEffect(() => {
    getSocket();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create/:roomCode" element={<CreateRoom />} />
      <Route path="/lobby/:roomCode" element={<Lobby />} />
      <Route path="/game/:roomCode" element={<Game />} />
      <Route path="/results/:roomCode" element={<Results />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Players from './pages/Players';
import Games from './pages/Games';
import GameDetail from './pages/GameDetail';
import TeamDetail from './pages/TeamDetail';
import Stats from './pages/Stats';
import Seasons from './pages/Seasons';
import Standings from './pages/Standings';
import './pages/Pages.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/games" element={<Games />} />
        <Route path="/games/:gameId" element={<GameDetail />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/seasons" element={<Seasons />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/teams/:teamAbbr" element={<TeamDetail />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SportProvider } from './context/SportContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// NBA Pages
import Home from './pages/nba/NBAHome';
import Players from './pages/nba/NBAPlayers';
import Games from './pages/nba/NBAGames';
import GameDetail from './pages/nba/NBAGameDetail';
import TeamDetail from './pages/nba/NBATeamDetail';
import Stats from './pages/nba/NBAStats';
import Seasons from './pages/nba/NBASeasons';
import Standings from './pages/nba/NBAStandings';

// NFL Pages
import NFLHome from './pages/nfl/NFLHome';
import NFLGames from './pages/nfl/NFLGames';
import NFLGameDetail from './pages/nfl/NFLGameDetail';
import NFLTeamDetail from './pages/nfl/NFLTeamDetail';
import NFLStandings from './pages/nfl/NFLStandings';
import NFLPlayers from './pages/nfl/NFLPlayers';
import NFLStats from './pages/nfl/NFLStats';
import NFLSeasons from './pages/nfl/NFLSeasons';

// UFC Pages
import UFCHome from './pages/ufc/UFCHome';
import UFCEvents from './pages/ufc/UFCEvents';
import UFCEventDetail from './pages/ufc/UFCEventDetail';
import UFCFighters from './pages/ufc/UFCFighters';
import UFCRankings from './pages/ufc/UFCRankings';
import UFCStats from './pages/ufc/UFCStats';
import UFCHistory from './pages/ufc/UFCHistory';

import './pages/Pages.css';

function App() {
  return (
    <BrowserRouter>
      <SportProvider>
        <Navbar />
        <Routes>
          {/* Default home — NBA */}
          <Route path="/" element={<Home />} />

          {/* === NBA Routes === */}
          <Route path="/nba" element={<Home />} />
          <Route path="/nba/games" element={<Games />} />
          <Route path="/nba/games/:gameId" element={<GameDetail />} />
          <Route path="/nba/standings" element={<Standings />} />
          <Route path="/nba/players" element={<Players />} />
          <Route path="/nba/stats" element={<Stats />} />
          <Route path="/nba/seasons" element={<Seasons />} />
          <Route path="/nba/teams/:teamAbbr" element={<TeamDetail />} />

          {/* Legacy NBA routes — redirect for backward compatibility */}
          <Route path="/players" element={<Navigate to="/nba/players" replace />} />
          <Route path="/games" element={<Navigate to="/nba/games" replace />} />
          <Route path="/games/:gameId" element={<GameDetail />} />
          <Route path="/stats" element={<Navigate to="/nba/stats" replace />} />
          <Route path="/seasons" element={<Navigate to="/nba/seasons" replace />} />
          <Route path="/standings" element={<Navigate to="/nba/standings" replace />} />
          <Route path="/teams/:teamAbbr" element={<TeamDetail />} />

          {/* === NFL Routes === */}
          <Route path="/nfl" element={<NFLHome />} />
          <Route path="/nfl/games" element={<NFLGames />} />
          <Route path="/nfl/games/:gameId" element={<NFLGameDetail />} />
          <Route path="/nfl/standings" element={<NFLStandings />} />
          <Route path="/nfl/players" element={<NFLPlayers />} />
          <Route path="/nfl/stats" element={<NFLStats />} />
          <Route path="/nfl/seasons" element={<NFLSeasons />} />
          <Route path="/nfl/teams/:teamAbbr" element={<NFLTeamDetail />} />

          {/* === UFC Routes === */}
          <Route path="/ufc" element={<UFCHome />} />
          <Route path="/ufc/events" element={<UFCEvents />} />
          <Route path="/ufc/events/:eventId" element={<UFCEventDetail />} />
          <Route path="/ufc/fighters" element={<UFCFighters />} />
          <Route path="/ufc/rankings" element={<UFCRankings />} />
          <Route path="/ufc/stats" element={<UFCStats />} />
          <Route path="/ufc/history" element={<UFCHistory />} />
        </Routes>
        <Footer />
      </SportProvider>
    </BrowserRouter>
  );
}

export default App;

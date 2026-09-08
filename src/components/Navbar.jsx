import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { courtAudio } from '../utils/audio';
import SettingsModal from './SettingsModal';
import './Navbar.css';

const searchableItems = [
  { label: 'Players', path: '/players', keywords: ['players', 'roster', 'athlete', 'nba players'] },
  { label: 'Games', path: '/games', keywords: ['games', 'scores', 'matchup', 'schedule', 'box score'] },
  { label: 'Stats', path: '/stats', keywords: ['stats', 'statistics', 'analytics', 'leaderboard', 'ppg', 'rpg'] },
  { label: 'Standings', path: '/standings', keywords: ['standings', 'conference', 'division', 'rank', 'record'] },
  { label: 'Seasons', path: '/seasons', keywords: ['seasons', 'year', 'campaign', 'history'] },
  // Star Players
  { label: 'LeBron James', path: '/players', keywords: ['lebron', 'james', 'lakers', 'king'] },
  { label: 'Stephen Curry', path: '/players', keywords: ['curry', 'steph', 'warriors', 'chef'] },
  { label: 'Kevin Durant', path: '/players', keywords: ['durant', 'kd', 'suns'] },
  { label: 'Giannis Antetokounmpo', path: '/players', keywords: ['giannis', 'bucks', 'greek freak'] },
  { label: 'Jayson Tatum', path: '/players', keywords: ['tatum', 'celtics'] },
  { label: 'Luka Doncic', path: '/players', keywords: ['luka', 'doncic', 'mavericks'] },
  // 30 NBA Teams
  { label: 'Atlanta Hawks', path: '/teams/ATL', keywords: ['hawks', 'atlanta', 'atl'] },
  { label: 'Boston Celtics', path: '/teams/BOS', keywords: ['celtics', 'boston', 'bos'] },
  { label: 'Brooklyn Nets', path: '/teams/BKN', keywords: ['nets', 'brooklyn', 'bkn'] },
  { label: 'Charlotte Hornets', path: '/teams/CHA', keywords: ['hornets', 'charlotte', 'cha'] },
  { label: 'Chicago Bulls', path: '/teams/CHI', keywords: ['bulls', 'chicago', 'chi'] },
  { label: 'Cleveland Cavaliers', path: '/teams/CLE', keywords: ['cavaliers', 'cavs', 'cleveland', 'cle'] },
  { label: 'Dallas Mavericks', path: '/teams/DAL', keywords: ['mavericks', 'mavs', 'dallas', 'dal'] },
  { label: 'Denver Nuggets', path: '/teams/DEN', keywords: ['nuggets', 'denver', 'den'] },
  { label: 'Detroit Pistons', path: '/teams/DET', keywords: ['pistons', 'detroit', 'det'] },
  { label: 'Golden State Warriors', path: '/teams/GSW', keywords: ['warriors', 'golden state', 'gsw', 'dubs'] },
  { label: 'Houston Rockets', path: '/teams/HOU', keywords: ['rockets', 'houston', 'hou'] },
  { label: 'Indiana Pacers', path: '/teams/IND', keywords: ['pacers', 'indiana', 'ind'] },
  { label: 'LA Clippers', path: '/teams/LAC', keywords: ['clippers', 'lac'] },
  { label: 'Los Angeles Lakers', path: '/teams/LAL', keywords: ['lakers', 'los angeles', 'lal'] },
  { label: 'Memphis Grizzlies', path: '/teams/MEM', keywords: ['grizzlies', 'memphis', 'mem'] },
  { label: 'Miami Heat', path: '/teams/MIA', keywords: ['heat', 'miami', 'mia'] },
  { label: 'Milwaukee Bucks', path: '/teams/MIL', keywords: ['bucks', 'milwaukee', 'mil'] },
  { label: 'Minnesota Timberwolves', path: '/teams/MIN', keywords: ['timberwolves', 'wolves', 'minnesota', 'min'] },
  { label: 'New Orleans Pelicans', path: '/teams/NOP', keywords: ['pelicans', 'new orleans', 'nop'] },
  { label: 'New York Knicks', path: '/teams/NYK', keywords: ['knicks', 'new york', 'nyk'] },
  { label: 'Oklahoma City Thunder', path: '/teams/OKC', keywords: ['thunder', 'oklahoma', 'okc'] },
  { label: 'Orlando Magic', path: '/teams/ORL', keywords: ['magic', 'orlando', 'orl'] },
  { label: 'Philadelphia 76ers', path: '/teams/PHI', keywords: ['76ers', 'sixers', 'philadelphia', 'phi'] },
  { label: 'Phoenix Suns', path: '/teams/PHX', keywords: ['suns', 'phoenix', 'phx'] },
  { label: 'Portland Trail Blazers', path: '/teams/POR', keywords: ['blazers', 'trail blazers', 'portland', 'por'] },
  { label: 'Sacramento Kings', path: '/teams/SAC', keywords: ['kings', 'sacramento', 'sac'] },
  { label: 'San Antonio Spurs', path: '/teams/SAS', keywords: ['spurs', 'san antonio', 'sas'] },
  { label: 'Toronto Raptors', path: '/teams/TOR', keywords: ['raptors', 'toronto', 'tor'] },
  { label: 'Utah Jazz', path: '/teams/UTA', keywords: ['jazz', 'utah', 'uta'] },
  { label: 'Washington Wizards', path: '/teams/WAS', keywords: ['wizards', 'washington', 'was'] },
];

function Navbar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [audioActive, setAudioActive] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [latency, setLatency] = useState(42);

  const navigate = useNavigate();
  const location = useLocation();

  // Fluctuate latency slightly to reflect real websocket stream
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(38 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const results = query.trim().length > 0
    ? searchableItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((kw) => q.includes(kw) || kw.includes(q))
        );
      }).slice(0, 6)
    : [];

  const handleSelect = (item) => {
    setQuery('');
    setIsFocused(false);
    navigate(item.path);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    }
  };

  const toggleSound = () => {
    const newState = courtAudio.toggleAudio();
    setAudioActive(newState);
    if (newState) {
      courtAudio.play('three');
    }
  };

  return (
    <>
      <nav className="navbar" id="main-nav">
        <div className="navbar-inner container">
          {/* Brand */}
          <Link to="/" className="navbar-brand" id="nav-home-link">
            <div className="brand-icon-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l4.24 4.24" />
                <path d="M14.83 9.17l4.24-4.24" />
                <path d="M14.83 14.83l4.24 4.24" />
                <path d="M4.93 19.07l4.24-4.24" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </div>
            <div className="brand-text-container">
              <div className="brand-name-row">
                <span className="brand-title">AIRBALL</span>
                <span className="brand-tag">NBA LIVE</span>
              </div>
              <span className="brand-subtext">Low-Latency Match Center</span>
            </div>
          </Link>

          {/* Primary Nav Links */}
          <div className="nav-links">
            <Link to="/games" className={`nav-link ${location.pathname === '/games' ? 'active' : ''}`}>
              Games
            </Link>
            <Link to="/standings" className={`nav-link ${location.pathname === '/standings' ? 'active' : ''}`}>
              Standings
            </Link>
            <Link to="/players" className={`nav-link ${location.pathname === '/players' ? 'active' : ''}`}>
              Players
            </Link>
            <Link to="/stats" className={`nav-link ${location.pathname === '/stats' ? 'active' : ''}`}>
              Stats
            </Link>
            <Link to="/seasons" className={`nav-link ${location.pathname === '/seasons' ? 'active' : ''}`}>
              Seasons
            </Link>
          </div>

          {/* Search Bar */}
          <div className={`nav-search-wrapper ${isFocused ? 'focused' : ''}`}>
            <div className="nav-search-bar" id="nav-search">
              <svg className="nav-search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                className="nav-search-input"
                placeholder="Search teams, players, stats..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                onKeyDown={handleKeyDown}
                id="nav-search-input"
              />
              {query && (
                <button
                  className="nav-search-clear"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {isFocused && results.length > 0 && (
              <div className="nav-search-dropdown" id="nav-search-dropdown">
                {results.map((item, i) => (
                  <button
                    key={`${item.path}-${i}`}
                    className="search-result-item"
                    onMouseDown={() => handleSelect(item)}
                    id={`search-result-${i}`}
                  >
                    <span className="search-result-label">{item.label}</span>
                    <span className="search-result-path">{item.path.replace('/', '')}</span>
                  </button>
                ))}
              </div>
            )}

            {isFocused && query.trim().length > 0 && results.length === 0 && (
              <div className="nav-search-dropdown" id="nav-search-dropdown-empty">
                <div className="search-no-results">
                  No results for "<strong>{query}</strong>"
                </div>
              </div>
            )}
          </div>

          {/* Right Action Controls: Ping / Audio / Stream Sync */}
          <div className="nav-actions">
            {/* Live Socket Status */}
            <div className="nav-status-pill">
              <span className="nav-ping-wrapper">
                <span className="nav-ping-ring" />
                <span className="nav-ping-dot" />
              </span>
              <span className="nav-status-text">SPORT-RADAR 2.0s</span>
              <span className="nav-latency-text">{latency}ms</span>
            </div>

            {/* Audio Chime Toggle */}
            <button
              onClick={toggleSound}
              className={`nav-icon-btn ${audioActive ? 'active' : ''}`}
              title={audioActive ? 'Mute court audio' : 'Enable court audio'}
              id="audio-toggle-btn"
            >
              {audioActive ? (
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="23" y1="9" x2="17" y2="15" strokeWidth="2" strokeLinecap="round" />
                  <line x1="17" y1="9" x2="23" y2="15" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>

            {/* Stream Sync Modal Trigger */}
            <button
              onClick={() => setShowSettings(true)}
              className="nav-pill-btn"
              title="Stream Sync & Anti-Spoiler Delay"
              id="open-stream-sync-btn"
            >
              <svg width="15" height="15" fill="none" stroke="#FFB800" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="hidden-mobile">
                {delaySeconds > 0 ? `+${delaySeconds}s Delay` : 'Stream Sync'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Stream Sync & Anti-Spoiler Modal */}
      {showSettings && (
        <SettingsModal
          delaySeconds={delaySeconds}
          setDelaySeconds={setDelaySeconds}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

export default Navbar;

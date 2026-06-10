import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

// BUG-015: Added all 30 NBA teams to searchable items
const searchableItems = [
  { label: 'Players', path: '/players', keywords: ['players', 'roster', 'athlete', 'nba players'] },
  { label: 'Games', path: '/games', keywords: ['games', 'scores', 'matchup', 'schedule', 'box score'] },
  { label: 'Stats', path: '/stats', keywords: ['stats', 'statistics', 'analytics', 'leaderboard', 'ppg', 'rpg'] },
  { label: 'Seasons', path: '/seasons', keywords: ['seasons', 'year', 'campaign', 'history'] },
  { label: 'Standings', path: '/standings', keywords: ['standings', 'conference', 'division', 'rank', 'record'] },
  // Players
  { label: 'LeBron James', path: '/players', keywords: ['lebron', 'james', 'lakers', 'king'] },
  { label: 'Stephen Curry', path: '/players', keywords: ['curry', 'steph', 'warriors', 'chef'] },
  { label: 'Kevin Durant', path: '/players', keywords: ['durant', 'kd', 'suns'] },
  { label: 'Giannis Antetokounmpo', path: '/players', keywords: ['giannis', 'bucks', 'greek freak'] },
  // Teams
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
  const navigate = useNavigate();

  const results = query.trim().length > 0
    ? searchableItems.filter((item) => {
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        // BUG-014: Fixed search matching — bidirectional check
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

  return (
    <nav className="navbar" id="main-nav">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand" id="nav-home-link">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" stroke="#e63946" strokeWidth="2.5" fill="none" />
              <path d="M20 2 Q20 20 20 38" stroke="#e63946" strokeWidth="1.5" fill="none" />
              <path d="M2 20 Q20 20 38 20" stroke="#e63946" strokeWidth="1.5" fill="none" />
              <path d="M6 8 Q20 16 34 8" stroke="#e63946" strokeWidth="1.2" fill="none" />
              <path d="M6 32 Q20 24 34 32" stroke="#e63946" strokeWidth="1.2" fill="none" />
            </svg>
          </div>
          <span className="brand-text">
            Air<span className="brand-accent">ball</span>
          </span>
        </Link>

        <div className="nav-links">
          <Link to="/players" className="nav-link">Players</Link>
          <Link to="/games" className="nav-link">Games</Link>
          <Link to="/standings" className="nav-link">Standings</Link>
        </div>

        <div className={`nav-search-wrapper ${isFocused ? 'focused' : ''}`}>
          <div className="nav-search-bar" id="nav-search">
            <svg className="nav-search-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className="nav-search-input"
              placeholder="Search players, teams, stats..."
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
      </div>
    </nav>
  );
}

export default Navbar;

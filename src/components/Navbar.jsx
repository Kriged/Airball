import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { courtAudio } from '../utils/audio';
import { useSport } from '../context/SportContext';
import { SPORTS, SPORT_SLUGS } from '../utils/sportConfig';
import SettingsModal from './SettingsModal';
import './Navbar.css';

// Build searchable items dynamically based on sport
function buildSearchItems(activeSport) {
  const items = [];

  // Add sport-specific nav pages
  const config = SPORTS[activeSport];
  if (config) {
    config.navItems.forEach(nav => {
      items.push({
        label: `${config.name} ${nav.label}`,
        path: `/${activeSport}/${nav.path}`,
        keywords: [nav.label.toLowerCase(), nav.path, config.name.toLowerCase()],
      });
    });
  }

  // NBA teams
  if (activeSport === 'nba') {
    const nbaTeams = [
      { label: 'Atlanta Hawks', abbr: 'ATL', keywords: ['hawks', 'atlanta'] },
      { label: 'Boston Celtics', abbr: 'BOS', keywords: ['celtics', 'boston'] },
      { label: 'Brooklyn Nets', abbr: 'BKN', keywords: ['nets', 'brooklyn'] },
      { label: 'Charlotte Hornets', abbr: 'CHA', keywords: ['hornets', 'charlotte'] },
      { label: 'Chicago Bulls', abbr: 'CHI', keywords: ['bulls', 'chicago'] },
      { label: 'Cleveland Cavaliers', abbr: 'CLE', keywords: ['cavaliers', 'cavs', 'cleveland'] },
      { label: 'Dallas Mavericks', abbr: 'DAL', keywords: ['mavericks', 'mavs', 'dallas'] },
      { label: 'Denver Nuggets', abbr: 'DEN', keywords: ['nuggets', 'denver'] },
      { label: 'Detroit Pistons', abbr: 'DET', keywords: ['pistons', 'detroit'] },
      { label: 'Golden State Warriors', abbr: 'GSW', keywords: ['warriors', 'golden state', 'dubs'] },
      { label: 'Houston Rockets', abbr: 'HOU', keywords: ['rockets', 'houston'] },
      { label: 'Indiana Pacers', abbr: 'IND', keywords: ['pacers', 'indiana'] },
      { label: 'LA Clippers', abbr: 'LAC', keywords: ['clippers'] },
      { label: 'Los Angeles Lakers', abbr: 'LAL', keywords: ['lakers', 'los angeles'] },
      { label: 'Memphis Grizzlies', abbr: 'MEM', keywords: ['grizzlies', 'memphis'] },
      { label: 'Miami Heat', abbr: 'MIA', keywords: ['heat', 'miami'] },
      { label: 'Milwaukee Bucks', abbr: 'MIL', keywords: ['bucks', 'milwaukee'] },
      { label: 'Minnesota Timberwolves', abbr: 'MIN', keywords: ['timberwolves', 'wolves', 'minnesota'] },
      { label: 'New Orleans Pelicans', abbr: 'NOP', keywords: ['pelicans', 'new orleans'] },
      { label: 'New York Knicks', abbr: 'NYK', keywords: ['knicks', 'new york'] },
      { label: 'Oklahoma City Thunder', abbr: 'OKC', keywords: ['thunder', 'oklahoma'] },
      { label: 'Orlando Magic', abbr: 'ORL', keywords: ['magic', 'orlando'] },
      { label: 'Philadelphia 76ers', abbr: 'PHI', keywords: ['76ers', 'sixers', 'philadelphia'] },
      { label: 'Phoenix Suns', abbr: 'PHX', keywords: ['suns', 'phoenix'] },
      { label: 'Portland Trail Blazers', abbr: 'POR', keywords: ['blazers', 'portland'] },
      { label: 'Sacramento Kings', abbr: 'SAC', keywords: ['kings', 'sacramento'] },
      { label: 'San Antonio Spurs', abbr: 'SAS', keywords: ['spurs', 'san antonio'] },
      { label: 'Toronto Raptors', abbr: 'TOR', keywords: ['raptors', 'toronto'] },
      { label: 'Utah Jazz', abbr: 'UTA', keywords: ['jazz', 'utah'] },
      { label: 'Washington Wizards', abbr: 'WAS', keywords: ['wizards', 'washington'] },
    ];
    nbaTeams.forEach(t => items.push({ label: t.label, path: `/nba/teams/${t.abbr}`, keywords: [...t.keywords, t.abbr.toLowerCase()] }));
  }

  // NFL teams
  if (activeSport === 'nfl') {
    const nflTeams = [
      { label: 'Arizona Cardinals', abbr: 'ARI' }, { label: 'Atlanta Falcons', abbr: 'ATL' },
      { label: 'Baltimore Ravens', abbr: 'BAL' }, { label: 'Buffalo Bills', abbr: 'BUF' },
      { label: 'Carolina Panthers', abbr: 'CAR' }, { label: 'Chicago Bears', abbr: 'CHI' },
      { label: 'Cincinnati Bengals', abbr: 'CIN' }, { label: 'Cleveland Browns', abbr: 'CLE' },
      { label: 'Dallas Cowboys', abbr: 'DAL' }, { label: 'Denver Broncos', abbr: 'DEN' },
      { label: 'Detroit Lions', abbr: 'DET' }, { label: 'Green Bay Packers', abbr: 'GB' },
      { label: 'Houston Texans', abbr: 'HOU' }, { label: 'Indianapolis Colts', abbr: 'IND' },
      { label: 'Jacksonville Jaguars', abbr: 'JAX' }, { label: 'Kansas City Chiefs', abbr: 'KC' },
      { label: 'Las Vegas Raiders', abbr: 'LV' }, { label: 'Los Angeles Chargers', abbr: 'LAC' },
      { label: 'Los Angeles Rams', abbr: 'LAR' }, { label: 'Miami Dolphins', abbr: 'MIA' },
      { label: 'Minnesota Vikings', abbr: 'MIN' }, { label: 'New England Patriots', abbr: 'NE' },
      { label: 'New Orleans Saints', abbr: 'NO' }, { label: 'New York Giants', abbr: 'NYG' },
      { label: 'New York Jets', abbr: 'NYJ' }, { label: 'Philadelphia Eagles', abbr: 'PHI' },
      { label: 'Pittsburgh Steelers', abbr: 'PIT' }, { label: 'San Francisco 49ers', abbr: 'SF' },
      { label: 'Seattle Seahawks', abbr: 'SEA' }, { label: 'Tampa Bay Buccaneers', abbr: 'TB' },
      { label: 'Tennessee Titans', abbr: 'TEN' }, { label: 'Washington Commanders', abbr: 'WSH' },
    ];
    nflTeams.forEach(t => items.push({ label: t.label, path: `/nfl/teams/${t.abbr}`, keywords: [t.label.toLowerCase().split(' ').pop(), t.abbr.toLowerCase()] }));
  }

  return items;
}

function Navbar() {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [audioActive, setAudioActive] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [latency, setLatency] = useState(42);

  const navigate = useNavigate();
  const location = useLocation();
  const { sport: activeSport, config: sportConfig } = useSport();

  const searchableItems = useMemo(() => buildSearchItems(activeSport), [activeSport]);

  // Fluctuate latency
  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(38 + Math.random() * 12));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const results = query.trim().length > 0
    ? searchableItems.filter((item) => {
        const q = query.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.keywords.some(kw => q.includes(kw) || kw.includes(q));
      }).slice(0, 6)
    : [];

  const handleSelect = (item) => { setQuery(''); setIsFocused(false); navigate(item.path); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]); };

  const toggleSound = () => {
    const newState = courtAudio.toggleAudio();
    setAudioActive(newState);
    if (newState) courtAudio.play('three');
  };

  // Determine active path for nav link highlighting
  const isActiveNavPath = (path) => {
    const fullPath = `/${activeSport}/${path}`;
    return location.pathname === fullPath || location.pathname.startsWith(fullPath + '/');
  };

  return (
    <>
      <nav className="navbar" id="main-nav">
        <div className="navbar-inner container">
          {/* Brand */}
          <Link to="/" className="navbar-brand" id="nav-home-link">
            <div className="brand-icon-box" style={{ background: `linear-gradient(135deg, ${sportConfig.accentColor} 0%, ${sportConfig.secondaryColor || sportConfig.accentColor} 100%)` }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.93 4.93l4.24 4.24" /><path d="M14.83 9.17l4.24-4.24" />
                <path d="M14.83 14.83l4.24 4.24" /><path d="M4.93 19.07l4.24-4.24" />
                <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
              </svg>
            </div>
            <div className="brand-text-container">
              <div className="brand-name-row">
                <span className="brand-title">AIRBALL</span>
                <span className="brand-tag" style={{ background: sportConfig.accentColor }}>{sportConfig.name} LIVE</span>
              </div>
              <span className="brand-subtext">Low-Latency Match Center</span>
            </div>
          </Link>

          {/* Sport Selector */}
          <div className="sport-selector" id="sport-selector">
            {SPORT_SLUGS.map(slug => {
              const cfg = SPORTS[slug];
              return (
                <Link
                  key={slug}
                  to={`/${slug}`}
                  className={`sport-pill ${activeSport === slug ? 'active' : ''}`}
                  style={{ '--pill-color': cfg.accentColor }}
                  id={`sport-${slug}`}
                >
                  <span className="sport-pill-icon">{cfg.icon}</span>
                  <span className="sport-pill-label">{cfg.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Primary Nav Links — Dynamic per sport */}
          <div className="nav-links">
            {sportConfig.navItems.map(nav => (
              <Link
                key={nav.path}
                to={`/${activeSport}/${nav.path}`}
                className={`nav-link ${isActiveNavPath(nav.path) ? 'active' : ''}`}
              >
                {nav.label}
              </Link>
            ))}
          </div>

          {/* Search Bar */}
          <div className={`nav-search-wrapper ${isFocused ? 'focused' : ''}`}>
            <div className="nav-search-bar" id="nav-search">
              <svg className="nav-search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                type="text" className="nav-search-input"
                placeholder={`Search ${sportConfig.hasTeams ? 'teams, ' : ''}${sportConfig.athleteLabel?.toLowerCase() || 'athletes'}...`}
                value={query} onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                onKeyDown={handleKeyDown}
                id="nav-search-input"
              />
              {query && (
                <button className="nav-search-clear" onClick={() => setQuery('')} aria-label="Clear search">✕</button>
              )}
            </div>
            {isFocused && results.length > 0 && (
              <div className="nav-search-dropdown" id="nav-search-dropdown">
                {results.map((item, i) => (
                  <button key={`${item.path}-${i}`} className="search-result-item" onMouseDown={() => handleSelect(item)} id={`search-result-${i}`}>
                    <span className="search-result-label">{item.label}</span>
                    <span className="search-result-path">{item.path.split('/').filter(Boolean).join(' › ')}</span>
                  </button>
                ))}
              </div>
            )}
            {isFocused && query.trim().length > 0 && results.length === 0 && (
              <div className="nav-search-dropdown" id="nav-search-dropdown-empty">
                <div className="search-no-results">No results for "<strong>{query}</strong>"</div>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="nav-actions">
            {/* Live Socket Status */}
            <div className="nav-status-pill">
              <span className="nav-ping-wrapper"><span className="nav-ping-ring" /><span className="nav-ping-dot" /></span>
              <span className="nav-status-text">SPORT-RADAR 2.0s</span>
              <span className="nav-latency-text">{latency}ms</span>
            </div>

            {/* Audio Chime Toggle — Only show for sports with audio */}
            {sportConfig.hasAudio && (
              <button onClick={toggleSound} className={`nav-icon-btn ${audioActive ? 'active' : ''}`}
                title={audioActive ? 'Mute court audio' : 'Enable court audio'} id="audio-toggle-btn">
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
            )}

            {/* Stream Sync */}
            <button onClick={() => setShowSettings(true)} className="nav-pill-btn"
              title="Stream Sync & Anti-Spoiler Delay" id="open-stream-sync-btn">
              <svg width="15" height="15" fill="none" stroke="#FFB800" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span className="hidden-mobile">{delaySeconds > 0 ? `+${delaySeconds}s Delay` : 'Stream Sync'}</span>
            </button>
          </div>
        </div>
      </nav>

      {showSettings && (
        <SettingsModal delaySeconds={delaySeconds} setDelaySeconds={setDelaySeconds} onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

export default Navbar;

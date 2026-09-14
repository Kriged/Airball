import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../components/PageLayout';
import { getCached, setCached, getSportCacheKey } from '../../utils/cache';

const SPORT = 'nfl';
const CACHE_KEY = getSportCacheKey(SPORT, 'games_list');
const statusFilters = ['All', 'FINAL', 'LIVE', 'UPCOMING'];
const statusLabels = { 'All': 'All Games', 'FINAL': 'Final', 'LIVE': 'Live', 'UPCOMING': 'Upcoming' };

function NFLGames() {
  const [games, setGames] = useState(() => {
    const cached = getCached(CACHE_KEY, 60000);
    return cached ? cached.data : [];
  });
  const [loading, setLoading] = useState(() => !getCached(CACHE_KEY, 60000));
  const [activeStatus, setActiveStatus] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const cached = getCached(CACHE_KEY, 60000);
    if (cached && !cached.isStale) return;
    let isMounted = true;
    fetch('/api/nfl/games')
      .then(res => { if (!res.ok) throw new Error(`HTTP error ${res.status}`); return res.json(); })
      .then(data => {
        if (!isMounted) return;
        setGames(data || []);
        setCached(CACHE_KEY, data || []);
        setLoading(false);
      })
      .catch(err => { if (isMounted) { console.error('Failed to fetch NFL games:', err); setLoading(false); } });
    return () => { isMounted = false; };
  }, []);

  const filtered = games.filter(g => {
    const matchStatus = activeStatus === 'All' || g.status === activeStatus;
    const matchSearch = g.home.toLowerCase().includes(search.toLowerCase()) ||
                        g.away.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <PageLayout title="NFL Games" subtitle="Scores, schedules, and game results" icon="🏈" accentColor="#013369" bannerImage="/images/games.png">
      <div className="search-bar" id="nfl-games-search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2"/>
          <path d="M14 14L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input type="text" placeholder="Search by team name..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="filter-tabs" id="nfl-game-status-filters">
        {statusFilters.map(s => (
          <button key={s} className={`filter-tab ${activeStatus === s ? 'active' : ''}`}
            onClick={() => setActiveStatus(s)} id={`nfl-filter-game-${s.toLowerCase()}`}>
            {statusLabels[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon spinner" style={{ animation: 'spin 2s linear infinite' }}>🏈</div>
          <p className="empty-state-text">Loading NFL schedules and results...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="data-cards" id="nfl-games-list">
          {filtered.map(game => (
            <Link to={`/nfl/games/${game.id}`} className="data-card game-card game-card-link" key={game.id} id={`nfl-game-${game.id}`}>
              <div className="game-date">{game.date}</div>
              <div className="game-matchup">
                <div className="game-team">
                  <span className="game-team-name">{game.away}</span>
                  {(game.status === 'FINAL' || game.status === 'LIVE') && (
                    <span className={`game-score ${game.awayScore > game.homeScore ? 'winner' : ''}`}>{game.awayScore}</span>
                  )}
                </div>
                <span className="game-vs">@</span>
                <div className="game-team">
                  <span className="game-team-name">{game.home}</span>
                  {(game.status === 'FINAL' || game.status === 'LIVE') && (
                    <span className={`game-score ${game.homeScore > game.awayScore ? 'winner' : ''}`}>{game.homeScore}</span>
                  )}
                </div>
              </div>
              <div className="game-meta">
                <span className={`game-status ${game.status.toLowerCase()}`}>{game.status}</span>
                <span className="game-arena">{game.arena}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">No NFL games found matching your search</p>
        </div>
      )}
    </PageLayout>
  );
}

export default NFLGames;
